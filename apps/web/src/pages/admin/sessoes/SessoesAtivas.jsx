import React from 'react';
import { Helmet } from 'react-helmet';
import { LogOut, ShieldAlert } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

function SessoesAtivas() {
  const { toast } = useToast();

  // Mock sessions
  const sessions = [
      { id: 1, user: 'admin@erppro.com', ip: '192.168.1.10', device: 'Chrome / Windows', start: new Date().toISOString() },
      { id: 2, user: 'financeiro@erppro.com', ip: '10.0.0.5', device: 'Safari / macOS', start: new Date(Date.now() - 3600000).toISOString() },
      { id: 3, user: 'vendas@erppro.com', ip: '192.168.1.22', device: 'Firefox / Linux', start: new Date(Date.now() - 7200000).toISOString() },
  ];

  const terminate = (id) => {
      toast({ title: "Sessão Encerrada", description: "O usuário foi desconectado forçadamente." });
  };

  return (
    <>
      <Helmet>
        <title>Sessões Ativas - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Sessões Ativas"
        description="Monitore quem está conectado agora"
      />

      <div className="grid gap-4">
          {sessions.map(session => (
              <Card key={session.id}>
                  <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                              <ShieldAlert className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                              <p className="font-medium text-foreground">{session.user}</p>
                              <p className="text-sm text-muted-foreground">{session.device} • {session.ip}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                           <p className="text-xs text-muted-foreground hidden md:block">Iniciado em: {new Date(session.start).toLocaleString()}</p>
                           <Button variant="destructive" size="sm" onClick={() => terminate(session.id)} className="gap-2">
                               <LogOut className="h-3 w-3" /> Encerrar
                           </Button>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>
    </>
  );
}

export default SessoesAtivas;