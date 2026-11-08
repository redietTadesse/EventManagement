import { useCallback, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

const EMPTY_FORM = {
  name: '',
  location: '',
  capacity: '',
  hourlyRate: '',
  description: '',
  resources: '',
  setupBufferDays: 1,
  teardownBufferDays: 1,
};

function toForm(venue) {
  return {
    name: venue.name || '',
    location: venue.location || '',
    capacity: venue.capacity ?? '',
    hourlyRate: venue.hourlyRate ?? '',
    description: venue.description || '',
    resources: venue.resources || '',
    setupBufferDays: venue.setupBufferDays ?? 1,
    teardownBufferDays: venue.teardownBufferDays ?? 1,
  };
}

function localDateString() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function AdminVenues() {
  const {
    fetchAllVenues,
    createVenue,
    updateVenue,
    fetchVenueUnavailableDates,
    addVenueUnavailableDate,
    removeVenueUnavailableDate,
  } = useApp();

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [success, setSuccess] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [availabilityVenue, setAvailabilityVenue] = useState(null);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [dateLoading, setDateLoading] = useState(false);
  const [dateSaving, setDateSaving] = useState(false);
  const [dateError, setDateError] = useState('');
  const [dateForm, setDateForm] = useState({ date: '', reason: '' });

  const loadVenues = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const result = await fetchAllVenues();
      setVenues(result || []);
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not load venues.');
    } finally {
      setLoading(false);
    }
  }, [fetchAllVenues]);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const openCreate = () => {
    setFormOpen(true);
    setEditingVenue(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setSuccess('');
  };

  const openEdit = (venue) => {
    setFormOpen(true);
    setEditingVenue(venue);
    setForm(toForm(venue));
    setFormError('');
    setSuccess('');
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingVenue(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setPageError('');
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      resources: form.resources.trim(),
      setupBufferDays: Number(form.setupBufferDays),
      teardownBufferDays: Number(form.teardownBufferDays),
    };
    if (form.capacity !== '') payload.capacity = Number(form.capacity);
    if (form.hourlyRate !== '') payload.hourlyRate = Number(form.hourlyRate);

    try {
      if (editingVenue) {
        await updateVenue(editingVenue.id, payload);
        setSuccess('Venue details saved.');
      } else {
        await createVenue(payload);
        setSuccess('Venue registered.');
      }
      setFormOpen(false);
      setEditingVenue(null);
      setForm(EMPTY_FORM);
      await loadVenues();
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not save this venue.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (venue) => {
    setPageError('');
    setSuccess('');
    try {
      await updateVenue(venue.id, { active: !venue.active });
      setSuccess(`${venue.name} is now ${venue.active ? 'inactive' : 'active'}.`);
      await loadVenues();
    } catch (error) {
      setPageError(error.response?.data?.message || 'Could not update venue status.');
    }
  };

  const openAvailability = async (venue) => {
    if (availabilityVenue?.id === venue.id) {
      setAvailabilityVenue(null);
      return;
    }
    setAvailabilityVenue(venue);
    setUnavailableDates([]);
    setDateError('');
    setDateForm({ date: '', reason: '' });
    setDateLoading(true);
    try {
      const result = await fetchVenueUnavailableDates(venue.id);
      setUnavailableDates(result || []);
    } catch (error) {
      setDateError(error.response?.data?.message || 'Could not load blocked dates.');
    } finally {
      setDateLoading(false);
    }
  };

  const refreshUnavailableDates = async (venueId) => {
    const result = await fetchVenueUnavailableDates(venueId);
    setUnavailableDates(result || []);
  };

  const handleBlockDate = async (event) => {
    event.preventDefault();
    if (!availabilityVenue) return;
    setDateSaving(true);
    setDateError('');
    try {
      await addVenueUnavailableDate(
        availabilityVenue.id,
        dateForm.date,
        dateForm.reason.trim() || undefined,
      );
      setDateForm({ date: '', reason: '' });
      await refreshUnavailableDates(availabilityVenue.id);
      setSuccess(`Availability updated for ${availabilityVenue.name}.`);
    } catch (error) {
      setDateError(error.response?.data?.message || 'Could not block that date.');
    } finally {
      setDateSaving(false);
    }
  };

  const handleUnblockDate = async (blockedDate) => {
    if (!availabilityVenue) return;
    setDateError('');
    try {
      await removeVenueUnavailableDate(availabilityVenue.id, blockedDate.id);
      await refreshUnavailableDates(availabilityVenue.id);
      setSuccess(`Availability restored for ${blockedDate.date}.`);
    } catch (error) {
      setDateError(error.response?.data?.message || 'Could not remove that unavailable date.');
    }
  };

  return (
    <Layout title="Venue management">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Venue management</h1>
            <p className="mt-1 text-sm text-slate-600">
              Register spaces, capacities, resources, and dates they cannot be booked.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add venue
          </button>
        </header>

        {pageError && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{pageError}</div>}
        {success && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading venues…</div>
        ) : venues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-semibold text-slate-800">No venues registered</h2>
            <p className="mt-1 text-sm text-slate-500">Add the spaces your team can offer for events.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venues.map((venue) => (
                    <tr key={venue.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{venue.name}</p>
                        <p className="mt-1 text-slate-500">{venue.location || 'Location not specified'}</p>
                        {venue.resources && <p className="mt-1 max-w-md whitespace-pre-line text-xs text-slate-500">{venue.resources}</p>}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{venue.capacity ?? 'Not set'}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {venue.hourlyRate == null ? 'Not set' : `ETB ${Number(venue.hourlyRate).toLocaleString()}/day`}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${venue.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {venue.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
                          <button type="button" onClick={() => openEdit(venue)} className="font-medium text-indigo-600 hover:text-indigo-800">
                            Edit
                          </button>
                          <button type="button" onClick={() => openAvailability(venue)} className="font-medium text-indigo-600 hover:text-indigo-800">
                            {availabilityVenue?.id === venue.id ? 'Close dates' : 'Availability'}
                          </button>
                          <button type="button" onClick={() => toggleActive(venue)} className="font-medium text-slate-600 hover:text-slate-900">
                            {venue.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {availabilityVenue && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="availability-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="availability-title" className="text-lg font-semibold text-slate-900">Availability · {availabilityVenue.name}</h2>
                <p className="mt-1 text-sm text-slate-500">Blocked dates also include the venue’s setup and teardown buffers when checking bookings.</p>
              </div>
              <button type="button" onClick={() => setAvailabilityVenue(null)} className="text-sm font-medium text-slate-500 hover:text-slate-800">Close</button>
            </div>

            {dateError && <div role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{dateError}</div>}

            <form onSubmit={handleBlockDate} className="mt-5 grid gap-3 md:grid-cols-[minmax(160px,220px)_1fr_auto] md:items-end">
              <label className="text-sm font-medium text-slate-700">
                Unavailable date
                <input
                  type="date"
                  required
                  min={localDateString()}
                  value={dateForm.date}
                  onChange={(event) => setDateForm((current) => ({ ...current, date: event.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Reason (optional)
                <input
                  type="text"
                  maxLength={500}
                  value={dateForm.reason}
                  onChange={(event) => setDateForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Maintenance, private booking, or other note"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <button type="submit" disabled={dateSaving || !dateForm.date} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {dateSaving ? 'Saving…' : 'Block date'}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">Unavailable dates</h3>
              {dateLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading dates…</p>
              ) : unavailableDates.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No administrator-blocked dates.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {unavailableDates.map((blockedDate) => (
                    <li key={blockedDate.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-800">{blockedDate.date}</p>
                        {blockedDate.reason && <p className="mt-0.5 text-slate-500">{blockedDate.reason}</p>}
                      </div>
                      <button type="button" onClick={() => handleUnblockDate(blockedDate)} className="font-medium text-rose-600 hover:text-rose-800">
                        Restore availability
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="venue-form-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="venue-form-title" className="text-xl font-semibold text-slate-900">{editingVenue ? 'Edit venue' : 'Register a venue'}</h2>
                <p className="mt-1 text-sm text-slate-500">Venue details remain editable as your inventory changes.</p>
              </div>
              <button type="button" onClick={closeForm} className="text-slate-500 hover:text-slate-800" aria-label="Close venue form">✕</button>
            </div>

            {formError && <div role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{formError}</div>}

            <form onSubmit={handleSave} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Venue name <span className="text-rose-600">*</span>
                <input required maxLength={255} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Location
                <input maxLength={255} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Guest capacity
                <input type="number" min="0" step="1" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Base daily rate (ETB)
                <input type="number" min="0" step="0.01" value={form.hourlyRate} onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Setup buffer (days)
                  <input type="number" min="0" step="1" value={form.setupBufferDays} onChange={(event) => setForm((current) => ({ ...current, setupBufferDays: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Teardown buffer (days)
                  <input type="number" min="0" step="1" value={form.teardownBufferDays} onChange={(event) => setForm((current) => ({ ...current, teardownBufferDays: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              </div>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea rows={2} maxLength={4000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Resources and facilities
                <textarea rows={3} maxLength={4000} value={form.resources} onChange={(event) => setForm((current) => ({ ...current, resources: event.target.value }))} placeholder="Add equipment or facilities available at this venue" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2">
                <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : editingVenue ? 'Save changes' : 'Register venue'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Layout>
  );
}
