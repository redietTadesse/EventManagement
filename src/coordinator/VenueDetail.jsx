import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

export default function VenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchVenueById, fetchVenueBookings } = useApp();

  const [venue, setVenue] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVenue = async () => {
      setLoading(true);
      try {
        const [venueData, bookingsData] = await Promise.all([
          fetchVenueById(id),
          fetchVenueBookings(id)
        ]);
        setVenue(venueData);
        setBookings(bookingsData || []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load venue details');
      } finally {
        setLoading(false);
      }
    };
    
    loadVenue();
  }, [id, fetchVenueById, fetchVenueBookings]);

  if (loading) {
    return (
      <Layout title="Venue Detail">
        <div className="text-center py-10 text-gray-500">Loading…</div>
      </Layout>
    );
  }

  if (error && !venue) {
    return (
      <Layout title="Venue Detail">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
        <button onClick={() => navigate('/coordinator/venues')} className="mt-4 text-indigo-600 text-sm">
          ← Back to venues
        </button>
      </Layout>
    );
  }

  const activeBookings = bookings.filter(b => b.status === 'CONFIRMED');
  const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');

  return (
    <Layout title="Venue Detail">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{venue?.name}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            venue?.active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {venue?.active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>}

        {/* Venue Details */}
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Venue Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {venue?.location && (
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{venue.location}</p>
              </div>
            )}
            {venue?.capacity && (
              <div>
                <p className="text-gray-500">Capacity</p>
                <p className="font-medium">{venue.capacity} people</p>
              </div>
            )}
            {venue?.hourlyRate && (
              <div>
                <p className="text-gray-500">Base Daily Rate</p>
                <p className="font-medium">ETB {Number(venue.hourlyRate).toLocaleString()}/day</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-medium">{venue?.active ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
          {venue?.description && (
            <div>
              <p className="text-gray-500">Description</p>
              <p className="font-medium mt-1">{venue.description}</p>
            </div>
          )}
        </div>

        {/* Booking Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Confirmed Bookings</p>
            <p className="text-2xl font-bold text-green-600">{activeBookings.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">Cancelled Bookings</p>
            <p className="text-2xl font-bold text-red-600">{cancelledBookings.length}</p>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-800">Venue Bookings</h3>
          </div>
          {bookings.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No bookings found for this venue.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookings.map(booking => (
                <div key={booking.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{booking.eventName || 'Unknown Event'}</p>
                      <p className="text-sm text-gray-500">
                        {booking.bookingDate} · {booking.eventStatus || 'Unknown Status'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  {booking.eventId && (
                    <Link
                      to={`/coordinator/events/${booking.eventId}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                    >
                      View Event →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}