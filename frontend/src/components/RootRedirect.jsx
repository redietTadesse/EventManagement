import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';  // ← UPDATED

const ROLE_DASHBOARDS = {
  CLIENT: '/client/dashboard',
  VENDOR: '/vendor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
};

export default function RootRedirect() {
  const { state } = useApp();
  const currentUser = state?.currentUser;

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  const path = ROLE_DASHBOARDS[currentUser.role] || '/';
  return <Navigate to={path} replace />;
}