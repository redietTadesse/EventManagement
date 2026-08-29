import React from 'react';

const Layout = ({ children }) => (
  <div className="container mx-auto px-4 py-6 max-w-7xl page-enter">
    {children}
  </div>
);

export default Layout;