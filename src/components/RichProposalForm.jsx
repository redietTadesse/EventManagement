import React, { useState, useEffect } from 'react';
import { eventCategoryMap, pricingTiers } from '../data/mockData';
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
 *   vendorShortlist  Map<String, List<String>>  (values MUST be arrays)
 *   pricingTier      String
 */
const RichProposalForm = ({ inquiry, onSuccess, onSubmit, onCancel }) => {
  const { sendProposal, fetchAvailableVenues, fetchVendors } = useApp();

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
    suggestedVendors: {}, // category -> vendorId
  });

  const [selectedCategories, setSelectedCategories] = useState(() => {
    if (!inquiry) return [];
    return inquiry.requestedCategories?.length ? inquiry.requestedCategories : (eventCategoryMap[inquiry.eventType] || []);
  });

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

  // VenueResponse exposes hourlyRate (BigDecimal), not basePrice.
  const basePrice = Number(selectedVenue?.hourlyRate) || 0;
  const tierMultiplier = pricingTiers[formData.pricingTier]?.multiplier || 1;
  const calculatedPrice = formData.customPrice
    ? parseInt(formData.customPrice, 10)
    : Math.round(basePrice * tierMultiplier);

  const vendorsForCategory = (category) =>
    vendors.filter(v => v.serviceCategory === category && v.isActive !== false);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!inquiry) return;
    setSubmitting(true);
    setError('');
    try {
      // Only include categories the coordinator actually chose, and always as arrays.
      const shortlist = Object.fromEntries(
        Object.entries(formData.suggestedVendors)
          .filter(([, vendorId]) => vendorId)
          .map(([category, vendorId]) => [category, [String(vendorId)]])
      );

      const saved = await sendProposal(inquiry.id, {
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
      });

      if (onSuccess) onSuccess(saved);
      else if (onSubmit) onSubmit(saved);
    } catch (err) {
      const raw = err.response?.data;
      const msg = (raw && typeof raw === 'object') ? (raw.message || raw.error) : raw;
      setError(typeof msg === 'string' ? msg : 'Failed to send proposal');
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
                    {v.hourlyRate ? `, Rate: ETB ${Number(v.hourlyRate).toLocaleString()})` : ')'}
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
                  <strong>Rate:</strong>{' '}
                  {selectedVenue.hourlyRate
                    ? `ETB ${Number(selectedVenue.hourlyRate).toLocaleString()}`
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
            {categories.map(cat => (
              <div key={cat}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                  {cat.replace('_', ' ')}
                </label>
                <select
                  value={formData.suggestedVendors[cat] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    suggestedVendors: { ...formData.suggestedVendors, [cat]: e.target.value }
                  })}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
                >
                  <option value="">No preference</option>
                  {vendorsForCategory(cat).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.companyName}
                      {v.rating ? ` — rating ${v.rating}` : ''}
                    </option>
                  ))}
                </select>
                {vendorsForCategory(cat).length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    No registered vendors for this category.
                  </p>
                )}
              </div>
            ))}
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
