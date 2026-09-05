import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Database, Search, CheckCircle2, AlertCircle, RefreshCw, Play, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import { seedFiscalMunicipios } from '@/lib/seed_fiscal_municipios';
import { supabase } from '@/lib/customSupabaseClient';

export default function FiscalMunicipiosMigration() {
  const { toast } = useToast();
  
  const [stats, setStats] = useState({ total: 0, sample: [] });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [progressData, setProgressData] = useState({ progress: 0, message: '', status: 'idle' });
  
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const { count, error: countErr } = await supabase
        .from('fiscal_municipios_ibge')
        .select('*', { count: 'exact', head: true });

      if (countErr) throw countErr;

      const { data: sample, error: sampleErr } = await supabase
        .from('fiscal_municipios_ibge')
        .select('*')
        .limit(5);

      if (sampleErr) throw sampleErr;

      setStats({ total: count || 0, sample: sample || [] });
    } catch (err) {
      toast({
        title: "Erro ao ler tabela",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setProgressData({ progress: 0, message: 'Iniciando...', status: 'running' });
    
    const result = await seedFiscalMunicipios((progressInfo) => {
      setProgressData(progressInfo);
    });

    if (result.success) {
      toast({
        title: "Seed Completo",
        description: `${result.inserted} novos municípios fiscais inseridos na base.`,
      });
      fetchStats(); 
    } else {
      toast({
        title: "Falha",
        description: result.error,
        variant: "destructive"
      });
      setProgressData(prev => ({ ...prev, status: 'error' }));
    }
    setIsMigrating(false);
  };

  const isFullDataset = stats.total >= 5568; 

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Tabela Oficial IBGE (NFS-e)" 
        description="Ferramenta para popular a tabela fiscal_municipios_ibge com todos os ~5.570 municípios do Brasil. Essencial para emissão de notas fiscais."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* MIGRATION CARD */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Sincronização Fiscal (API IBGE)
            </CardTitle>
            <CardDescription>
              Esta rotina puxa a lista completa da API do IBGE e preenche a tabela <code>fiscal_municipios_ibge</code>, garantindo códigos de 7 dígitos precisos para a NFS-e.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className={`p-4 rounded-lg flex items-start gap-3 border ${isFullDataset ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20'}`}>
              {isFullDataset ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${isFullDataset ? 'text-emerald-900 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'}`}>
                  {isFullDataset ? 'Tabela Fiscal Completa!' : 'Ação Necessária'}
                </h4>
                <p className={`text-sm mt-1 ${isFullDataset ? 'text-emerald-700 dark:text-emerald-500' : 'text-amber-700 dark:text-amber-500'}`}>
                  {isFullDataset 
                    ? `O banco possui ${stats.total} registros IBGE validados. A emissão de NFS-e funcionará corretamente.`
                    : `Temos apenas ${stats.total} registros de 5.570. Por favor, clique abaixo para baixar a lista completa e evitar erros de emissão de NF.`
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={handleRunMigration} 
                disabled={isMigrating || isFullDataset}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isMigrating ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Inserindo IBGE...</>
                ) : (
                  <><Database className="mr-2 h-4 w-4" /> Rodar Seed IBGE</>
                )}
              </Button>

              {isMigrating && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{progressData.message}</span>
                    <span className="font-medium text-emerald-600">{progressData.progress}%</span>
                  </div>
                  <Progress value={progressData.progress} className="h-2 bg-muted" />
                </div>
              )}
            </div>

            {stats.sample.length > 0 && (
              <div className="pt-6 border-t mt-6">
                <h3 className="font-medium mb-4 text-sm text-muted-foreground">Amostra da Tabela</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Cód. IBGE</TableHead>
                        <TableHead>Município</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead>Formatado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.sample.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.codigo_ibge}</TableCell>
                          <TableCell className="font-medium">{m.nome_municipio}</TableCell>
                          <TableCell><Badge variant="outline">{m.uf}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{m.nome_formatado}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* STATS CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Estatísticas IBGE
              <Button variant="ghost" size="icon" onClick={fetchStats} disabled={isLoadingStats}>
                <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 text-center p-6 bg-muted rounded-xl border border-border">
              <div className="text-4xl font-bold text-foreground">{isLoadingStats ? '-' : stats.total}</div>
              <div className="text-sm font-medium text-muted-foreground mt-2 uppercase tracking-wider">Municípios Cadastrados</div>
              <div className="mt-2 text-xs text-muted-foreground">Total Brasil: ~5.570</div>
            </div>
            
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
               <p><strong>Nota Técnica:</strong> A emissão de NFS-e exige estritamente que a tabela contemple o código IBGE de 7 dígitos para evitar rejeições da prefeitura (ex: Erro E160 - Município de Incidência Inválido).</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}