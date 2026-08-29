import React from 'react';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import { venueOptions } from '../../data/mockData';

const BOOKED_STATUSES = ['CONFIRMED', 'AWAITING_VENDORS', 'NEEDS_COORDINATOR'];

const Venues = () => {
  const { state } = useApp();
  const { inquiries } = state;

  // Union of static bookedDates + live planned events already using the venue
  const bookedDatesFor = (venue) => {
    const staticDates = [...(venue.bookedDates || [])];
    const liveDates = inquiries
      .filter(i => i.event && i.event.venueId === venue.id && BOOKED_STATUSES.includes(i.event.status))
      .map(i => i.eventDate);
    return [...new Set([...staticDates, ...liveDates])].sort();
  };

  return (
    <div className="page-enter">
      <PageHeader title="Venue Management" subtitle="All event spaces at AICC — capacity, pricing, features, and booked dates." />

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Venue</th>
                <th className="px-4 py-3 text-left font-semibold">Capacity</th>
                <th className="px-4 py-3 text-left font-semibold">Base Price</th>
                <th className="px-4 py-3 text-left font-semibold">Features</th>
                <th className="px-4 py-3 text-left font-semibold">Booked Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {venueOptions.map(v => {
                const bookedDates = bookedDatesFor(v);
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{v.name}</td>
                    <td className="px-4 py-3 text-slate-600">{v.capacity}</td>
                    <td className="px-4 py-3 text-slate-600">ETB {v.basePrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{v.features.join(', ')}</td>
                    <td className={`px-4 py-3 ${bookedDates.length > 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                      {bookedDates.length > 0 ? bookedDates.join(', ') : 'Available'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Booked dates combine the venue's known reservations with all live planned events (confirmed or awaiting vendors).
        When creating a proposal, the system will warn if the selected venue is already booked on the event date.
      </p>
    </div>
  );
};

export default Venues;