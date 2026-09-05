import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectos } from '@/hooks/useProjectos';
import ProjetosTable from './ProjetosTable';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertCircle, FolderOpen, Code } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveCompanyId } from '@/lib/companyUtils';

export default function ProjetosPage() {
  const navigate = useNavigate();
  const { projetos, loading, error, refetch, deleteProjeto } = useProjectos();
  const [currentCompanyId, setCurrentCompanyId] = useState(null);
  const [debugLog, setDebugLog] = useState([]);

  const addDebugLog = (msg, data = null) => {
      setDebugLog(prev => [...prev, { time: new Date().toISOString(), msg, data }]);
  };

  const loadProjects = useCallback(async () => {
    addDebugLog("Iniciando loadProjects...");
    const cid = await resolveCompanyId(null);
    setCurrentCompanyId(cid);
    
    if (cid) {
      addDebugLog(`Chamando refetch(companyId: ${cid})`);
      const results = await refetch(cid);
      addDebugLog(`Dados recebidos do hook`, results);
    } else {
      addDebugLog("⚠️ Nenhum company_id resolvido. Chamando refetch() genérico (fallback)");
      await refetch(null);
    }
  }, [refetch]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const refreshProjects = () => {
    console.log("🔄 Atualizando lista de projetos manualmente...");
    loadProjects();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader title="Projetos" description="Gerencie os projetos da sua empresa" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshProjects} disabled={loading} title="Recarregar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/projetos/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {window.location.hostname === 'localhost' && (
          <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="py-3 flex flex-row items-center gap-2">
                  <Code className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-sm font-mono text-emerald-400">Console de Debug Rápido (ProjetosPage)</CardTitle>
              </CardHeader>
              <CardContent className="py-3 h-48 overflow-y-auto">
                  <div className="space-y-2">
                      <div className="text-xs text-slate-400 border-b border-slate-700 pb-2 mb-2">
                          <div><strong>Company ID Atual:</strong> {currentCompanyId || 'NENHUM (Fallback Ativo)'}</div>
                          <div><strong>LocalStorage:</strong> {localStorage.getItem('company_id')}</div>
                          <div><strong>Total Projetos em Memória:</strong> {projetos?.length}</div>
                      </div>
                      {debugLog.map((log, i) => (
                          <div key={i} className="text-xs font-mono text-slate-300">
                              <span className="text-slate-500">[{log.time.split('T')[1].substring(0,8)}]</span> {log.msg}
                              {log.data && <pre className="ml-4 mt-1 text-slate-400">{JSON.stringify(log.data, null, 2)}</pre>}
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar projetos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !projetos.length ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !loading && projetos.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-slate-50 dark:bg-slate-900/50">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <FolderOpen className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Nenhum projeto encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mb-4">
            Você ainda não possui nenhum projeto cadastrado ou não há projetos vinculados à sua empresa atual.
          </p>
          <div className="text-xs text-slate-400 mb-6 p-2 bg-slate-100 dark:bg-slate-800 rounded border">
              Debug: company_id usado na busca = {currentCompanyId || 'NENHUM (Busca Global)'}
          </div>
          <Button onClick={() => navigate('/projetos/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Criar meu primeiro projeto
          </Button>
        </div>
      ) : (
        <ProjetosTable 
          projetos={projetos} 
          loading={loading} 
          onDelete={(id) => deleteProjeto(id, currentCompanyId)} 
        />
      )}
    </div>
  );
}