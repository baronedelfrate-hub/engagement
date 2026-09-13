import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

const AssinaturaBloqueada = () => {
  const { logout, subscriptionStatus } = useAuthContext();

  const mensagem = subscriptionStatus === 'cancelada'
    ? 'A assinatura da sua empresa foi cancelada.'
    : 'A assinatura da sua empresa está com pagamento pendente.';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <Helmet><title>Acesso Suspenso | ERP Platform</title></Helmet>
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Suspenso</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        {mensagem} Entre em contato com o administrador da plataforma para regularizar e voltar a usar o sistema.
      </p>
      <Button onClick={logout} variant="outline" className="gap-2">
        <LogOut className="h-4 w-4" /> Sair
      </Button>
    </div>
  );
};

export default AssinaturaBloqueada;
