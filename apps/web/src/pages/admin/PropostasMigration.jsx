import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Database, AlertTriangle, CheckCircle2, Play, Activity, RefreshCw } from 'lucide-react';
import { migrationService } from '@/lib/propostas_migration';

const VALID_STATUSES = ['LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'];

const PropostasMigration = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState(null);
  const [hasConstraint, setHasConstraint] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message, type }]);
  };

  const loadData = async () => {
    setLoading(true);
    addLog('Analisando dados atuais na tabela propostas...');
    
    const [statsRes, constraintRes] = await Promise.all([
      migrationService.getPropostasStats(),
      migrationService.verifyConstraint()
    ]);

    if (statsRes.success) {
      setStats(statsRes.stats);
      addLog(`Encontrados ${statsRes.stats.total} registros. ${statsRes.stats.invalid} inválidos.`);
    } else {
      addLog(`Erro ao carregar dados: ${statsRes.error}`, 'error');
    }

    if (constraintRes.success) {
      setHasConstraint(constraintRes.hasConstraint);
      addLog(constraintRes.hasConstraint 
        ? 'A constraint CHECK já está aplicada na tabela.' 
        : 'A constraint CHECK NÃO está aplicada. A tabela permite valores inválidos.', 
        constraintRes.hasConstraint ? 'success' : 'warning');
    } else {
      addLog(`Erro ao verificar constraint: ${constraintRes.error}`, 'error');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMigration = async () => {
    if (!window.confirm("Esta ação irá alterar os dados na tabela 'propostas' e aplicar uma constraint. Deseja continuar?")) {
      return;
    }

    setMigrating(true);
    addLog('Iniciando migração de dados e criação de constraint...', 'info');

    const result = await migrationService.runMigration();

    if (result.success) {
      addLog(result.message || `Migração concluída com sucesso. Linhas atualizadas: ${result.rowsUpdated}`, 'success');
      toast({ title: 'Sucesso', description: 'Migração concluída.' });
      
      // Reload stats after migration
      await loadData();
    } else {
      addLog(`Falha na migração: ${result.error || result.message}`, 'error');
      toast({ title: 'Erro', description: 'Falha na migração.', variant: 'destructive' });
    }

    setMigrating(false);
  };

  return (
    <div className="space-y-6">
      <Helmet><title>Migração de Propostas | Admin</title></Helmet>
      
      <PageHeader 
        title="Limpeza de Banco de Dados" 
        description="Utilitário para padronização de status das propostas e aplicação de constraints."
        icon={Database}
        action={
          <Button variant="outline" onClick={loadData} disabled={loading || migrating} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar Status
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Análise da Tabela `propostas`
            </CardTitle>
            <CardDescription>Resumo dos valores atuais do campo status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Carregando dados...</div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted p-4 rounded-lg border border-border">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Total de Linhas</div>
                    <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <div className="text-sm font-medium text-emerald-600 mb-1">Status Válidos</div>
                    <div className="text-2xl font-bold text-emerald-700">{stats.valid}</div>
                  </div>
                  <div className={`p-4 rounded-lg border ${stats.invalid > 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900' : 'bg-muted border-border'}`}>
                    <div className={`text-sm font-medium mb-1 ${stats.invalid > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>Status Inválidos</div>
                    <div className={`text-2xl font-bold ${stats.invalid > 0 ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>{stats.invalid}</div>
                  </div>
                </div>

                {stats.invalid > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Valores Inválidos Encontrados</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p className="mb-2">Os seguintes valores não são permitidos pela constraint e precisam ser corrigidos:</p>
                      <div className="flex flex-wrap gap-2">
                        {stats.invalidValues.map((val, i) => (
                          <Badge key={i} variant="destructive">{String(val)}</Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Mapeamento que será aplicado:</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex gap-2 items-center"><Badge variant="outline">NULL</Badge> ➔ <Badge>LEAD</Badge></li>
                    <li className="flex gap-2 items-center"><Badge variant="outline">ENVIADO P/ FATURAMENTO</Badge> ➔ <Badge>ENVIADO_FATURAMENTO</Badge></li>
                    <li className="flex gap-2 items-center"><Badge variant="outline">NEGOCIAÇÃO</Badge> ➔ <Badge>NEGOCIACAO</Badge></li>
                    <li className="flex gap-2 items-center"><Badge variant="outline">Qualquer outro valor</Badge> ➔ <Badge>LEAD</Badge></li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-red-500">Erro ao carregar estatísticas.</div>
            )}
          </CardContent>
          <CardFooter className="bg-muted border-t flex justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Status da Constraint:</span>
              {hasConstraint ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1"/> Ativada</Badge>
              ) : (
                <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1"/> Ausente</Badge>
              )}
            </div>
            
            <Button 
              onClick={handleMigration} 
              disabled={loading || migrating || (stats?.invalid === 0 && hasConstraint)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {migrating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {migrating ? 'Executando...' : 'Executar Migração'}
            </Button>
          </CardFooter>
        </Card>

        {/* Execution Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Execução</CardTitle>
            <CardDescription>Acompanhe o andamento da operação</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-slate-950">
              {logs.length === 0 ? (
                <div className="text-slate-500 text-sm text-center py-4">Aguardando inicialização...</div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 font-mono text-xs">
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className={`
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'warning' ? 'text-amber-400' : ''}
                        ${log.type === 'info' ? 'text-blue-300' : ''}
                      `}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropostasMigration;