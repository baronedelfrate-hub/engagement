import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        // Se a URL contiver type=invite (comum em convites), redirecione para configurar senha
        const hash = window.location.hash;
        if (hash && hash.includes('type=invite')) {
          navigate('/auth/set-password', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Erro no callback de auth:', error);
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Autenticando...</p>
      </div>
    </div>
  );
};

export default Callback;