import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../store/AppContext';
import StatusBadge from '../components/StatusBadge';

export default function VendorDashboard() {
  const { user } = useAuth();
  const { state, dispatch } = useApp();
  
  const { assignments = [], vendors = [] } = state;
  
  // Find the vendor profile linked to the logged-in user
  // In your mock data, vendor1's user ID is 2, and their vendor ID is 1
  const vendorProfile = vendors.find(v => v.userId === user?.id) || vendors.find(v => v.companyName === user?.fullName);
  const myVendorId = vendorProfile?.id;

  // Filter assignments belonging to this vendor
  const myAssignments = assignments.filter(a => a.vendorId === myVendorId);
  
  // Filter out assignments that are already accepted or declined for the "Pending" view
  const pendingAssignments = myAssignments.filter(a => a.status === 'PENDING');

  const handleRespond = (assignmentId, status) => {
    dispatch({
      type: 'RESPOND_TO_ASSIGNMENT',
      payload: { 
        assignmentId, 
        status, 
        declineReason: status === 'DECLINED' ? 'Not available' : null 
      }
    });
  };

  return (
    <Layout title="Vendor Dashboard">
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome, {user?.fullName || user?.username || 'Vendor'}
            </h1>
            <p className="text-gray-600 mt-1">
              Review and respond to your event assignments.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-indigo-500">
            <h4 className="text-sm font-medium text-gray-700">Total Assignments</h4>
            <p className="text-3xl font-bold text-gray-800 mt-2">{myAssignments.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
            <h4 className="text-sm font-medium text-gray-700">Pending Action</h4>
            <p className="text-3xl font-bold text-gray-800 mt-2">{pendingAssignments.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
            <h4 className="text-sm font-medium text-gray-700">Accepted</h4>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {myAssignments.filter(a => a.status === 'ACCEPTED').length}
            </p>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-800">My Assignments</h3>
          </div>
          
          {myAssignments.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-800">No assignments yet</h3>
              <p className="text-sm text-gray-500 mt-1">
                When the coordinator assigns services to you, they will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {myAssignments.map((assignment) => (
                <div key={assignment.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">{assignment.eventName}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-500 capitalize">Service: {assignment.serviceCategory}</p>
                      <StatusBadge status={assignment.status} />
                    </div>
                  </div>
                  
                  {/* Actions for pending assignments */}
                  {assignment.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(assignment.id, 'ACCEPTED')}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(assignment.id, 'DECLINED')}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  
                  {/* Display message if already responded */}
                  {assignment.status === 'ACCEPTED' && (
                    <span className="text-sm text-green-600 font-medium">✓ You accepted this</span>
                  )}
                  {assignment.status === 'DECLINED' && (
                    <span className="text-sm text-red-500 font-medium">✕ You declined this</span>
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