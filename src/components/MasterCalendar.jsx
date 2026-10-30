import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useApp } from '../context/AppContext';

export default function MasterCalendar() {
  const { state } = useApp();
  const { inquiries } = state;

  // 1. Map inquiries to FullCalendar events
  const events = useMemo(() => {
    return inquiries
      .filter(inq => inq.event) // Only show converted events
      .map(inq => {
        const event = inq.event;

        // FullCalendar's end date is EXCLUSIVE.
        // If event ends Nov 17, we pass Nov 18 so it fills the box for Nov 17.
        let endStr = inq.endDate || inq.eventDate;
        const endDateObj = new Date(endStr);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const exclusiveEnd = endDateObj.toISOString().split('T')[0];

        // Color coding based on status
        let backgroundColor = '#4F46E5'; // Indigo (Default)
        let borderColor = '#4338CA';

        if (event.status === 'CONFIRMED' || event.status === 'COMPLETED') {
          backgroundColor = '#059669'; // Emerald (Success)
          borderColor = '#047857';
        } else if (event.status === 'NEEDS_COORDINATOR') {
          backgroundColor = '#E11D48'; // Rose (Critical)
          borderColor = '#BE123C';
        } else if (event.status === 'AWAITING_VENDORS') {
          backgroundColor = '#D97706'; // Amber (Warning)
          borderColor = '#B45309';
        }

        return {
          id: event.id,
          title: `${event.name} (${event.venue || 'TBD'})`,
          start: inq.eventDate,
          end: exclusiveEnd,
          backgroundColor,
          borderColor,
          textColor: '#ffffff',
          extendedProps: {
            status: event.status,
            client: inq.clientName,
          }
        };
      });
  }, [inquiries]);

  // 2. Calculate Utilization for the current month
  const utilization = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let bookedDays = 0;

    // Create a set of all unique days that have a booking
    const bookedSet = new Set();
    events.forEach(ev => {
      let current = new Date(ev.start);
      const end = new Date(ev.end);
      while (current < end) {
        if (current.getMonth() === month && current.getFullYear() === year) {
          bookedSet.add(current.getDate());
        }
        current.setDate(current.getDate() + 1);
      }
    });

    bookedDays = bookedSet.size;
    const percentage = Math.round((bookedDays / daysInMonth) * 100);

    return { percentage, bookedDays, daysInMonth };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Utilization Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
          <p className="text-sm font-medium text-slate-500 mb-1">Monthly Utilization</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold text-indigo-600">{utilization.percentage}%</p>
            <p className="text-sm text-slate-500 mb-1">of days booked</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${utilization.percentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Days Booked</p>
          <p className="text-4xl font-bold text-slate-800">{utilization.bookedDays} <span className="text-lg text-slate-400 font-normal">/ {utilization.daysInMonth}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-500 mb-1">Legend</p>
          <div className="flex flex-col gap-1 mt-2 text-sm">
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-600"></div> Confirmed</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-600"></div> Awaiting Vendors</div>
             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-600"></div> Needs Coordinator</div>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          eventClick={(info) => {
            // Optional: Open a modal or navigate to the event detail page
            console.log('Event clicked:', info.event.id);
          }}
        />
      </div>

      {/* Custom CSS overrides for FullCalendar to match Tailwind theme */}
      <style jsx="true" global>{`
        .fc-theme-standard .fc-scrollgrid {
          border-color: #e2e8f0; /* slate-200 */
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #e2e8f0;
        }
        .fc-col-header-cell-cushion {
          color: #64748b; /* slate-500 */
          font-weight: 600;
          text-transform: uppercase;
          font-size: 0.75rem;
          padding: 8px 0;
        }
        .fc-daygrid-day-number {
          color: #334155; /* slate-700 */
          font-weight: 500;
          padding: 8px;
        }
        .fc-event {
          border-radius: 6px;
          padding: 2px 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          margin-top: 2px;
        }
        .fc-button-primary {
          background-color: #f8fafc !important; /* slate-50 */
          border-color: #e2e8f0 !important;
          color: #334155 !important;
          font-weight: 600 !important;
          text-transform: capitalize !important;
        }
        .fc-button-primary:hover {
          background-color: #f1f5f9 !important; /* slate-100 */
        }
        .fc-button-active {
          background-color: #4f46e5 !important; /* indigo-600 */
          border-color: #4338ca !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
