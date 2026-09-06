import React from 'react';

const colorMap = {
  navy: 'bg-navy/10 text-navy',
  green: 'bg-green/10 text-green',
  amber: 'bg-amber/10 text-amber',
  rose: 'bg-rose/10 text-rose',
};

const StatCard = ({ label, value, icon, color = 'navy' }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
      </div>
      <div className={`p-3 rounded-xl ${colorMap[color] || colorMap.navy}`}>
        {icon}
      </div>
    </div>
  </div>
);

export default StatCard;