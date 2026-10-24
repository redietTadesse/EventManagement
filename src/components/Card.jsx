import React from 'react';

const Card = ({ children, className = '', hoverable = false, ...props }) => {
  const baseClasses =
    'bg-white rounded-2xl border border-gray-100 shadow-sm';

  const hoverClasses = hoverable
    ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200'
    : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;