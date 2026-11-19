import AlternativeBookingPlans from './AlternativeBookingPlans';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import VendorSuggestions from './VendorSuggestions';
import api from '../api/axios';
import { proposalDraft } from '../utils/proposals';
import InquiryDateCalendar from '../client/InquiryDateCalendar';
import TentativeVenueRequests from './TentativeVenueRequests';

/**
 * Coordinator proposal composer.
 *
 * Venues come from the live API (GET /venues/available?date=&attendees=&endDate=),
 * which checks event dates, buffers, capacity, bookings, and administrator blocks.
 *
 * The submitted payload matches SendProposalRequest exactly:
 *   venue            String  (required)
 *   venueId          Long
 *   venueDetails     String  (JSON-serialised, NOT an object)
 *   price            Integer (required, > 0)
 *   terms            String  (required)
 *   vendorShortlist  Map<String, List<Long>>  (values MUST be arrays of vendor IDs)
 *   pricingTier      String
 */
const RichProposalForm = ({ inquiry, onSuccess, onSubmit, onCancel, editMode = false }) => {
  const { sendProposal, updateProposal, fetchAvailableVenues } = useApp();

  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    venueId: '',
    pricingTier: 'basic',
    customPrice: '',
    terms: '',
    vendorShortlist: {}, // category -> array of vendor IDs
    eventName: inquiry?.eventName || '', eventDate: inquiry?.eventDate || '',
    endDate: inquiry?.endDate || '', expectedAttendees: inquiry?.expectedAttendees || 1,
    tableSetup: inquiry?.tableSetup || 'THEATRE',
  });

  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (!inquiry) return [];
    return inquiry.requestedCategories || [];
  });

  // Pre-populate form when editing an existing proposal
  useEffect(() => {
    if (editMode && inquiry?.proposal) {
      try {
        const proposal = typeof inquiry.proposal === 'string'
          ? JSON.parse(inquiry.proposal)
          : inquiry.proposal;

        setFormData(previous=>({...previous,...proposalDraft(proposal)}));

        if (proposal.categories?.length) {
          setSelectedCategories(proposal.categories);
        }
      } catch (e) {
        console.error('Failed to parse proposal for editing:', e);
      }
    }
  }, [editMode, inquiry]);

  const categories = inquiry ? selectedCategories : [];

  useEffect(() => {
    if (!inquiry?.eventType) return;
    let cancelled = false;
    api.get('/vendors/service-categories')
      .then((response) => {
        if (cancelled) return;
        const canonicalCategories = response.data || [];
        setAvailableCategories(canonicalCategories);

        let initialCategories = inquiry.requestedCategories?.length
          ? inquiry.requestedCategories
          : canonicalCategories;
        if (editMode && inquiry.proposal) {
          try {
            const proposal = typeof inquiry.proposal === 'string'
              ? JSON.parse(inquiry.proposal)
              : inquiry.proposal;
            if (proposal.categories?.length) initialCategories = proposal.categories;
          } catch {
            // The proposal form's existing validation reports malformed proposal data.
          }
        }
        setSelectedCategories(initialCategories.filter(category => canonicalCategories.includes(category)));
      })
      .catch(() => { if (!cancelled) setError('Could not load event service categories.'); });
    return () => { cancelled = true; };
  }, [inquiry?.id, inquiry?.eventType, inquiry?.requestedCategories, inquiry?.proposal, editMode]);

  // Load venues available on the event date. Vendor suggestions are loaded per category.
  useEffect(() => {
    if (!inquiry?.eventDate) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/venues/available',{params:{date:formData.eventDate,endDate:formData.endDate||formData.eventDate,
      attendees:formData.expectedAttendees,eventType:inquiry.eventType,tableSetup:formData.tableSetup,inquiryId:editMode?inquiry.id:undefined}}).then(({data})=>data)
      .then((venueList) => {
        if (cancelled) return;
        setVenues(venueList || []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load venues for this event date.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [formData.eventDate, formData.endDate, formData.expectedAttendees, formData.tableSetup, inquiry?.eventType]);

  const selectedVenue = venues.find(v => v.id === parseInt(formData.venueId));

  const quotedPrice = Number(formData.customPrice);
  const validPrice = Number.isInteger(quotedPrice) && quotedPrice > 0 && quotedPrice <= 2147483647;

  const toggleVendorForCategory = (category, vendorId) => {
    setFormData((prev) => {
      const current = prev.vendorShortlist[category] || [];
      const updated = current.includes(vendorId)
        ? current.filter(id => id !== vendorId)
        : [...current, vendorId];
      return {
        ...prev,
        vendorShortlist: { ...prev.vendorShortlist, [category]: updated },
      };
    });
  };

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!inquiry || !validPrice) return;
    setSubmitting(true);
    setError('');
    try {
      // Only include categories the coordinator actually chose, and always as arrays of numbers.
      const shortlist = Object.fromEntries(
        Object.entries(formData.vendorShortlist)
          .filter(([category, ids]) => selectedCategories.includes(category) && ids && ids.length > 0)
          .map(([category, ids]) => [category, ids.map(id => Number(id))])
      );

      const proposalData = {
        venue: selectedVenue?.name || '',
        venueId: selectedVenue?.id ?? null,
        // Serialised here as well as in the context, so the object never leaks through.
        venueDetails: selectedVenue
          ? JSON.stringify({
              id: selectedVenue.id,
              name: selectedVenue.name,
              capacity: selectedVenue.capacity,
              location: selectedVenue.location,
            })
          : null,
        price: quotedPrice,
        terms: formData.terms,
        vendorShortlist: shortlist,
        pricingTier: formData.pricingTier,
        categories: selectedCategories,
        eventName: formData.eventName, eventDate: formData.eventDate, endDate: formData.endDate||formData.eventDate,
        expectedAttendees: Number(formData.expectedAttendees), tableSetup: formData.tableSetup,
        expectedVersion: inquiry.proposalVersion,
      };

      const saved = editMode
        ? await updateProposal(inquiry.id, proposalData)
        : await sendProposal(inquiry.id, proposalData);

      if (onSuccess) onSuccess(saved);
      else if (onSubmit) onSubmit(saved);
    } catch (err) {
      const raw = err.response?.data;
      const msg = (raw && typeof raw === 'object') ? (raw.message || raw.error) : raw;
      setError(typeof msg === 'string' ? msg : editMode ? 'Failed to update proposal' : 'Failed to send proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-rose/10 border border-rose/30 text-rose-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {step === 1 && (
        <div>
          <TentativeVenueRequests start={formData.eventDate} end={formData.endDate||formData.eventDate}/>
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Event name<input maxLength={200} className="mt-1 w-full rounded-lg border p-2" value={formData.eventName} onChange={e=>setFormData({...formData,eventName:e.target.value})}/></label>
            <label className="text-sm">Attendance<input type="number" min={1} className="mt-1 w-full rounded-lg border p-2" value={formData.expectedAttendees} onChange={e=>setFormData({...formData,expectedAttendees:e.target.value})}/></label>
            <label className="text-sm">Start date<input type="date" className="mt-1 w-full rounded-lg border p-2" value={formData.eventDate} onChange={e=>setFormData({...formData,eventDate:e.target.value})}/></label>
            <label className="text-sm">End date<input type="date" className="mt-1 w-full rounded-lg border p-2" value={formData.endDate} onChange={e=>setFormData({...formData,endDate:e.target.value})}/></label>
            <label className="text-sm">Seating setup<select className="mt-1 w-full rounded-lg border p-2" value={formData.tableSetup} onChange={e=>setFormData({...formData,tableSetup:e.target.value,venueId:''})}>{['THEATRE','CLASSROOM','BANQUET','CABARET','BOARDROOM','U_SHAPE','UNDECIDED'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
          </div>
          <details className="mb-5 rounded-xl border border-emerald-200 p-4"><summary className="mb-3 cursor-pointer text-sm font-semibold text-emerald-900">Find another venue or nearby dates</summary><AlternativeBookingPlans inquiryId={editMode ? inquiry.id : undefined}
            plan={{ date: formData.eventDate, endDate: formData.endDate, attendees: formData.expectedAttendees, eventType: inquiry.eventType, tableSetup: formData.tableSetup }}
            onChoose={option => setFormData(previous => ({ ...previous, eventDate: option.eventDate, endDate: option.endDate, venueId: String(option.venueId) }))} /></details>
          {editMode&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm">Sending a revised proposal saves the previous version. Any existing acceptance, signatures and payment hold will be replaced. The client must accept and sign the new terms.</p>}
          <h3 className="font-semibold text-lg mb-4">Step 1: Venue &amp; Pricing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Venue
                {inquiry?.eventDate && (
                  <span className="text-xs text-slate-500 font-normal">
                    {' '}(available on {inquiry.eventDate})
                  </span>
                )}
              </label>
              <select
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
                disabled={loading}
                required
              >
                <option value="">
                  {loading ? 'Loading venues…' : 'Choose a venue'}
                </option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                    {v.capacity ? ` (Capacity: ${v.capacity})` : ''}
                  </option>
                ))}
              </select>
              {!loading && !error && venues.length === 0 && (
                <p className="text-sm text-amber-700 mt-1">
                  No suitable venue is available for the requested dates and attendance.
                </p>
              )}
            </div>

            {inquiry?.eventDate && (
              <InquiryDateCalendar key={inquiry.id} readOnly eventType={inquiry.eventType} start={inquiry.eventDate}
                end={inquiry.endDate || ''} attendees={inquiry.expectedAttendees} />
            )}

            {selectedVenue && (
              <div className="p-3 bg-ice/10 rounded-lg">
                <p className="text-sm">
                  <strong>Capacity:</strong> {selectedVenue.capacity ?? 'n/a'} guests
                </p>
                {selectedVenue.location && (
                  <p className="text-sm"><strong>Location:</strong> {selectedVenue.location}</p>
                )}
                {selectedVenue.description && (
                  <p className="text-sm"><strong>Notes:</strong> {selectedVenue.description}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quoted total (ETB)</label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={formData.customPrice}
                onChange={(e) => setFormData({ ...formData, customPrice: e.target.value })}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
              />
              <p className="text-xs text-slate-500 mt-1">Enter the total you are quoting for the full booking window and agreed services.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Terms and Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                placeholder="Include payment instructions, due dates, and cancellation terms."
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
                required
              />
            </div>
          </div>
          <div className="flex justify-between mt-4">
            {onCancel && (
              <button onClick={onCancel} className="btn-outline">Cancel</button>
            )}
            <button
              onClick={handleNext}
              className="btn-primary"
              disabled={!selectedVenue || !validPrice || !formData.terms.trim()}
            >
              Next: Suggest Vendors →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Step 2: Preferred vendors</h3>
          <p className="text-sm text-slate-500 mb-4">
            Choose vendors to try first for each service. The client will see these choices. After acceptance and payment review, the system checks them before sending offers. Saved client preferences come first. If these vendors cannot take the work, the system tries other suitable vendors.
          </p>
          {inquiry?.requestedCategories?.length > 0 && (
            <p className="text-xs text-slate-500 mb-3">
              Client requested: {inquiry.requestedCategories.join(', ')}
            </p>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Included service categories</label>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => {
                      setSelectedCategories((prev) =>
                        prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]
                      );
                    }}
                  />
                  <span className="capitalize">{cat}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {categories.length === 0 && (
              <p className="text-sm text-amber-700">
                An empty selection keeps the inquiry’s existing service categories.
              </p>
            )}
            {categories.map(cat => {
              const chosenIds = formData.vendorShortlist[cat] || [];

              return (
                <div key={cat} className="bg-slate-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-3 capitalize">
                    {cat.replace('_', ' ')}
                  </label>
                  {cat === 'venue' ? (
                    <p className="text-sm text-slate-600">The AICC venue is selected in the venue step above.</p>
                  ) : cat === 'catering' && inquiry?.eventType?.trim().toLowerCase() !== 'wedding' ? (
                    <p className="text-sm text-slate-600">AICC provides catering in-house for this event. External catering vendors are available for weddings.</p>
                  ) : <VendorSuggestions
                    category={cat}
                    eventDate={inquiry?.eventDate}
                    selectedVendorIds={chosenIds}
                    onSelectVendor={(vendor) => toggleVendorForCategory(cat, Number(vendor.id))}
                  />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={handlePrev} className="btn-outline">← Back</button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send Proposal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichProposalForm;
