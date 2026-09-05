import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Database, AlertTriangle, CheckCircle2, Play, RefreshCw, FileText, Server, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { seedFiscalMunicipios } from '@/lib/seed_fiscal_municipios_corrected';
import { runFiscalMunicipiosTests } from '@/lib/test_fiscal_municipios';

export default function FiscalMunicipiosSetup() {
  const { toast } = useToast();
  
  const [stats, setStats] = useState({ total: 0, duplicates: 0, loading: true });
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);
  const [seedMessage, setSeedMessage] = useState('');
  
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const { count: total, error } = await supabase
        .from('fiscal_municipios_ibge')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      setStats({ total: total || 0, duplicates: 0, loading: false }); // Duplicates handled by unique constraint now
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao carregar status da tabela', variant: 'destructive' });
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedProgress(0);
    setSeedMessage('Iniciando sincronização com IBGE...');
    setTestResults(null);

    try {
      const result = await seedFiscalMunicipios((progress) => {
        setSeedProgress(progress.progress);
        setSeedMessage(progress.message);
      });

      if (result.success) {
        toast({ title: 'Sincronização Concluída', description: `Inseridos/Atualizados ${result.successCount} registros.` });
        loadStats();
      } else {
        toast({ title: 'Erro na Sincronização', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro Fatal', description: err.message, variant: 'destructive' });
    } finally {
      setSeeding(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await runFiscalMunicipiosTests();
    setTestResults(result);
    setTesting(false);
    
    if (result.success) {
      toast({ title: 'Validação Concluída', description: 'Todos os testes de integridade passaram.' });
    } else {
      toast({ title: 'Atenção', description: 'Alguns testes falharam. Verifique os resultados.', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Helmet><title>Setup Municípios Fiscais | ERP Platform</title></Helmet>
      
      <PageHeader 
        title="Setup e Validação: Municípios Fiscais"
        description="Gerencie a tabela fiscal_municipios_ibge. Sincronize com a API oficial do IBGE e garanta a integridade dos dados."
        icon={Database}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" /> Status do Banco
            </CardTitle>
            <CardDescription>Resumo atual da tabela</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1 p-4 bg-muted rounded-lg border">
              <span className="text-sm text-muted-foreground font-medium">Total de Municípios</span>
              {stats.loading ? (
                <div className="h-8 flex items-center"><RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" /></div>
              ) : (
                <span className="text-3xl font-bold text-foreground">{stats.total}</span>
              )}
            </div>
            
            <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
              <p>O Brasil possui oficialmente 5.570 municípios. O número total deve ser próximo a este valor.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={loadStats} disabled={stats.loading}>
              <RefreshCw className={cn("w-4 h-4 mr-2", stats.loading && "animate-spin")} />
              Atualizar Status
            </Button>
          </CardFooter>
        </Card>

        {/* Action Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-600" /> Operações
            </CardTitle>
            <CardDescription>Execute a carga de dados ou testes de integridade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-foreground">Sincronizar com API do IBGE</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Baixa a lista completa oficial do IBGE e atualiza a base de dados em lotes (UPSERT).
                    Corrige nomes e garante que todos os municípios existam.
                  </p>
                </div>
                <Button onClick={handleSeed} disabled={seeding} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                  {seeding ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                  {seeding ? 'Processando...' : 'Iniciar Sincronização'}
                </Button>
              </div>

              {seeding && (
                <div className="space-y-2 mt-4 p-4 bg-card border rounded">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">{seedMessage}</span>
                    <span className="text-blue-600">{seedProgress}%</span>
                  </div>
                  <Progress value={seedProgress} className="h-2" />
                </div>
              )}
            </div>

            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-foreground">Executar Validações</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Roda scripts de teste para verificar integridade referencial, constraints e completude dos dados.
                  </p>
                </div>
                <Button variant="outline" onClick={handleTest} disabled={testing || seeding}>
                  {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />}
                  Validar Integridade
                </Button>
              </div>

              {testResults && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                  <div className={cn("p-3 font-semibold text-white", testResults.success ? "bg-emerald-600" : "bg-red-600")}>
                    Resultados da Validação: {testResults.passed} Passaram / {testResults.failed} Falharam
                  </div>
                  <ul className="divide-y bg-card">
                    {testResults.results.map((r, i) => (
                      <li key={i} className="p-3 flex items-start gap-3">
                        {r.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-foreground text-sm">{r.name}</p>
                          {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}