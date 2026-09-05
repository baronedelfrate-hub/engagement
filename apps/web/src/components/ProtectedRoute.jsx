import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se não estiver logado e NÃO estiver na página de login, redireciona.
  // A verificação location.pathname === '/login' previne loops infinitos de redirecionamento.
  if (!user) {
    if (location.pathname === '/login') {
      return children;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};