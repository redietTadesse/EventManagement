
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import useApiResource from '../hooks/useApiResource';

export default function ClientDashboard() {
  const {
    state: { currentUser },
    fetchAvailableVenues
  } = useApp();

  // Fetch inquiries and events
  const inquiryResource = useApiResource(
    currentUser?.id ? `/inquiries/client/${currentUser.id}` : null
  );

  const eventResource = useApiResource('/events');

  const { data: inquiries = [], loading } = inquiryResource;
  const { data: events = [] } = eventResource;

  // Filter inquiries belonging to the current client
  const myInquiries = inquiries.filter(
    inquiry => inquiry.clientId === currentUser?.id
  );

  // Calculate dashboard statistics
  const stats = {
    totalInquiries: myInquiries.length,

    pendingInquiries: myInquiries.filter(
      inquiry => inquiry.status === 'INQUIRY_SUBMITTED'
    ).length,

    proposals: myInquiries.filter(
      inquiry => inquiry.status === 'PROPOSAL_SENT'
    ).length,

    events: events.length,

    confirmedEvents: events.filter(
      event => event.status === 'CONFIRMED'
    ).length,

    completedEvents: events.filter(
      event => event.status === 'COMPLETED'
    ).length,
  };

  // Venue search states
  const [venueDate, setVenueDate] = useState('');
  const [attendeeCount, setAttendeeCount] = useState('');
  const [venueResults, setVenueResults] = useState([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [venueError, setVenueError] = useState('');
  const [venueSearched, setVenueSearched] = useState(false);

  // Search available venues
  const searchVenues = async (e) => {
    e.preventDefault();

    if (
      !venueDate ||
      !attendeeCount ||
      Number(attendeeCount) < 1
    ) {
      setVenueError(
        'Please enter an event date and a valid attendee count.'
      );
      return;
    }

    setVenueLoading(true);
    setVenueError('');
    setVenueSearched(true);
    setVenueResults([]);

    try {
      const results = await fetchAvailableVenues(
        venueDate,
        Number(attendeeCount)
      );

      // Only show venues with sufficient capacity
      const matchingVenues = (
        Array.isArray(results) ? results : []
      ).filter(
        venue => Number(venue.capacity) >= Number(attendeeCount)
      );

      setVenueResults(matchingVenues);

    } catch (error) {
      console.error('Venue search failed:', error);

      setVenueResults([]);

      setVenueError(
        error.response?.data?.message ||
        'Unable to search available venues.'
      );

    } finally {
      setVenueLoading(false);
    }
  };

  return (
    <Layout title="Client Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, {
              currentUser?.name ||
              currentUser?.fullName ||
              'Client'
            }
          </h1>

          <p className="text-gray-600 mt-1">
            Manage your inquiries and events
          </p>
        </div>

        {/* Venue Search Section */}
        <div className="bg-white rounded-xl shadow p-6">

          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-800">
              Find Your Perfect Venue
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Search available venues based on your event date
              and expected attendees.
            </p>
          </div>

          <form
            onSubmit={searchVenues}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
          >

            {/* Event Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Date
              </label>

              <input
                type="date"
                value={venueDate}
                onChange={(e) => setVenueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>

            {/* Expected Attendees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Attendees
              </label>

              <input
                type="number"
                min="1"
                placeholder="e.g. 200"
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                required
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              disabled={venueLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2 font-medium disabled:opacity-50"
            >
              {venueLoading ? 'Searching...' : 'Search Venues'}
            </button>

          </form>

          {/* Venue Search Error */}
          {venueError && (
            <p className="text-sm text-rose-600 mt-4">
              {venueError}
            </p>
          )}

          {/* Venue Search Results */}
          {venueSearched && !venueLoading && !venueError && (
            <div className="mt-6">

              <h3 className="font-semibold text-gray-800 mb-4">
                Available Venues ({venueResults.length})
              </h3>

              {venueResults.length === 0 ? (

                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-600">
                    No available venues match your search.
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    Try another date or a different attendee count.
                  </p>
                </div>

              ) : (

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {venueResults.map((venue) => (

                    <div
                      key={venue.id}
                      className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
                    >

                      <div className="flex justify-between items-start gap-2">

                        <h4 className="font-bold text-gray-800">
                          {
                            venue.name ||
                            venue.venueName ||
                            `Venue #${venue.id}`
                          }
                        </h4>

                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          Available
                        </span>

                      </div>

                      <p className="text-sm text-gray-500 mt-3">
                        Capacity:{' '}
                        <strong>
                          {venue.capacity} people
                        </strong>
                      </p>

                      {venue.location && (
                        <p className="text-sm text-gray-500 mt-1">
                          Location: {venue.location}
                        </p>
                      )}

                      <Link
                        to="/client/new-inquiry"
                        state={{
                          selectedVenue: venue,
                          eventDate: venueDate,
                          expectedAttendees: attendeeCount,
                        }}
                        className="block text-center mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium"
                      >
                        Request this Venue
                      </Link>

                    </div>

                  ))}

                </div>

              )}

            </div>
          )}

        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Total Inquiries
            </p>

            <p className="text-2xl font-bold text-gray-800">
              {loading || inquiryResource.error
                ? '—'
                : stats.totalInquiries}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Pending
            </p>

            <p className="text-2xl font-bold text-yellow-600">
              {loading || inquiryResource.error
                ? '—'
                : stats.pendingInquiries}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Proposals
            </p>

            <p className="text-2xl font-bold text-blue-600">
              {loading || inquiryResource.error
                ? '—'
                : stats.proposals}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Events
            </p>

            <p className="text-2xl font-bold text-indigo-600">
              {eventResource.loading || eventResource.error
                ? '—'
                : stats.events}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Confirmed
            </p>

            <p className="text-2xl font-bold text-green-600">
              {eventResource.loading || eventResource.error
                ? '—'
                : stats.confirmedEvents}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">
              Completed
            </p>

            <p className="text-2xl font-bold text-purple-600">
              {eventResource.loading || eventResource.error
                ? '—'
                : stats.completedEvents}
            </p>
          </div>

        </div>

        {/* API Errors */}
        {(inquiryResource.error || eventResource.error) && (

          <div
            role="alert"
            className="rounded-lg bg-rose-50 p-4 text-rose-700"
          >

            {inquiryResource.error || eventResource.error}

            <button
              onClick={() => {
                inquiryResource.reload();
                eventResource.reload();
              }}
              className="underline ml-2"
            >
              Retry
            </button>

          </div>

        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">

          <Link
            to="/client/new-inquiry"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            + New Inquiry
          </Link>

          {events.length > 0 && (

            <Link
              to="/client/events"
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-6 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              View Events
            </Link>

          )}

        </div>

        {/* Recent Inquiries */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">

            <h3 className="font-medium text-gray-800">
              Recent Inquiries
            </h3>

            <Link
              to="/client/inquiries"
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              View All →
            </Link>

          </div>

          {loading ? (

            <div className="p-6 text-center text-slate-500">
              Loading...
            </div>

          ) : inquiryResource.error ? (

            <p className="p-6 text-rose-700">
              Inquiries are temporarily unavailable.
            </p>

          ) : myInquiries.length === 0 ? (

            <EmptyState
              icon="📋"
              title="No inquiries yet"
              description="Start by creating your first event inquiry."
              actionText="Create an inquiry"
              actionLink="/client/new-inquiry"
              size="small"
            />

          ) : (

            <div className="divide-y divide-gray-100">

              {myInquiries.slice(0, 5).map((inq) => (

                <div
                  key={inq.id}
                  className="px-6 py-4 hover:bg-gray-50"
                >

                  <div className="flex justify-between items-start">

                    <div className="flex-1">

                      <div className="flex items-center gap-3">

                        <h3 className="font-semibold text-gray-800">
                          {inq.eventType}
                        </h3>

                        <StatusBadge status={inq.status} />

                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {inq.eventDate} · {inq.expectedAttendees} attendees
                      </p>

                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {inq.requirements}
                      </p>

                    </div>

                    <Link
                      to={`/client/inquiries/${inq.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium ml-4"
                    >
                      View →
                    </Link>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* Recent Events */}
        {events.length > 0 && (

          <div className="bg-white rounded-xl shadow overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">

              <h3 className="font-medium text-gray-800">
                Your Events
              </h3>

              <Link
                to="/client/events"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                View All →
              </Link>

            </div>

            <div className="divide-y divide-gray-100">

              {events.slice(0, 3).map((event) => (

                <div
                  key={event.id}
                  className="px-6 py-4 hover:bg-gray-50"
                >

                  <div className="flex justify-between items-start">

                    <div className="flex-1">

                      <div className="flex items-center gap-3">

                        <h3 className="font-semibold text-gray-800">
                          {event.name}
                        </h3>

                        <StatusBadge status={event.status} />

                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {event.eventDate} · {event.venue || 'Venue TBD'}
                      </p>

                    </div>

                    <Link
                      to={`/client/events/${event.id}`}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium ml-4"
                    >
                      View →
                    </Link>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

      </div>
    </Layout>
  );
}
