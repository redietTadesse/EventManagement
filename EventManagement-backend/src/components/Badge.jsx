import React from 'react';

const Badge = ({ children, variant = 'gray' }) => {
  const variantClasses = {
    navy: 'badge-navy',
    ice: 'badge-ice',
    amber: 'badge-amber',
    green: 'badge-green',
    rose: 'badge-rose',
    gray: 'badge-gray',
  };

  return (
    <span className={`badge ${variantClasses[variant] || variantClasses.gray}`}>
      {children}
    </span>
  );
};

export default Badge;