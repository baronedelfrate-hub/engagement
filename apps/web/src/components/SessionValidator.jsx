import React from 'react';

// Simplified hook to provide a consistent API without causing side effects
export const useSessionValidator = () => {
  return { isValidating: false, isValid: true };
};

// Simplified component to prevent infinite redirect loops.
// Session validation and redirects are now strictly handled by AuthContext (initialization) 
// and ProtectedRoute (route guarding), eliminating race conditions that caused loops.
export const SessionValidator = ({ children }) => {
  return <>{children}</>;
};