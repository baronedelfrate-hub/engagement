import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calculator, ArrowLeft, History, Download, FileText, CheckCircle2,
  DollarSign, Send, Lock, Loader2, Play
} from 'lucide-react';
import { apuracaoImpostosService } from '@/lib/apuracaoImpostosService';
import { formatCurrency, formatDate, getStatusColor } from './utils/apuracaoUtils';

export default function ApuracaoImpostosDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apuracaoImpostosService.fetchApuracaoById(id);
      setData(res);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar detalhes.', variant: 'destructive' });
      navigate('/fiscal/apuracao-impostos');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionFn, actionName, successMsg) => {
    setActionLoading(actionName);
    try {
      await actionFn(id, null);
      toast({ title: 'Sucesso', description: successMsg });
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 flex justify-center text-blue-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!data) return null;

  const canEdit = data.status === 'Em aberto' || data.status === 'Em conferência';
  const isClosed = data.status === 'Fechado' || data.status === 'Enviado à contabilidade' || data.status === 'Pago';

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Helmet><title>Detalhes Apuração | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title={`Apuração: ${data.tipo_imposto} - ${data.periodo_referencia}`}
          description={`Vencimento: ${formatDate(data.vencimento)}`}
          icon={Calculator}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'Apurações', href: '/fiscal/apuracao-impostos' },
            { label: 'Detalhes' }
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/apuracao-impostos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/fiscal/apuracao-impostos/${id}/editar`)}>
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* BANNER AÇÕES */}
      <Card className="bg-background border-border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(data.status)} px-3 py-1 text-sm`}>
              {data.status}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {!isClosed && (
              <Button 
                onClick={() => handleAction(apuracaoImpostosService.closeApuracao, 'close', 'Apuração fechada com sucesso.')} 
                disabled={actionLoading} 
                className="bg-slate-800 hover:bg-slate-700 text-white"
              >
                {actionLoading === 'close' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Fechar Apuração
              </Button>
            )}
            
            {data.status === 'Fechado' && (
               <Button 
                 variant="outline" 
                 onClick={() => handleAction((id, u) => apuracaoImpostosService.generateFinancialObligation(data, u), 'fin', 'Obrigação financeira gerada no Contas a Pagar.')} 
                 disabled={actionLoading} 
                 className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30"
               >
                 {actionLoading === 'fin' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />} 
                 Gerar Obrigação (Pagar)
               </Button>
            )}

            {(data.status === 'Fechado' || data.status === 'Pago') && (
               <Button 
                 variant="outline" 
                 onClick={() => handleAction(apuracaoImpostosService.sendToAccounting, 'acc', 'Enviado à contabilidade.')} 
                 disabled={actionLoading} 
                 className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950/30"
               >
                 {actionLoading === 'acc' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} 
                 Enviar Contabilidade
               </Button>
            )}

            <Button variant="outline" onClick={() => apuracaoImpostosService.exportReport(id, 'pdf')}>
              <Download className="w-4 h-4 mr-2" /> Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Resumo do Cálculo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted p-4 rounded-lg border border-border">
                <div><p className="text-xs text-muted-foreground mb-1">Período</p><p className="text-base font-medium">{data.periodo_referencia}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Vencimento</p><p className="text-base font-medium">{formatDate(data.vencimento)}</p></div>
                <div className="md:col-span-2 text-right"><p className="text-xs text-muted-foreground mb-1">Responsável</p><p className="text-base font-medium text-foreground">{data.users?.nome || '-'}</p></div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base de Cálculo</span>
                  <span className="font-medium text-foreground">{formatCurrency(data.base_calculo)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Alíquota Aplicada</span>
                  <span className="font-medium text-foreground">{data.aliquota}%</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total Apurado</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(data.valor_apurado)}</span>
                </div>
              </div>

              {data.observacoes && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded">{data.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground">Documentos de Origem</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {data.apuracao_impostos_origem?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento vinculado gerado automaticamente. Preenchimento manual.</p>
              ) : (
                <div className="space-y-2">
                  {data.apuracao_impostos_origem?.map((origem) => (
                    <div key={origem.id} className="flex justify-between items-center p-3 bg-muted rounded border border-border text-sm">
                      <span className="font-medium text-foreground">{origem.tipo_origem}</span>
                      <span className="text-muted-foreground font-medium">{formatCurrency(origem.valor_contribuido)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" /> Histórico de Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[400px] overflow-y-auto">
              {data.apuracao_impostos_historico?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Sem histórico registrado.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-border space-y-6 mt-2 ml-2">
                  {data.apuracao_impostos_historico?.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {h.status_anterior ? `${h.status_anterior} → ` : 'Iniciado como '} 
                          <span className="text-blue-600">{h.status_novo}</span>
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{formatDate(h.data_mudanca, true)}</span>
                          <span>•</span>
                          <span>{h.users?.nome || 'Sistema'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}