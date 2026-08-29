import React from 'react';
import { useApp } from '../../store/AppContext';
import PageHeader from '../../components/PageHeader';
import VendorProfileCard from '../../components/VendorProfileCard';

const AllVendors = () => {
  const { state } = useApp();
  const { vendors, assignments } = state;

  return (
    <div className="page-enter">
      <PageHeader title="All Vendors" subtitle={`${vendors.length} service providers available for event assignments.`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map(v => (
          <VendorProfileCard key={v.id} vendor={v} assignments={assignments} />
        ))}
      </div>
    </div>
  );
};

export default AllVendors;