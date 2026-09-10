import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Filter, RefreshCw, Upload, List, Kanban, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import KanbanNotasFiscais from './components/KanbanNotasFiscais';
import UploadXMLModal from './components/UploadXMLModal';
import FormularioEntradaManualModal from './components/FormularioEntradaManualModal';
import MatchingModal from './components/MatchingModal';
import RecebimentoNFeModal from './components/RecebimentoNFeModal';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { DatabaseSchemaValidator } from '@/lib/databaseSchemaValidator';
import { NotaFiscalLogger } from '@/lib/notaFiscalLogger';
import EntradaNotasVisualizacao from '@/pages/compras/EntradaNotasVisualizacao';

function EntradaNotasFiscaisPage() {
  const { toast } = useToast();
  const [notas, setNotas] = useState([]);
  const [fornecedoresMap, setFornecedoresMap] = useState({});
  const [notasComRateio, setNotasComRateio] = useState(new Set());
  const [schemaErrors, setSchemaErrors] = useState([]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isMatchingOpen, setIsMatchingOpen] = useState(false);
  const [isRecebimentoOpen, setIsRecebimentoOpen] = useState(false);

  const [selectedNota, setSelectedNota] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban');

  useEffect(() => {
    validateEnvironment();
    loadData();
  }, []);

  const validateEnvironment = async () => {
    NotaFiscalLogger.info('PAGE_LOAD', { page: 'EntradaNotasFiscaisPage' });
    const result = await DatabaseSchemaValidator.validateSchemas();
    if (!result.valid) {
        setSchemaErrors(result.errors);
        toast({ title: "Aviso de Validação DB", description: "Encontrados problemas na estrutura do banco. Integrações podem falhar.", variant: "destructive" });
    }
  };

  const loadData = async () => {
    try {
      const [notasRes, fornecedoresRes, rateiosRes] = await Promise.all([
        supabase.from('notas_fiscais_entrada').select('*').order('created_at', { ascending: false }),
        supabase.from('fornecedores').select('id, nome, fantasia'),
        supabase.from('nf_rateio').select('nota_id'),
      ]);
      if (notasRes.error) throw notasRes.error;

      const map = {};
      (fornecedoresRes.data || []).forEach(f => { map[f.id] = f.fantasia || f.nome; });
      setFornecedoresMap(map);
      setNotasComRateio(new Set((rateiosRes.data || []).map(r => r.nota_id)));
      setNotas(notasRes.data || []);
    } catch (error) {
      console.error('[EntradaNotasFiscaisPage] Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar as notas fiscais.", variant: "destructive" });
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const updatedNotas = notas.map(n => n.id === draggableId ? { ...n, status: newStatus } : n);
    setNotas(updatedNotas);

    const nota = notas.find(n => n.id === draggableId);

    if (newStatus === 'Em_Entrada') {
         setSelectedNota(nota);
         setIsRecebimentoOpen(true);
    }

    const { error } = await supabase.from('notas_fiscais_entrada').update({ status: newStatus }).eq('id', draggableId);
    if (error) {
      console.error('[EntradaNotasFiscaisPage] Erro ao atualizar status:', error);
      toast({ title: "Erro", description: "Não foi possível salvar a mudança de status.", variant: "destructive" });
      loadData();
    }
  };

  const handleCardClick = (nota) => {
    setSelectedNota(nota);
    if (nota.status === 'Pendente') {
        setIsMatchingOpen(true);
    } else if (nota.status === 'Em_Entrada') {
        setIsRecebimentoOpen(true);
    } else if (nota.status === 'Em_Conferencia') {
        setIsRecebimentoOpen(true);
    } else {
        setIsMatchingOpen(true);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <Helmet>
        <title>Entrada de Notas Fiscais - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Entrada de Notas Fiscais"
        description="Gestão centralizada de DANFEs, NFSes e integração automática com Contas a Pagar e Estoque"
        action={
          <div className="flex gap-2">
             <Button variant="ghost" size="icon" onClick={loadData} title="Atualizar">
                <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setIsManualEntryOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Entrada Manual
            </Button>
            <Button onClick={() => setIsUploadOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                <Upload className="h-4 w-4" /> Importar XML
            </Button>
          </div>
        }
      />

      {schemaErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Problemas Encontrados na Estrutura do Banco</AlertTitle>
            <AlertDescription>
                <ul className="list-disc pl-5 mt-2">
                    {schemaErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
            </AlertDescription>
          </Alert>
      )}

      <div className="flex-1 bg-background rounded-lg border p-4 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
            <div className="flex space-x-2 bg-muted/50 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab('kanban')}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all
                        ${activeTab === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}
                    `}
                >
                    <Kanban className="h-4 w-4"/> Quadro Kanban
                </button>
                <button
                    onClick={() => setActiveTab('lista')}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all
                        ${activeTab === 'lista' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}
                    `}
                >
                    <List className="h-4 w-4"/> Lista Geral
                </button>
            </div>

            <div className="text-xs text-muted-foreground hidden sm:block">
               {activeTab === 'kanban' ? `${notas.length} notas no quadro` : 'Visualização em lista detalhada'}
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative">
            {activeTab === 'kanban' && (
                <div className="flex-1 h-full overflow-x-auto overflow-y-hidden animate-in fade-in duration-300 slide-in-from-left-2">
                    <KanbanNotasFiscais
                        notas={notas}
                        onDragEnd={handleDragEnd}
                        onCardClick={handleCardClick}
                        notasComRateio={notasComRateio}
                        fornecedoresMap={fornecedoresMap}
                    />
                </div>
            )}

            {activeTab === 'lista' && (
                <div className="flex-1 h-full overflow-y-auto animate-in fade-in duration-300 slide-in-from-right-2">
                    <EntradaNotasVisualizacao />
                </div>
            )}
        </div>
      </div>

      <UploadXMLModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadData}
      />

      <FormularioEntradaManualModal
        isOpen={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
        onSuccess={loadData}
      />

      <MatchingModal
        isOpen={isMatchingOpen}
        onClose={() => { setIsMatchingOpen(false); setSelectedNota(null); }}
        nota={selectedNota}
        onMatchSuccess={loadData}
      />

      <RecebimentoNFeModal
        isOpen={isRecebimentoOpen}
        onClose={() => { setIsRecebimentoOpen(false); setSelectedNota(null); loadData(); }}
        nota={selectedNota}
        onConfirm={loadData}
      />
    </div>
  );
}

export default EntradaNotasFiscaisPage;
