import React, { useState, useEffect } from 'react';
import { eventCategoryMap, pricingTiers } from '../utils/constants';
import { useApp } from '../context/AppContext';

/**
 * Coordinator proposal composer.
 *
 * Venues come from the live API (GET /venues/available?date=), which already
 * excludes venues booked on that date — so there is no separate client-side
 * conflict check any more.
 *
 * The submitted payload matches SendProposalRequest exactly:
 *   venue            String  (required)
 *   venueId          Long
 *   venueDetails     String  (JSON-serialised, NOT an object)
 *   price            Integer (required, >= 0)
 *   terms            String  (required)
 *   vendorShortlist  Map<String, List<Long>>  (values MUST be arrays of vendor IDs)
 *   pricingTier      String
 */
const RichProposalForm = ({ inquiry, onSuccess, onSubmit, onCancel, editMode = false }) => {
  const { sendProposal, updateProposal, fetchAvailableVenues, fetchVendors } = useApp();

  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    venueId: '',
    pricingTier: 'basic',
    customPrice: '',
    terms: '',
    vendorShortlist: {}, // category -> array of vendor IDs
  });

  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (!inquiry) return [];
    return inquiry.requestedCategories?.length ? inquiry.requestedCategories : (eventCategoryMap[inquiry.eventType] || []);
  });

  // Pre-populate form when editing an existing proposal
  useEffect(() => {
    if (editMode && inquiry?.proposal) {
      try {
        const proposal = typeof inquiry.proposal === 'string'
          ? JSON.parse(inquiry.proposal)
          : inquiry.proposal;

        setFormData({
          venueId: proposal.venueId?.toString() || '',
          pricingTier: proposal.pricingTier || 'basic',
          customPrice: '',
          terms: proposal.terms || '',
          vendorShortlist: {},
        });

        // Parse vendor shortlist back to ID arrays
        if (Array.isArray(proposal.vendorShortlist)) {
          const shortlistMap = {};
          proposal.vendorShortlist.forEach(cat => {
            shortlistMap[cat.category] = cat.vendors.map(v => v.id);
          });
          setFormData(prev => ({ ...prev, vendorShortlist: shortlistMap }));
        }

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
    if (!inquiry) return;
    setSelectedCategories(
      inquiry.requestedCategories?.length
        ? inquiry.requestedCategories
        : (eventCategoryMap[inquiry.eventType] || [])
    );
  }, [inquiry]);

  // Load venues available on the event date, plus the vendor list for shortlisting.
  useEffect(() => {
    if (!inquiry?.eventDate) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      fetchAvailableVenues(inquiry.eventDate).catch(() => []),
      fetchVendors().catch(() => []),
    ])
      .then(([venueList, vendorList]) => {
        if (cancelled) return;
        setVenues(venueList || []);
        setVendors(vendorList || []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [inquiry?.eventDate, fetchAvailableVenues, fetchVendors]);

  const selectedVenue = venues.find(v => v.id === parseInt(formData.venueId));

  // The configured venue rate is treated as a daily base rate for proposals.
  const basePrice = Number(selectedVenue?.hourlyRate) || 0;
  const tierMultiplier = pricingTiers[formData.pricingTier]?.multiplier || 1;
  const start = new Date(inquiry?.eventDate);
  const end = new Date(inquiry?.endDate || inquiry?.eventDate);
  const days = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
    ? 1
    : Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const calculatedPrice = formData.customPrice
    ? parseInt(formData.customPrice, 10)
    : Math.round(basePrice * tierMultiplier * days);

  const vendorsForCategory = (category) =>
    vendors.filter(v => v.serviceCategory === category && v.isActive !== false);

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
    if (!inquiry) return;
    setSubmitting(true);
    setError('');
    try {
      // Only include categories the coordinator actually chose, and always as arrays of numbers.
      const shortlist = Object.fromEntries(
        Object.entries(formData.vendorShortlist)
          .filter(([, ids]) => ids && ids.length > 0)
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
        price: Number.isFinite(calculatedPrice) ? calculatedPrice : 0,
        terms: formData.terms,
        vendorShortlist: shortlist,
        pricingTier: formData.pricingTier,
        categories: selectedCategories,
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
                    {v.capacity ? ` (Capacity: ${v.capacity}` : ' ('}
                    {v.hourlyRate ? `, Base Daily Rate: ETB ${Number(v.hourlyRate).toLocaleString()}/day)` : ')'}
                  </option>
                ))}
              </select>
              {!loading && venues.length === 0 && (
                <p className="text-sm text-amber-700 mt-1">
                  No venues are available on {inquiry?.eventDate}. Every venue is either booked
                  or none are registered.
                </p>
              )}
            </div>

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
                <p className="text-sm">
                  <strong>Base Daily Rate:</strong>{' '}
                  {selectedVenue.hourlyRate
                    ? `ETB ${Number(selectedVenue.hourlyRate).toLocaleString()}/day`
                    : 'Not set'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pricing Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(pricingTiers).map(([key, tier]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, pricingTier: key })}
                    className={`p-3 rounded-lg border-2 text-left ${
                      formData.pricingTier === key
                        ? 'border-navy bg-navy/10 text-navy'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium">{tier.name}</div>
                    <div className="text-xs text-slate-500">{tier.multiplier}x venue rate</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Custom Price (ETB)</label>
              <input
                type="number"
                placeholder={`Calculated: ETB ${calculatedPrice.toLocaleString()}`}
                value={formData.customPrice}
                onChange={(e) => setFormData({ ...formData, customPrice: e.target.value })}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty to use calculated price</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Terms and Conditions</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                placeholder="Payment terms, cancellation policy, etc."
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
              disabled={!selectedVenue || !formData.terms.trim()}
            >
              Next: Suggest Vendors →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Step 2: Vendor Shortlist</h3>
          <p className="text-sm text-slate-500 mb-4">
            Suggest preferred vendors for each category (client will see these recommendations).
          </p>
          {inquiry?.requestedCategories?.length > 0 && (
            <p className="text-xs text-slate-500 mb-3">
              Client requested: {inquiry.requestedCategories.join(', ')}
            </p>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Included service categories</label>
            <div className="grid grid-cols-2 gap-2">
              {(eventCategoryMap[inquiry?.eventType] || []).map((cat) => (
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
                No service categories are mapped for event type “{inquiry?.eventType}”.
              </p>
            )}
            {categories.map(cat => {
              const vendorsForCat = vendorsForCategory(cat);
              const chosenIds = formData.vendorShortlist[cat] || [];

              return (
                <div key={cat} className="bg-slate-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-slate-700 mb-3 capitalize">
                    {cat.replace('_', ' ')}
                  </label>
                  {vendorsForCat.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No registered vendors for this category.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {vendorsForCat.map(v => (
                        <label
                          key={v.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            chosenIds.includes(v.id)
                              ? 'bg-brand-50 border-brand-500'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={chosenIds.includes(v.id)}
                              onChange={() => toggleVendorForCategory(cat, v.id)}
                              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900">{v.companyName}</p>
                              <p className="text-xs text-slate-500">
                                {v.rating ? `★ ${v.rating}` : '★ N/A'}
                                {v.phone ? ` · ${v.phone}` : ''}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
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
