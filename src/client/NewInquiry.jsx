import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../store/AppContext';

const EVENT_CATEGORY_DEFAULTS = {
  conference: ['av', 'catering', 'security'],
  wedding: ['catering', 'photography', 'music'],
  trade_show: ['av', 'security', 'cleaning'],
  concert: ['av', 'security', 'music'],
  gala: ['catering', 'photography', 'music', 'security'],
  seminar: ['av', 'catering'],
};

const ALL_CATEGORIES = ['av', 'catering', 'security', 'cleaning', 'photography', 'music'];

export default function NewInquiry() {
  const { user } = useAuth();
  const { createInquiry } = useApp(); // Use the Context, not direct API
  const navigate = useNavigate();

  const [form, setForm] = useState({
    eventType: 'conference',
    eventDate: '',
    expectedAttendees: '',
    requirements: '',
  });
  
  const [selectedCategories, setSelectedCategories] = useState(EVENT_CATEGORY_DEFAULTS['conference']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-select categories when event type changes
  useEffect(() => {
    setSelectedCategories(EVENT_CATEGORY_DEFAULTS[form.eventType] || []);
  }, [form.eventType]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Pass all data to the mock context
      await createInquiry({
        clientId: user?.id || 1,
        clientName: user?.fullName || user?.username || 'Client',
        ...form,
        expectedAttendees: Number(form.expectedAttendees),
        requestedCategories: selectedCategories,
      });
      navigate('/client/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="New Inquiry">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">New Inquiry</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendees</label>
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

          {/* Categories Checkboxes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Services needed</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="capitalize">{cat}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Pre-selected based on the event type.</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
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