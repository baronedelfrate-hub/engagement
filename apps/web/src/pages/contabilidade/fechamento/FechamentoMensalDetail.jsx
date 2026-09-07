import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Lock, Unlock, FileText, Loader2, Calendar } from 'lucide-react';
import { useFechamentoMensal } from '@/hooks/useFechamentoMensal';
import { getStatusColor, formatCompetencia, formatDate, canFinalizeClosing } from '@/lib/fechamentoUtils';

import FechamentoEtapasChecklist from './FechamentoEtapasChecklist';
import FechamentoHistorico from './FechamentoHistorico';

export default function FechamentoMensalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchClosingById, markStepComplete, finalizeClosing, reopenClosing, fetchHistory, loading } = useFechamentoMensal();
  
  const [fechamento, setFechamento] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [activeTab, setActiveTab] = useState('etapas');

  const loadData = async () => {
    const data = await fetchClosingById(id);
    if (data) setFechamento(data);
    const hist = await fetchHistory(id);
    setHistorico(hist);
  };

  useEffect(() => {
    if (id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleStep = async (etapa, isCompleted, notes) => {
    if (!fechamento) return;
    const result = await markStepComplete(fechamento.id, etapa, isCompleted, null, fechamento.etapas);
    if (result.success) {
      setFechamento(prev => ({
        ...prev,
        progresso: result.newProgress,
        etapas: result.updatedEtapas
      }));
      const hist = await fetchHistory(id);
      setHistorico(hist);
    }
  };

  const handleFinalize = async () => {
    if (window.confirm('Tem certeza que deseja finalizar este fechamento? Nenhuma alteração posterior poderá ser feita.')) {
      const success = await finalizeClosing(fechamento.id, null, fechamento.status);
      if (success) loadData();
    }
  };

  const handleReopen = async () => {
    if (window.confirm('Deseja reabrir este fechamento?')) {
      const success = await reopenClosing(fechamento.id, null);
      if (success) loadData();
    }
  };

  if (loading && !fechamento) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!fechamento) return <div className="p-6 text-center text-muted-foreground">Fechamento não encontrado.</div>;

  const isFinalizado = fechamento.status === 'Concluído';
  const podeFinalizar = !isFinalizado && canFinalizeClosing(fechamento.etapas);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6 pb-24">
      <Helmet><title>Detalhes do Fechamento | ERP Platform</title></Helmet>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/contabilidade/fechamento')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Contabilidade</span> / <span>Fechamento Mensal</span> / <span className="font-medium text-foreground">{formatCompetencia(fechamento.competencia)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!isFinalizado && (
            <Button variant="outline" onClick={() => navigate(`/contabilidade/fechamento/${fechamento.id}/editar`)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          )}
          {isFinalizado ? (
            <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30" onClick={handleReopen}>
              <Unlock className="w-4 h-4 mr-2" /> Reabrir Fechamento
            </Button>
          ) : (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              disabled={!podeFinalizar || loading}
              onClick={handleFinalize}
            >
              <Lock className="w-4 h-4 mr-2" /> Finalizar Fechamento
            </Button>
          )}
        </div>
      </div>

      {/* Top Meta Card */}
      <Card className="border-border shadow-sm bg-background overflow-hidden">
        <div className={`h-2 w-full ${isFinalizado ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">{fechamento.empresa?.nome_fantasia || 'Empresa N/A'}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatCompetencia(fechamento.competencia)}</span>
                <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Abertura: {formatDate(fechamento.data_abertura)}</span>
                {fechamento.data_conclusao && <span className="flex items-center gap-1 text-emerald-600"><Lock className="w-4 h-4" /> Conclusão: {formatDate(fechamento.data_conclusao)}</span>}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <Badge className={`${getStatusColor(fechamento.status)} text-sm px-3 py-1`}>
                {fechamento.status}
              </Badge>
              <div className="w-full md:w-48 text-right space-y-1">
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{fechamento.progresso}%</span>
                </div>
                <Progress value={fechamento.progresso} className="h-2" />
              </div>
            </div>
          </div>

          {fechamento.observacoes_gerais && (
            <div className="mt-6 p-4 bg-muted rounded-lg text-sm text-foreground border border-border">
              <p className="font-semibold text-foreground mb-1">Observações Gerais:</p>
              <p className="whitespace-pre-wrap">{fechamento.observacoes_gerais}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-background border border-border w-full justify-start h-auto p-1 rounded-lg">
          <TabsTrigger value="etapas" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300 px-6 py-2">
            Checklist de Etapas ({fechamento.etapas?.filter(e=>e.concluida).length}/{fechamento.etapas?.length})
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300 px-6 py-2">
            Histórico e Timeline
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="etapas" className="m-0 focus-visible:outline-none">
            <FechamentoEtapasChecklist 
              etapas={fechamento.etapas || []} 
              onToggleStep={handleToggleStep}
              readOnly={isFinalizado}
            />
          </TabsContent>
          
          <TabsContent value="historico" className="m-0 focus-visible:outline-none">
            <Card className="border-border">
              <CardContent className="p-6">
                <FechamentoHistorico historico={historico} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

    </div>
  );
}