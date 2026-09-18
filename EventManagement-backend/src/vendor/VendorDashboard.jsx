import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function VendorDashboard() {
  const { user } = useAuth();
  const displayName = user?.name || user?.username || 'Vendor';

  return (
    <Layout title="Vendor Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {displayName}</h1>
          <p className="text-gray-600 mt-1">
            Review and respond to your event assignments from here.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-10 text-center">
          <h3 className="text-lg font-semibold text-gray-800">No assignments yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            When the coordinator assigns services to you, your assignments will appear here.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h4 className="text-sm font-medium text-gray-700">Assignment Status</h4>
            <p className="text-2xl font-bold text-gray-800 mt-2">—</p>
            <p className="text-sm text-gray-500">
              Pending / accepted / declined responses will be tracked here.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h4 className="text-sm font-medium text-gray-700">Upcoming Events</h4>
            <p className="text-2xl font-bold text-gray-800 mt-2">—</p>
            <p className="text-sm text-gray-500">
              Your assigned events and schedules will show up here.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}