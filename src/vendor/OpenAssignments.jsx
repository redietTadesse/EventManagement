import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

export default function OpenAssignments() {
  const { fetchOpenAssignments, claimAssignment } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(null); // assignment id being claimed

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchOpenAssignments();
      setOpen(list || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load open assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleClaim = async (id) => {
    setClaiming(id);
    setError('');
    try {
      const claimed = await claimAssignment(id);
      // Navigate to the detail view of the claimed assignment
      navigate(`/vendor/assignments/${claimed.id}`);
    } catch (err) {
      const raw = err.response?.data;
      setError((raw && (raw.message || raw.code)) || 'Could not claim assignment');
      setClaiming(null);
      // Refresh in case it was claimed by another vendor
      load();
    }
  };

  if (loading) {
    return (
      <Layout title="Open Assignments">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title="Open Assignments">
      <div className="space-y-4 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Open assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Categories where the automatic escalation ladder was exhausted. First claim wins.
          </p>
        </div>

        {error && <div role="alert" className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}

        {open.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No open assignments in your category right now.
          </div>
        ) : (
          <div className="grid gap-4">
            {open.map(a => (
              <div key={a.id} className="bg-white rounded-xl shadow p-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{a?.eventName}</p>
                  <p className="text-sm text-gray-500">
                    {a?.serviceCategory?.toUpperCase()} · {a?.eventDate}
                    {a?.eventVenue ? ` · ${a.eventVenue}` : ''}
                  </p>
                  {a?.expectedAttendees && (
                    <p className="text-xs text-gray-400 mt-1">
                      {a.expectedAttendees} expected attendees
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleClaim(a.id)}
                  disabled={claiming === a.id}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2 rounded-lg text-sm disabled:opacity-50 sm:w-auto"
                >
                  {claiming === a.id ? 'Claiming…' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
