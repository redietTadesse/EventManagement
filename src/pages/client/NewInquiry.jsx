import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';

const eventTypes = [
  { value: 'conference', label: 'Conference' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'concert', label: 'Concert' },
  { value: 'gala', label: 'Gala' },
  { value: 'seminar', label: 'Seminar' },
];

const NewInquiry = () => {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ eventType: 'conference', eventDate: '', expectedAttendees: '', requirements: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({ type: 'CREATE_INQUIRY', payload: form });
    setSubmitted(true);
    setTimeout(() => navigate('/client/inquiries'), 1500);
  };

  return (
    <div className="page-enter max-w-2xl mx-auto">
      <PageHeader title="Submit Inquiry" subtitle="Tell us about your event and we'll match it with the right services." />

      <div className="card">
        {submitted && (
          <div className="mb-4 p-3 bg-green/10 text-green rounded-lg text-sm">
            Inquiry submitted successfully! Redirecting…
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Event Type</label>
            <select
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="mt-1 w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
              required
            >
              {eventTypes.map(et => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Event Date</label>
            <input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              className="mt-1 w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Expected Attendees</label>
            <input
              type="number"
              value={form.expectedAttendees}
              onChange={(e) => setForm({ ...form, expectedAttendees: e.target.value })}
              className="mt-1 w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Requirements</label>
            <textarea
              rows={4}
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              placeholder="Describe your requirements…"
              className="mt-1 w-full rounded-lg border-slate-300 shadow-sm focus:border-navy focus:ring-navy"
            />
          </div>
          <button type="submit" className="btn-primary w-full">Submit Inquiry</button>
        </form>
        <p className="mt-4 text-xs text-slate-400 text-center">
          The system instantly notifies the coordinator of your new inquiry.
        </p>
      </div>
    </div>
  );
};

export default NewInquiry;