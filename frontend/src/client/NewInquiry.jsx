import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';  // ← UPDATED

export default function NewInquiry() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    eventType: 'conference',
    eventDate: '',
    expectedAttendees: '',
    requirements: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      dispatch({
        type: 'CREATE_INQUIRY',
        payload: { ...form, expectedAttendees: Number(form.expectedAttendees) || 0 }
      });
      navigate('/client/dashboard');
    } catch (err) {
      setError('Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy outline-none transition';

  return (
    <Layout title="New Inquiry">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Submit a New Inquiry</h1>
        <form onSubmit={handleSubmit} className="card">
          {error && <div className="bg-rose/20 text-rose-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type *</label>
            <select
              name="eventType"
              value={form.eventType}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="conference">Conference</option>
              <option value="exhibition">Exhibition</option>
              <option value="seminar">Seminar</option>
              <option value="workshop">Workshop</option>
              <option value="gala">Gala Dinner</option>
              <option value="trade_show">Trade Show</option>
              <option value="cultural">Cultural Event</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Date *</label>
            <input
              type="date"
              name="eventDate"
              value={form.eventDate}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Attendees *</label>
            <input
              type="number"
              name="expectedAttendees"
              value={form.expectedAttendees}
              onChange={handleChange}
              className={inputClass}
              required
              min="1"
              placeholder="e.g., 100"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Requirements / Special Requests</label>
            <textarea
              name="requirements"
              rows="3"
              value={form.requirements}
              onChange={handleChange}
              className={inputClass}
              placeholder="Any special requirements, equipment needs, etc."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </Layout>
  );
}