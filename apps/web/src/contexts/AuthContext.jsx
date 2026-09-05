import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { clearAuthStorage, recoverSession } from '@/lib/sessionCleanup';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companyIdSource, setCompanyIdSource] = useState(null);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, role, company_id')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.warn('Aviso ao buscar perfil:', error.message);
      }
      return data || null;
    } catch (e) {
      console.error('Erro de rede ao buscar perfil:', e.message);
      return null;
    }
  };

  const resolveCompanyId = async (currentUser, currentProfile) => {
    let resolvedId = null;
    let source = 'nenhuma';

    try {
      // 1. Prioridade: user_metadata
      if (currentUser?.user_metadata?.company_id) {
        resolvedId = currentUser.user_metadata.company_id;
        source = 'user_metadata';
      }

      // 2. Prioridade: profiles (tabela - via pre-fetch)
      if (!resolvedId && currentProfile?.company_id) {
        resolvedId = currentProfile.company_id;
        source = 'profiles (pre-fetched)';
      }

      // 3. Fallback robusto: Forçar query direta na tabela profiles
      if (!resolvedId && currentUser?.id) {
        console.log('[AuthContext] Fazendo query de fallback na tabela profiles para obter company_id...');
        const { data, error } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', currentUser.id)
          .single();
        
        if (!error && data?.company_id) {
          resolvedId = data.company_id;
          source = 'profiles (fallback query)';
        }
      }

      // 4. Prioridade: sessionStorage (Fallback local)
      if (!resolvedId) {
        const storageId = sessionStorage.getItem('company_id');
        if (storageId) {
          resolvedId = storageId;
          source = 'sessionStorage';
        }
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao tentar resolver company_id:', error);
    }

    // Logging & Persist
    if (resolvedId) {
      console.log(`[AuthContext] company_id recuperado com sucesso de [${source}]:`, resolvedId);
      sessionStorage.setItem('company_id', resolvedId);
      setCompanyId(resolvedId);
      setCompanyIdSource(source);
    } else {
      console.warn(`[AuthContext] Atenção: Usuário ${currentUser?.id} está logado, mas não possui uma empresa (company_id) associada em nenhuma fonte verificada.`);
      setCompanyId(null);
      setCompanyIdSource('nenhuma');
    }

    return resolvedId;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro durante o logout:", err);
    } finally {
      clearAuthStorage();
      sessionStorage.removeItem('company_id');
      setUser(null);
      setProfile(null);
      setCompanyId(null);
      setCompanyIdSource(null);
      setLoading(false);
    }
  };

  const validateSession = async () => {
    try {
      const recoveredUser = await recoverSession();
      if (!recoveredUser) {
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error validating session:', err);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const initializeAuth = async () => {
      try {
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            setError(new Error('A inicialização da autenticação excedeu o tempo limite.'));
            setLoading(false);
          }
        }, 10000);

        const isValid = await validateSession();
        
        if (isValid && mounted) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) throw sessionError;

          if (session?.user) {
            setUser(session.user);
            const p = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(p);
              await resolveCompanyId(session.user, p);
            }
          }
        }
      } catch (err) {
        console.error("Erro na inicialização da autenticação:", err);
        if (mounted) {
          setError(err);
          clearAuthStorage();
        }
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            const p = await fetchProfile(session.user.id);
            if (mounted) {
              setProfile(p);
              await resolveCompanyId(session.user, p);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthStorage();
          sessionStorage.removeItem('company_id');
          setUser(null);
          setProfile(null);
          setCompanyId(null);
          setCompanyIdSource(null);
        } else if (event === 'USER_DELETED' || event === 'TOKEN_REFRESH_FAILED') {
          await logout();
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const retryInitialization = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  const getCompanyId = () => companyId;

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    company_id: companyId,
    companyIdSource,
    getCompanyId,
    isSuperAdmin: profile?.role === 'superadmin',
    loading,
    error,
    logout,
    validateSession
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Erro de Autenticação</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Não foi possível conectar ao serviço de autenticação. {error.message}
        </p>
        <Button onClick={retryInitialization} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  return ctx;
};

export default AuthContext;