import { useState } from 'react';
import api from '../api/axios';
import useApiResource from '../hooks/useApiResource';
import { proposalLabel, proposalVendors } from '../utils/proposalReview';

export function usePreferenceOptions() {
  const venues = useApiResource('/venues');
  const vendors = useApiResource('/vendors/preference-options');
  return { venues, vendors };
}

export function externalServices(categories, eventType) {
  return (categories || []).filter(category => category !== 'venue' && (category !== 'catering' || eventType === 'wedding'));
}

function DirectoryStatus({ resource, label }) {
  if (resource.loading) return <p role="status">Loading {label}…</p>;
  if (resource.error) return <p role="alert">Could not load {label}. <button type="button" className="underline" onClick={resource.reload}>Try again</button></p>;
  return null;
}

export function VenueChoice({ resource, value, onChange, savedName }) {
  const rooms = resource.data.filter(room => room.active).sort((a,b) => a.name.localeCompare(b.name));
  return <div className="preference-field"><label>Preferred venue <select value={value || ''} onChange={e => onChange(Number(e.target.value) || null)}>
    <option value="">Ask AICC to suggest a venue</option>
    {value && !rooms.some(room => room.id === value) && <option value={value}>{savedName || 'Previously chosen venue'}</option>}
    {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
  </select></label><DirectoryStatus resource={resource} label="venues" /></div>;
}

export function VendorChoices({ resource, categories, eventType, selected, onChange, savedNames = {}, recommendations = [] }) {
  const services = externalServices(categories, eventType);
  const options = resource.data.filter(v => services.includes(v.serviceCategory)).sort((a,b) => a.companyName.localeCompare(b.companyName));
  const missing = !resource.loading && !resource.error ? selected.filter(id => !options.some(v => v.id === id)) : [];
  function toggle(id) { onChange(selected.includes(id) ? selected.filter(value => value !== id) : [...selected,id]); }
  return <div className="vendor-choices"><h4>Preferred vendors <small>Optional</small></h4>
    <p>Choose any companies you would like AICC to approach. The coordinator checks availability before an offer goes out.</p>
    <DirectoryStatus resource={resource} label="vendor choices" />
    {!resource.loading && !resource.error && (!services.length ? <p>No external services selected.</p> : services.map(category => {
      const candidates = options.filter(v => v.serviceCategory === category);
      return <fieldset key={category}><legend>{proposalLabel(category)}</legend>
        {candidates.length ? candidates.map(v => <label key={v.id}><input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggle(v.id)} />{v.companyName}{recommendations.includes(v.id) && <small>Suggested for your date</small>}</label>) : <small>AICC can help source this service.</small>}
      </fieldset>;
    }))}
    {missing.map(id => <label key={id}><input type="checkbox" checked onChange={() => toggle(id)} />{savedNames?.[id] || 'Vendor #' + id} · no longer offered for these services</label>)}
  </div>;
}

export function PreferenceSummary({ inquiry, proposal }) {
  const ids = inquiry.preferredVendorIds || [];
  if (!inquiry.preferredVenueId && !ids.length && !inquiry.requestedGuestsPerTable) return null;
  const shortlist = proposalVendors(proposal).flatMap(group => group.vendors);
  return <section className="preference-summary"><h3>{proposal ? 'How the offer compares with your preferences' : 'Client preferences'}</h3>
    {inquiry.requestedGuestsPerTable && <p><strong>{proposalLabel(inquiry.requestedTableLayout)} · {inquiry.requestedGuestsPerTable} guests per table</strong> · Client’s requested table setting</p>}
    {inquiry.preferredVenueId && <p><strong>{inquiry.preferredVenueName || 'Requested venue'}</strong> · {proposal ? Number(proposal.venueId) === inquiry.preferredVenueId ? 'Your preferred venue is in the proposal.' : 'The proposal offers ' + (proposal.venue || 'a venue still to be agreed') + '.' : 'Preferred venue'}</p>}
    {ids.map(id => <p key={id}><strong>{inquiry.preferredVendorNames?.[id] || 'Vendor #' + id}</strong> · {proposal ? shortlist.some(v => Number(v.id) === id) ? 'On the proposal shortlist' : 'Requested separately from the proposal shortlist' : 'Requested vendor'}</p>)}
    <small>Preferences guide planning. Vendors confirm when they respond to an offer.</small>
  </section>;
}

function PreferenceEditor({ inquiry, onSaved }) {
  const directory = usePreferenceOptions();
  const categories = inquiry.categories ?? inquiry.requestedCategories;
  const hasServices = externalServices(categories, inquiry.eventType).length > 0;
  const ranked = useApiResource(hasServices ? `/inquiries/${inquiry.id}/recommended-vendors` : null);
  const recommendations = (ranked.data.categories || []).flatMap(group => group.options.map(option => option.vendorId));
  const [venue, setVenue] = useState(inquiry.preferredVenueId || null);
  const [vendors, setVendors] = useState(inquiry.preferredVendorIds || []);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const { data } = await api.put(`/inquiries/${inquiry.id}/preferences`, { preferredVenueId: venue, preferredVendorIds: vendors });
      onSaved(data); setNotice('Your preferences are saved.');
    } catch (err) { setError(err.response?.data?.message || 'Could not save your preferences. Try again.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save}><fieldset disabled={busy}>
    <VenueChoice resource={directory.venues} value={venue} savedName={inquiry.preferredVenueName} onChange={value => { setVenue(value); setNotice(''); }} />
    <VendorChoices resource={directory.vendors} categories={categories} recommendations={recommendations} eventType={inquiry.eventType} selected={vendors} savedNames={inquiry.preferredVendorNames} onChange={value => { setVendors(value); setNotice(''); }} />
    <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button>
  </fieldset>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form>;
}

export function EditPreferences({ inquiry, onSaved }) {
  const [opened, setOpened] = useState(false);
  return <details className="surface p-5" onToggle={e => setOpened(e.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Change venue and vendor preferences</summary>
    {opened && <PreferenceEditor inquiry={inquiry} onSaved={onSaved} />}
  </details>;
}
