import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';

const CATEGORIES = ['av', 'catering', 'security', 'cleaning', 'photography', 'music'];

export default function AvailabilityGrid() {
  const [category, setCategory] = useState('av');
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State for the click popup/modal
  const [selectedCell, setSelectedCell] = useState(null); 
  const [assignEventId, setAssignEventId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchGrid();
  }, [category]);

  const fetchGrid = async () => {
    setLoading(true);
    setError('');
    try {
      // Matches your axios baseURL /api/v1
      const res = await api.get(`/vendors/availability-grid?category=${category}&daysAhead=30`);
      setGridData(res.data);
    } catch (err) {
      setError('Failed to load availability grid.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Color mapping based on backend status
  const getCellColor = (status) => {
    if (status === 'FREE') return 'bg-green-100 hover:bg-green-200 border-green-300 cursor-pointer';
    if (status === 'PENDING') return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300 cursor-pointer';
    if (status === 'BOOKED') return 'bg-red-100 hover:bg-red-200 border-red-300 cursor-pointer';
    return 'bg-gray-100 border-gray-200';
  };

  const handleCellClick = (vendor, day) => {
    setSelectedCell({ vendor, day });
  };

  const closeModal = () => {
    setSelectedCell(null);
    setAssignEventId('');
  };

  const handleAssign = async () => {
    if (!assignEventId) return alert("Please enter an Event ID");
    setAssigning(true);
    
    try {
      // Calls the manual assign endpoint
      await api.post(`/assignments/event/${assignEventId}/manual`, {
        category: category,
        vendorId: selectedCell.vendor.vendorId
      });
      alert(`Successfully assigned ${selectedCell.vendor.companyName} to Event #${assignEventId}`);
      closeModal();
      fetchGrid(); // Refresh the grid to show the new yellow cell
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Layout title="Availability Grid">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
          <div>
            <h2 className="text-lg font-medium text-gray-800">Vendor Availability</h2>
            <p className="text-sm text-gray-500">Next 30 days</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden md:flex space-x-4 text-xs font-medium">
              <div className="flex items-center"><div className="w-3 h-3 bg-green-300 mr-1 rounded-sm"></div> Free</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-yellow-300 mr-1 rounded-sm"></div> Pending</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-red-300 mr-1 rounded-sm"></div> Booked</div>
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-medium text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 bg-white rounded-xl shadow">Loading grid...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 bg-white rounded-xl shadow">{error}</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px] border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Vendor
                    </th>
                    {gridData?.vendors[0]?.days.map((day) => (
                      <th key={day.date} className="px-2 py-3 text-center text-xs font-medium text-gray-500 border-r min-w-[50px]">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {gridData?.vendors.length === 0 ? (
                    <tr>
                      <td colSpan="31" className="px-4 py-8 text-center text-gray-500">
                        No active vendors found for this category.
                      </td>
                    </tr>
                  ) : (
                    gridData?.vendors.map((vendor) => (
                      <tr key={vendor.vendorId} className="hover:bg-gray-50">
                        <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-gray-800 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {vendor.companyName}
                        </td>
                        {vendor.days.map((day) => (
                          <td 
                            key={day.date} 
                            onClick={() => handleCellClick(vendor, day)}
                            className={`p-1 border-r text-center transition ${getCellColor(day.status)}`}
                          >
                            <div className="w-full h-8"></div>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-2">Cell Details</h3>
            <div className="mb-4 text-sm text-gray-600 space-y-1">
              <p><strong>Vendor:</strong> {selectedCell.vendor.companyName}</p>
              <p><strong>Date:</strong> {new Date(selectedCell.day.date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                  selectedCell.day.status === 'FREE' ? 'bg-green-100 text-green-700' :
                  selectedCell.day.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {selectedCell.day.status}
                </span>
              </p>
              
              {selectedCell.day.status !== 'FREE' && (
                <div className="mt-4 p-3 bg-gray-50 rounded border">
                  <p><strong>Blocked By:</strong> {selectedCell.day.eventName || 'Manual Block'}</p>
                  {selectedCell.day.eventId && <p><strong>Event ID:</strong> {selectedCell.day.eventId}</p>}
                </div>
              )}
            </div>

            {/* Inline Assign Action */}
            {selectedCell.day.status === 'FREE' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Event (Enter Event ID)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={assignEventId}
                    onChange={(e) => setAssignEventId(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={handleAssign}
                    disabled={assigning}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
                  >
                    {assigning ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-800 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}