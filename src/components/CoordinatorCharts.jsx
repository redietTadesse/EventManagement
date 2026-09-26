import React from 'react';
import { useApp } from '../context/AppContext';

const CoordinatorCharts = () => {
  const { state } = useApp();
  const { inquiries, assignments, vendors } = state;

  const statusCounts = {
    INQUIRY_SUBMITTED: inquiries.filter(i => i.status === 'INQUIRY_SUBMITTED').length,
    PROPOSAL_SENT: inquiries.filter(i => i.status === 'PROPOSAL_SENT').length,
    EVENT_CREATED: inquiries.filter(i => i.status === 'EVENT_CREATED').length,
    PROPOSAL_REJECTED: inquiries.filter(i => i.status === 'PROPOSAL_REJECTED').length,
    CLOSED: inquiries.filter(i => i.status === 'CLOSED').length,
  };

  const eventStatusCounts = {
    AWAITING_VENDORS: inquiries.filter(i => i.event?.status === 'AWAITING_VENDORS').length,
    CONFIRMED: inquiries.filter(i => i.event?.status === 'CONFIRMED').length,
    NEEDS_COORDINATOR: inquiries.filter(i => i.event?.status === 'NEEDS_COORDINATOR').length,
    COMPLETED: inquiries.filter(i => i.event?.status === 'COMPLETED').length,
  };

  const assignmentStatusCounts = {
    PENDING: assignments.filter(a => a.status === 'PENDING').length,
    ACCEPTED: assignments.filter(a => a.status === 'ACCEPTED').length,
    DECLINED: assignments.filter(a => a.status === 'DECLINED').length,
  };

  // Vendor load distribution
  const vendorLoad = {};
  assignments.filter(a => a.status === 'ACCEPTED').forEach(a => {
    vendorLoad[a.vendorId] = (vendorLoad[a.vendorId] || 0) + 1;
  });

  const maxVal = Math.max(
    ...Object.values(statusCounts),
    ...Object.values(eventStatusCounts),
    ...Object.values(assignmentStatusCounts),
    ...Object.values(vendorLoad),
    1
  );

  const SimpleBarChart = ({ title, data, color = 'navy' }) => (
    <div className="card">
      <h4 className="font-semibold text-slate-800 mb-3">{title}</h4>
      <div className="space-y-2">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs w-32 text-slate-600 truncate">{key.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${
                  color === 'navy' ? 'bg-navy' :
                  color === 'green' ? 'bg-green' :
                  color === 'amber' ? 'bg-amber' :
                  color === 'rose' ? 'bg-rose' : 'bg-slate-600'
                }`}
                style={{ width: `${(val / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700 w-6 text-right">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const VendorLoadChart = () => (
    <div className="card">
      <h4 className="font-semibold text-slate-800 mb-3">Vendor Load Distribution</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {Object.entries(vendorLoad).map(([vendorId, load]) => {
          const vendor = vendors.find(v => v.id === parseInt(vendorId));
          return (
            <div key={vendorId} className="flex items-center gap-3">
              <span className="text-xs w-24 text-slate-600 truncate">{vendor?.companyName || 'Unknown'}</span>
              <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-full bg-navy/70 rounded transition-all duration-500"
                  style={{ width: `${(load / maxVal) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-700 w-6 text-right">{load}</span>
            </div>
          );
        })}
        {Object.keys(vendorLoad).length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">No active assignments</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SimpleBarChart title="Inquiries by Status" data={statusCounts} color="navy" />
      <SimpleBarChart title="Events by Status" data={eventStatusCounts} color="green" />
      <SimpleBarChart title="Assignments by Status" data={assignmentStatusCounts} color="amber" />
      <div className="md:col-span-2 lg:col-span-3">
        <VendorLoadChart />
      </div>
    </div>
  );
};

export default CoordinatorCharts;