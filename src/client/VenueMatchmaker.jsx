
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function VenueMatcher() {
  const { fetchAvailableVenues } = useApp();
  const navigate = useNavigate();

  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendees, setAttendees] = useState('');
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setSearched(false);
    setVenues([]);

    if (!date || !attendees || Number(attendees) < 1) {
      setError('Please enter an event date and a valid attendee count.');
      return;
    }

    if (endDate && endDate < date) {
      setError('The end date cannot be earlier than the start date.');
      return;
    }

    try {
      setLoading(true);

      const results = await fetchAvailableVenues(
        date,
        Number(attendees),
        endDate || undefined
      );

      // Only show active venues that can accommodate the attendees.
      const matchingVenues = (Array.isArray(results) ? results : []).filter(
        (venue) =>
          venue.active === true &&
          Number(venue.capacity) >= Number(attendees)
      );

      setVenues(matchingVenues);
      setSearched(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to search for available venues. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const requestVenue = (venue) => {
    navigate('/client/new-inquiry', {
      state: { selectedVenue: venue },
    });
  };

  return (
    <section className="bg-white rounded-xl shadow p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">
          Venue Matchmaker
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Find available venues that match your event date and guest count.
        </p>
      </div>

      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date (Optional)
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={date || new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Attendees
          </label>
          <input
            type="number"
            min="1"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="e.g. 200"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 font-medium disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Venues'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3">
          {error}
        </div>
      )}

      {searched && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">
            {venues.length} matching venue{venues.length === 1 ? '' : 's'} found
          </h3>

          {venues.length === 0 ? (
            <div className="text-center bg-gray-50 rounded-lg p-8">
              <p className="text-gray-700 font-medium">
                No matching venues found.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Try another date or reduce the number of attendees.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-lg text-gray-800">
                      {venue.name}
                    </h4>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                      Available
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-2">
                    {venue.location || 'Location not specified'}
                  </p>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Capacity:</span>{' '}
                      <strong>{venue.capacity} people</strong>
                    </p>
                    <p>
                      <span className="text-gray-500">Hourly rate:</span>{' '}
                      <strong>
                        {venue.hourlyRate != null
                          ? `${Number(venue.hourlyRate).toLocaleString()} Birr`
                          : 'Not specified'}
                      </strong>
                    </p>
                  </div>

                  {venue.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-3">
                      {venue.description}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => requestVenue(venue)}
                    className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 font-medium"
                  >
                    Request This Venue
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
