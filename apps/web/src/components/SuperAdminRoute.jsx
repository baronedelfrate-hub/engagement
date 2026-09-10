import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export const SuperAdminRoute = ({ children }) => {
  const { isSuperAdmin, loading, user } = useAuthContext();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user && !isSuperAdmin) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para acessar esta área.",
      });
    }
  }, [loading, isSuperAdmin, user, toast]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};