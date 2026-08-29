import React from 'react';

const Button = ({ children, variant = 'primary', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer';
  const variantClasses = {
    primary: 'bg-navy text-white hover:bg-navy/90',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    success: 'bg-green text-white hover:bg-green/90',
    danger: 'bg-rose text-white hover:bg-rose/90',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
      {children}
    </button>
  );
};

export default Button;