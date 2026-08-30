import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);

  return (
    <AppContext.Provider value={{ token, setToken, role, setRole }}>
      {children}
    </AppContext.Provider>
  );
};