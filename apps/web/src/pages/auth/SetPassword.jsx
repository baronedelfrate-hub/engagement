import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import EngagementLogo from '@/components/EngagementLogo';

const SetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'A senha é obrigatória.';
    } else if (password.length < 8) {
      newErrors.password = 'A senha deve ter no mínimo 8 caracteres.';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: "Senha configurada com sucesso!",
        description: "Sua conta está pronta para uso.",
      });
      
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro ao configurar senha:', error);
      toast({
        variant: "destructive",
        title: "Erro ao configurar senha",
        description: error.message || "Ocorreu um erro ao definir sua senha. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Helmet>
        <title>Configurar Senha | ERP Platform</title>
      </Helmet>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <EngagementLogo height={60} />
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader className="space-y-1 pb-6 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo(a)!</CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure sua senha para acessar sua nova conta
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className={`pl-10 text-foreground bg-background ${errors.password ? 'border-destructive' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: null });
                    }}
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm font-medium text-destructive flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className={`pl-10 text-foreground bg-background ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                    }}
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm font-medium text-destructive flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col pt-2 pb-6">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Salvando...' : 'Salvar Senha e Entrar'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SetPassword;