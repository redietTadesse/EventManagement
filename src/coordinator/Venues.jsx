import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

export default function Venues() {
  const { fetchAllVenues } = useApp();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const data = await fetchAllVenues();
        setVenues(data || []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load venues');
      } finally {
        setLoading(false);
      }
    };
    
    loadVenues();
  }, [fetchAllVenues]);

  if (loading) {
    return (
      <Layout title="Venues">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout title="Venues">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Venue Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse and manage event venues
            </p>
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>}

        {venues.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
            No venues available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(venue => (
              <div key={venue.id} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">{venue.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      venue.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {venue.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {venue.location && (
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {venue.location}
                    </p>
                  )}
                  
                  {venue.capacity && (
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Capacity: {venue.capacity}
                    </p>
                  )}
                  
                  {venue.hourlyRate && (
                    <p className="text-sm text-gray-600 mb-4 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${venue.hourlyRate}/hour
                    </p>
                  )}
                  
                  {venue.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {venue.description}
                    </p>
                  )}
                  
                  <Link
                    to={`/coordinator/venues/${venue.id}`}
                    className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}