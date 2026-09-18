import React, { useState, useEffect } from 'react';
import { eventCategoryMap, venueOptions, pricingTiers } from '../data/mockData';
import { useApp } from '../store/AppContext';
import { hasVenueConflict } from '../engine/conflict';

const RichProposalForm = ({ inquiry, onSubmit, onCancel }) => {
  const { state } = useApp();
  const { inquiries } = state;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    venueId: '',
    pricingTier: 'basic',
    customPrice: '',
    terms: '',
    suggestedVendors: {}, // category -> vendorId
  });
  const [isBooked, setIsBooked] = useState(false);

  const categories = inquiry ? eventCategoryMap[inquiry.eventType] || [] : [];

  // Mock vendor list by category
  const vendorsByCategory = {
    av: ['AV Solutions', 'Sound & Light Co.'],
    catering: ['Catering Plus', 'Gourmet Catering'],
    security: ['SecureGuard', 'Elite Security'],
    cleaning: ['CleanCo', 'Sparkle Clean'],
    photography: ['PhotoPro', 'Capture Moments'],
    music: ['Melody Events', 'DJ Vibes'],
  };

  const selectedVenue = venueOptions.find(v => v.id === parseInt(formData.venueId));
  const basePrice = selectedVenue?.basePrice || 0;
  const tierMultiplier = pricingTiers[formData.pricingTier]?.multiplier || 1;
  const calculatedPrice = formData.customPrice ? parseInt(formData.customPrice) : Math.round(basePrice * tierMultiplier);

  // Venue conflict check when venue or date changes:
  // 1) static bookedDates list, 2) any live planned event already using this venue on that date
  useEffect(() => {
    if (!selectedVenue || !inquiry?.eventDate) {
      setIsBooked(false);
      return;
    }
    const staticConflict = (selectedVenue.bookedDates || []).includes(inquiry.eventDate);
    const liveConflict = hasVenueConflict(selectedVenue.id, inquiry.eventDate, inquiries);
    setIsBooked(staticConflict || liveConflict);
  }, [formData.venueId, inquiry?.eventDate, inquiries, selectedVenue]);

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);
  const handleSubmit = () => {
    const proposal = {
      venue: selectedVenue?.name || '',
      venueId: selectedVenue?.id || null,
      venueDetails: selectedVenue || null,
      price: calculatedPrice,
      terms: formData.terms,
      sentDate: new Date().toISOString(),
      vendorShortlist: formData.suggestedVendors,
      pricingTier: formData.pricingTier,
    };
    onSubmit(proposal);
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Step 1: Venue & Pricing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Venue</label>
              <select
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
                required
              >
                <option value="">Choose a venue</option>
                {venueOptions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} (Capacity: {v.capacity}, Base: ETB {v.basePrice.toLocaleString()})
                  </option>
                ))}
              </select>
              {isBooked && selectedVenue && (
                <p className="flex items-start gap-1 text-rose text-sm mt-1">
                  <span>⚠️</span>
                  <span>
                    This venue is already booked on {inquiry.eventDate}. Please select another venue or suggest a different date.
                  </span>
                </p>
              )}
            </div>

            {selectedVenue && (
              <div className="p-3 bg-ice/10 rounded-lg">
                <p className="text-sm"><strong>Features:</strong> {selectedVenue.features.join(', ')}</p>
                <p className="text-sm"><strong>Capacity:</strong> {selectedVenue.capacity} guests</p>
                <p className="text-sm">
                  <strong>Booked Dates:</strong> {(selectedVenue.bookedDates || []).join(', ') || 'None'}
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
                    <div className="text-xs text-slate-500">{tier.multiplier}x base price</div>
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
            <button onClick={handleNext} className="btn-primary" disabled={isBooked}>
              {isBooked ? 'Resolve Venue Conflict First' : 'Next: Suggest Vendors →'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Step 2: Vendor Shortlist</h3>
          <p className="text-sm text-slate-500 mb-4">Suggest preferred vendors for each category (client will see these recommendations).</p>
          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat}>
                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{cat.replace('_', ' ')}</label>
                <select
                  value={formData.suggestedVendors[cat] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    suggestedVendors: { ...formData.suggestedVendors, [cat]: e.target.value }
                  })}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
                >
                  <option value="">No preference</option>
                  {(vendorsByCategory[cat] || []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={handlePrev} className="btn-outline">← Back</button>
            <button onClick={handleSubmit} className="btn-primary">Send Proposal</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichProposalForm;