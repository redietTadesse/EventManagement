import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

const ALL_CATEGORIES = ['av', 'catering', 'security', 'cleaning', 'photography', 'music'];

const EVENT_TYPE_DEFAULTS = {
  conference: ['av', 'catering', 'security'],
  wedding: ['catering', 'photography', 'music'],
  trade_show: ['av', 'security', 'cleaning'],
  exhibition: ['av', 'security', 'cleaning'],
  concert: ['av', 'security', 'music'],
  gala: ['catering', 'photography', 'music', 'security'],
  seminar: ['av', 'catering'],
};

const defaultCategories = (eventType) => EVENT_TYPE_DEFAULTS[eventType] || [];

export default function NewInquiry() {
  const { state, createInquiry } = useApp();
  const { currentUser, loading } = state;
  const navigate = useNavigate();
  const [form, setForm] = useState({
    eventType: 'conference',
    eventDate: '',
    expectedAttendees: '',
    requirements: '',
    requestedCategories: defaultCategories('conference'),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [touchedCategories, setTouchedCategories] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'eventType') {
      setForm((prev) => ({
        ...prev,
        eventType: value,
        requestedCategories: touchedCategories ? prev.requestedCategories : defaultCategories(value),
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
    setSubmitting(true);
    setError('');
    try {
      await createInquiry({
        clientId: currentUser?.id,
        clientName: currentUser?.name || currentUser?.fullName,
        ...form,
        requestedCategories: form.requestedCategories || defaultCategories(form.eventType),
        expectedAttendees: Number(form.expectedAttendees),
      });
      navigate('/client/dashboard');
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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Inquiry</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
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
              <option value="wedding">Wedding</option>
              <option value="trade_show">Trade Show</option>
              <option value="concert">Concert</option>
              <option value="gala">Gala</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Date
            </label>
            <input
              type="date"
              name="eventDate"
              value={form.eventDate}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services needed
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => (
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
              Pre-selected based on the event type. Uncheck anything you do not need.
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
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </Layout>
  );
}