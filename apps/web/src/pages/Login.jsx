import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2, Mail, Lock, AlertCircle, Info, RefreshCw,
  ShieldCheck, TrendingUp, FileSpreadsheet, Users2
} from 'lucide-react';
import EngagementLogo from '@/components/EngagementLogo';
import { clearAuthStorage } from '@/lib/sessionCleanup';

const highlights = [
  { icon: TrendingUp, text: 'Gestão financeira completa em um único lugar' },
  { icon: FileSpreadsheet, text: 'Fiscal, contábil e controladoria integrados' },
  { icon: Users2, text: 'CRM, vendas e operação conectados ao financeiro' },
  { icon: ShieldCheck, text: 'Acesso seguro e controlado por perfil' },
];

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);

  // Clear any potentially corrupted session state on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
         // If they have a valid session, why are they here? Let's verify it.
         const { error } = await supabase.auth.getUser();
         if (error) {
            clearAuthStorage();
         } else {
            navigate('/');
         }
      }
    };
    checkExistingSession();
  }, [navigate]);

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = 'O e-mail é obrigatório.';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Digite um e-mail válido.';
    }

    if (!password) {
      newErrors.password = 'A senha é obrigatória.';
    } else if (password.length < 6) {
      newErrors.password = 'A senha deve ter no mínimo 6 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getTranslatedError = (errorMsg) => {
    const lowerMsg = errorMsg.toLowerCase();
    if (lowerMsg.includes('invalid login credentials')) return 'Credenciais inválidas. Verifique seu e-mail e senha.';
    if (lowerMsg.includes('user not found')) return 'Usuário não encontrado.';
    if (lowerMsg.includes('email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.';
    if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) return 'Erro de conexão. Verifique sua internet.';
    if (lowerMsg.includes('banned')) return 'Usuário desativado ou banido. Contate o administrador.';
    if (lowerMsg.includes('refresh token')) return 'Sua sessão expirou e não pôde ser renovada. Por favor, faça login novamente.';
    return 'Ocorreu um erro ao tentar fazer login. Tente novamente.';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setGlobalError(null);
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // If it's a session issue, clear storage to prevent stuck states
        if (error.message.toLowerCase().includes('session') || error.message.toLowerCase().includes('token')) {
           clearAuthStorage();
        }
        throw error;
      }

      if (data?.session) {
        // Ensure session is saved before redirect (Supabase client usually handles this, but we await to be safe)
        await supabase.auth.setSession(data.session);
        
        const from = location.state?.from?.pathname || "/";
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      const translatedMsg = getTranslatedError(error.message);
      setGlobalError(translatedMsg);
      toast({
        variant: "destructive",
        title: "Falha na autenticação",
        description: translatedMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setGlobalError(null);
    setPassword('');
    clearAuthStorage();
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Helmet>
        <title>Login | Engagement Soluções</title>
        <meta name="description" content="Faça login para acessar a plataforma de gestão Engagement Soluções." />
      </Helmet>

      {/* Painel institucional (visível a partir de md) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] brand-gradient relative overflow-hidden flex-col justify-between p-12" style={{ color: '#fff' }}>
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[hsl(var(--brand-orange))]/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <div className="bg-white/95 rounded-xl inline-block p-3 shadow-lg">
            <EngagementLogo height={44} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 max-w-md"
        >
          <div className="h-1 w-14 rounded-full mb-6" style={{ background: 'hsl(var(--brand-orange))' }} />
          <h2 className="text-3xl font-bold tracking-tight leading-tight mb-4">
            Plataforma de gestão da Engagement Soluções
          </h2>
          <p className="text-white/70 mb-10">
            BPO E5 · Consultoria F5 · Engagement Academy · System
          </p>

          <ul className="space-y-4">
            {highlights.map((item, index) => (
              <motion.li
                key={item.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3 text-sm text-white/90"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.text}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 text-xs text-white/50"
        >
          &copy; {new Date().getFullYear()} Engagement Soluções. Todos os direitos reservados.
        </motion.p>
      </div>

      {/* Painel do formulário */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="flex md:hidden justify-center mb-8">
            <EngagementLogo height={56} />
          </div>

          <Card className="border-border shadow-xl md:shadow-2xl md:border-transparent">
            <CardHeader className="space-y-1 pb-6 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo de volta</CardTitle>
              <CardDescription className="text-muted-foreground">
                Insira suas credenciais para acessar sua conta
              </CardDescription>
            </CardHeader>
          
          {globalError && (
             <div className="px-6 pb-2">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md flex items-start gap-2 text-sm">
                   <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                   <div className="flex-1">
                      <p className="font-medium">{globalError}</p>
                   </div>
                </div>
             </div>
          )}

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>E-mail</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nome@empresa.com"
                    className={`pl-10 text-foreground bg-background ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: null });
                      if (globalError) setGlobalError(null);
                    }}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm font-medium text-destructive flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>Senha</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    className={`pl-10 text-foreground bg-background ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: null });
                      if (globalError) setGlobalError(null);
                    }}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm font-medium text-destructive flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col pt-2 pb-6 space-y-4">
              {globalError ? (
                 <Button 
                   type="button" 
                   onClick={handleRetry}
                   className="w-full gap-2" 
                   variant="outline"
                 >
                   <RefreshCw className="h-4 w-4" />
                   Limpar e Tentar Novamente
                 </Button>
              ) : (
                 <Button 
                   type="submit" 
                   className="w-full" 
                   disabled={loading}
                 >
                   {loading ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Entrando...
                     </>
                   ) : (
                     'Entrar no Sistema'
                   )}
                 </Button>
              )}
              <div className="flex items-center justify-center text-sm text-muted-foreground w-full gap-2 p-3 bg-muted/50 rounded-md">
                <Info className="h-4 w-4" />
                <span>Acesso somente por convite. Entre em contato com seu gestor.</span>
              </div>
            </CardFooter>
          </form>
          </Card>

          <p className="md:hidden text-center text-sm text-muted-foreground mt-8">
            &copy; {new Date().getFullYear()} Engagement Soluções. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;