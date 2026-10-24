import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', fullWidth = false, ...props }) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md active:bg-indigo-800',
    outline:
      'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow-sm active:bg-gray-100',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow-md active:bg-emerald-800',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow-md active:bg-rose-800',
    ghost:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg h-9 px-3',
  };

  const sizeClasses = {
    sm: 'h-9 rounded-lg px-3 text-sm',
    md: 'h-11 rounded-xl px-5 text-sm',
    lg: 'h-12 rounded-xl px-6 text-base',
  };

  const className = fullWidth ? 'w-full' : '';
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;