import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Layers, AlertCircle, RefreshCw } from 'lucide-react';
import { useClienteFases } from '@/hooks/useClienteFases';
import { supabase } from '@/lib/customSupabaseClient';
import ClienteFasesKanban from '@/components/bpo/ClienteFasesKanban';
import ClienteFasesModal from '@/components/bpo/ClienteFasesModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ClienteFasesPage() {
  const { cliente_id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [fetchingCliente, setFetchingCliente] = useState(true);
  
  console.log('[ClienteFasesPage] Página montada');
  console.log('[ClienteFasesPage] Cliente ID param:', cliente_id);

  const { 
    fases, 
    arquivos, 
    loading: fasesLoading, 
    error: fasesError,
    updateFase, 
    uploadArquivo, 
    deletarArquivo, 
    initPhasesIfNeeded 
  } = useClienteFases(cliente_id);

  console.log('[ClienteFasesPage] Loading:', fasesLoading);
  console.log('[ClienteFasesPage] Fases state:', fases);
  console.log('[ClienteFasesPage] Erro state:', fasesError);

  const [selectedFase, setSelectedFase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchCliente = async () => {
      setFetchingCliente(true);
      try {
        const { data, error } = await supabase.from('clientes').select('nome').eq('id', cliente_id).single();
        if (error) throw error;
        if (data) setCliente(data);
      } catch (error) {
        console.error('[ClienteFasesPage] Erro ao buscar cliente:', error);
      } finally {
        setFetchingCliente(false);
      }
    };
    if (cliente_id) fetchCliente();
  }, [cliente_id]);

  useEffect(() => {
    if (!fasesLoading && !fasesError && fases.length === 0 && cliente_id) {
      console.log(`[ClienteFasesPage] Fases vazio. Tentativa ${retryCount + 1}. Chamando initPhasesIfNeeded...`);
      initPhasesIfNeeded();
    }
  }, [fasesLoading, fases.length, fasesError, cliente_id, retryCount]);

  const handleEditFase = (faseData) => {
    setSelectedFase(faseData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFase(null);
  };

  const handleRetry = () => {
    console.log('[ClienteFasesPage] Retry button clicked');
    setRetryCount(prev => prev + 1);
    initPhasesIfNeeded();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {fetchingCliente ? (
           <div className="flex items-center gap-4">
             <Skeleton className="h-12 w-12 rounded-full" />
             <div className="space-y-2">
               <Skeleton className="h-6 w-48" />
               <Skeleton className="h-4 w-64" />
             </div>
           </div>
        ) : (
          <PageHeader 
            title={`Fases BPO E5 - ${cliente?.nome || 'Cliente'}`}
            description="Gestão do ciclo de vida do cliente (Diagnóstico, Implantação e Operação)"
            icon={<Layers className="w-8 h-8 text-primary" />}
          />
        )}
        <Button variant="outline" onClick={() => navigate('/operacao/bpo-e5/clientes-bpo')} className="shrink-0 bg-background hover:bg-muted shadow-sm transition-all">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar aos Clientes
        </Button>
      </div>

      {fasesError ? (
        <Alert variant="destructive" className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg mb-0">Erro de Permissão (RLS) ou Carregamento</AlertTitle>
          </div>
          <AlertDescription className="text-sm">
            <p className="mb-2 font-mono bg-red-900/10 p-2 rounded">{fasesError.message || 'Ocorreu um erro inesperado ao carregar/inserir as fases deste cliente.'}</p>
            {fasesError.code === '42501' && (
              <p className="text-xs">Código 42501 indica erro de permissão no Supabase (Row Level Security). Verifique as políticas de segurança da tabela `cliente_fases`.</p>
            )}
          </AlertDescription>
          <Button onClick={handleRetry} variant="outline" className="bg-background text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300 dark:border-red-800 mt-2">
            <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
          </Button>
        </Alert>
      ) : fasesLoading ? (
        <div className="bg-muted p-6 rounded-xl border border-border shadow-sm min-h-[400px] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <span className="text-muted-foreground font-medium text-lg">Carregando Fases do BPO E5...</span>
          <p className="text-muted-foreground text-sm mt-2">Buscando informações e anexos no servidor</p>
        </div>
      ) : (
        <div className="bg-muted/50 p-6 rounded-xl border border-border shadow-sm">
          <ClienteFasesKanban 
            fases={fases} 
            arquivos={arquivos} 
            onEditFase={handleEditFase} 
          />
        </div>
      )}

      <ClienteFasesModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        faseData={selectedFase}
        arquivosFase={selectedFase ? arquivos[selectedFase.id] || [] : []}
        onSave={updateFase}
        onUpload={uploadArquivo}
        onDeleteFile={deletarArquivo}
      />
    </div>
  );
}