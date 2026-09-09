import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Database, Search, CheckCircle2, AlertCircle, RefreshCw, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import { 
  runMunicipiosMigration, 
  verifyMunicipiosMigration, 
  searchMunicipios 
} from '@/lib/municipios_migration';

export default function MunicipiosMigration() {
  const { toast } = useToast();
  
  // Status states
  const [stats, setStats] = useState({ total: 0, byState: {} });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Migration states
  const [isMigrating, setIsMigrating] = useState(false);
  const [progressData, setProgressData] = useState({ progress: 0, message: '', status: 'idle' });
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    const result = await verifyMunicipiosMigration();
    if (result.success) {
      setStats({ total: result.total, byState: result.byState || {} });
    } else {
      toast({
        title: "Erro ao carregar estatísticas",
        description: result.error,
        variant: "destructive"
      });
    }
    setIsLoadingStats(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setProgressData({ progress: 0, message: 'Iniciando...', status: 'running' });
    
    const result = await runMunicipiosMigration((progressInfo) => {
      setProgressData(progressInfo);
    });

    if (result.success) {
      toast({
        title: "Migração Concluída",
        description: `${result.inserted} novos municípios foram inseridos.`,
      });
      fetchStats(); // Refresh stats after completion
    } else {
      toast({
        title: "Falha na Migração",
        description: result.error,
        variant: "destructive"
      });
      setProgressData(prev => ({ ...prev, status: 'error' }));
    }
    setIsMigrating(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    const result = await searchMunicipios(searchTerm);
    if (result.success) {
      setSearchResults(result.data);
    } else {
      toast({
        title: "Erro na busca",
        description: result.error,
        variant: "destructive"
      });
    }
    setIsSearching(false);
  };

  const isFullDataset = stats.total >= 5568; // IBGE usually lists ~5570

  return (
    <div className="space-y-6 pb-10">
      <PageHeader 
        title="Migração de Municípios (IBGE)" 
        description="Ferramenta administrativa para popular o banco de dados com todos os municípios brasileiros."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* MIGRATION CONTROL CARD */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Sincronização de Dados
            </CardTitle>
            <CardDescription>
              Busca dados diretamente da API oficial do IBGE e insere na tabela <code>municipios</code>.
              Municípios já existentes serão ignorados para evitar duplicidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Status Alert */}
            <div className={`p-4 rounded-lg flex items-start gap-3 border ${isFullDataset ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'}`}>
              {isFullDataset ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${isFullDataset ? 'text-emerald-900 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-400'}`}>
                  {isFullDataset ? 'Base de Dados Completa' : 'Ação Recomendada'}
                </h4>
                <p className={`text-sm mt-1 ${isFullDataset ? 'text-emerald-700 dark:text-emerald-500' : 'text-amber-700 dark:text-amber-500'}`}>
                  {isFullDataset 
                    ? `A tabela possui ${stats.total} registros, o que indica que a carga do IBGE está completa.`
                    : `A tabela possui apenas ${stats.total} registros de aproximadamente 5.570. Execute a migração para popular a base.`
                  }
                </p>
              </div>
            </div>

            {/* Migration Controls */}
            <div className="space-y-4">
              <Button 
                onClick={handleRunMigration} 
                disabled={isMigrating}
                className="w-full sm:w-auto"
              >
                {isMigrating ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Executar Migração Completa</>
                )}
              </Button>

              {isMigrating && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{progressData.message}</span>
                    <span className="font-medium">{progressData.progress}%</span>
                  </div>
                  <Progress value={progressData.progress} className="h-2" />
                </div>
              )}
            </div>

            {/* Test Search */}
            <div className="pt-6 border-t mt-6">
              <h3 className="font-medium mb-4">Teste de Busca</h3>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar cidade..." 
                    className="pl-9 bg-background text-foreground"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={isSearching}>
                  Buscar
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-4 border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>UF</TableHead>
                        <TableHead>Cód. IBGE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.nome}</TableCell>
                          <TableCell><Badge variant="outline">{m.uf}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{m.codigo_ibge}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* STATS CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Estatísticas
              <Button variant="ghost" size="icon" onClick={fetchStats} disabled={isLoadingStats}>
                <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-3xl font-bold text-primary">{isLoadingStats ? '-' : stats.total}</div>
              <div className="text-sm text-muted-foreground mt-1">Total de Municípios</div>
            </div>

            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(stats.byState).sort((a,b) => b[1] - a[1]).map(([uf, count]) => (
                <div key={uf} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                  <span className="font-medium text-muted-foreground">{uf}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {!isLoadingStats && Object.keys(stats.byState).length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum registro encontrado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}