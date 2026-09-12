import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectos } from '@/hooks/useProjectos';
import ProjetosTable from './ProjetosTable';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertCircle, FolderOpen } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveCompanyId } from '@/lib/companyUtils';

export default function ProjetosPage() {
  const navigate = useNavigate();
  const { projetos, loading, error, refetch, deleteProjeto } = useProjectos();
  const [currentCompanyId, setCurrentCompanyId] = useState(null);

  const loadProjects = useCallback(async () => {
    const cid = await resolveCompanyId(null);
    setCurrentCompanyId(cid);
    await refetch(cid || null);
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
          <Button onClick={() => navigate('/operacao/projeto/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

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
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed bg-muted">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">Nenhum projeto encontrado</h3>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1 max-w-sm mb-4">
            Você ainda não possui nenhum projeto cadastrado ou não há projetos vinculados à sua empresa atual.
          </p>
          <div className="text-xs text-muted-foreground mb-6 p-2 bg-muted rounded border">
              Debug: company_id usado na busca = {currentCompanyId || 'NENHUM (Busca Global)'}
          </div>
          <Button onClick={() => navigate('/operacao/projeto/novo')}>
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