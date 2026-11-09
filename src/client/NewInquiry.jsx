import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import api from '../api/axios';
import InquiryDateCalendar from './InquiryDateCalendar';

export default function NewInquiry() {
  const { state, createInquiry } = useApp();
  const { currentUser, loading } = state;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    eventType: 'conference',
    eventDate: '',
    endDate: '',
    expectedAttendees: '',
    requirements: '',
    requestedCategories: [],
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [touchedCategories, setTouchedCategories] = useState(false);

  useEffect(() => {
    let active = true;
    const eventType = form.eventType;
    api.get('/vendors/service-categories', { params: { eventType } })
      .then((response) => {
        if (!active) return;
        const categories = response.data || [];
        setAvailableCategories(categories);
        if (!touchedCategories) {
          setForm((previous) => previous.eventType === eventType
            ? { ...previous, requestedCategories: categories }
            : previous);
        }
      })
      .catch(() => { if (active) setError('Could not load available event services.'); });
    return () => { active = false; };
  }, [form.eventType, touchedCategories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'eventType') {
      setTouchedCategories(false);
      setForm((prev) => ({
        ...prev,
        eventType: value,
      }));
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const toggleCategory = (category) => {
    setTouchedCategories(true);
    setForm((prev) => {
      const existing = prev.requestedCategories || [];
      const next = existing.includes(category)
        ? existing.filter((item) => item !== category)
        : [...existing, category];
      return { ...prev, requestedCategories: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.eventDate || (form.endDate && form.endDate < form.eventDate)) {
      setError('Select a start date and an end date on or after it.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const inquiry = await createInquiry({
        clientId: currentUser?.id,
        clientName: currentUser?.name || currentUser?.fullName,
        ...form,
        requestedCategories: form.requestedCategories,
        expectedAttendees: Number(form.expectedAttendees),
      });
      navigate(`/client/inquiries/${inquiry.id}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="New Inquiry">
        <div className="text-center py-10">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="New Inquiry">
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Client workspace" title="Plan an event"
          subtitle="Tell your coordinator what you need so they can prepare a proposal."
          action={<Link className="btn-outline" to="/client/inquiries">My inquiries</Link>} />
        <form onSubmit={handleSubmit} className="surface p-5 sm:p-7">
          <h2 className="form-section-title">Event details</h2>
          <p className="form-section-note">Choose the event type and estimated attendance to check venue availability.</p>
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              name="eventType"
              value={form.eventType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="conference">Conference</option>
              <option value="meeting">Meeting</option>
              <option value="exhibition">Exhibition</option>
              <option value="wedding">Wedding</option>
              <option value="trade_show">Trade Show</option>
              <option value="concert">Concert</option>
              <option value="gala">Gala</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Attendees
            </label>
            <input
              type="number"
              name="expectedAttendees"
              value={form.expectedAttendees}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
              min="1"
            />
          </div>

          <p className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-900">
            Available dates can be requested by multiple clients. An inquiry does not reserve a venue. The coordinator checks availability again when verifying payment and booking.
          </p>
          <InquiryDateCalendar eventType={form.eventType} start={form.eventDate} end={form.endDate} attendees={form.expectedAttendees}
            onChange={(eventDate, endDate) => setForm((previous) => ({ ...previous, eventDate, endDate }))} />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services needed
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={(form.requestedCategories || []).includes(cat)}
                    onChange={() => toggleCategory(cat)}
                  />
                  <span className="capitalize">{cat}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              These are suggestions based on the event type. Clear all boxes if AICC should source no external services.
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements
            </label>
            <textarea
              name="requirements"
              rows="3"
              value={form.requirements}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Any special requirements..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto"
          >
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
