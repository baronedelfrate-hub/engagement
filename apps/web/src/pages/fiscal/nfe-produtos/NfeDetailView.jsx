import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, ArrowLeft, History, Download, Building2, CheckCircle2,
  DollarSign, Send, XCircle, Printer, Loader2, Play
} from 'lucide-react';
import { nfeService } from './services/nfeService';
import { generateContasReceber } from './integrations/contasReceberIntegration';
import { updateFluxoCaixa } from './integrations/fluxoCaixaIntegration';
import { sendToAccounting } from './integrations/accountingIntegration';
import { formatCurrency, formatDate, getStatusColor } from './utils/nfeFormatting';
import { CancelNfeDialog, ConfirmActionDialog } from './components/NfeActionModals';

export default function NfeDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [nota, setNota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Modals state
  const [showCancel, setShowCancel] = useState(false);
  const [showCR, setShowCR] = useState(false);
  const [showAcc, setShowAcc] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await nfeService.fetchNfeDetail(id);
      setNota(data);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar detalhes da NF-e.', variant: 'destructive' });
      navigate('/fiscal/nfe-produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleEmitir = async () => {
    setActionLoading('emitir');
    try {
      await nfeService.emitirSefaz(id, null);
      toast({ title: 'Sucesso', description: 'NF-e enviada para a SEFAZ com sucesso!' });
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (motivo) => {
    try {
      await nfeService.cancelNfe(id, motivo, null);
      toast({ title: 'Sucesso', description: 'NF-e cancelada.' });
      setShowCancel(false);
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleGenerateCR = async () => {
    setActionLoading('cr');
    try {
      const cr = await generateContasReceber(nota, null);
      await updateFluxoCaixa(nota, cr, null); // Update flux right after CR
      toast({ title: 'Sucesso', description: 'Contas a Receber e Fluxo de Caixa gerados com sucesso.' });
      setShowCR(false);
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendAcc = async () => {
    setActionLoading('acc');
    try {
      await sendToAccounting(nota, null);
      toast({ title: 'Sucesso', description: 'Documentos enviados à contabilidade.' });
      setShowAcc(false);
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 flex justify-center text-blue-600"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!nota) return null;

  const canEdit = nota.status === 'Em digitação' || nota.status === 'Rejeitada';
  const canEmitir = nota.status === 'Em digitação' || nota.status === 'Rejeitada' || nota.status === 'Aguardando emissão';
  const canCancel = nota.status === 'Emitida';
  const canIntegrate = nota.status === 'Emitida';

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Helmet><title>Detalhes NF-e | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title={`NF-e: ${nota.numero || 'S/N'}${nota.serie ? `-${nota.serie}` : ''}`}
          description={`Emissão: ${formatDate(nota.data_emissao)} | Emitente: ${nota.empresas?.razao_social || 'N/I'}`}
          icon={FileText}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'NF-e Produtos', href: '/fiscal/nfe-produtos' },
            { label: 'Detalhes' }
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/nfe-produtos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/fiscal/nfe-produtos/${id}/editar`)}>Editar</Button>
          )}
        </div>
      </div>

      {/* STATUS BANNER & ACTIONS */}
      <Card className="bg-background border-border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`${getStatusColor(nota.status)} px-3 py-1 text-sm`}>
              {nota.status}
            </Badge>
            {nota.integrado_financeiro && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Financeiro Integrado</Badge>}
            {nota.integrado_contabil && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Contabilidade Enviada</Badge>}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canEmitir && (
              <Button onClick={handleEmitir} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {actionLoading === 'emitir' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Transmitir SEFAZ
              </Button>
            )}
            
            {canIntegrate && !nota.integrado_financeiro && (
               <Button variant="outline" onClick={() => setShowCR(true)} disabled={actionLoading} className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30">
                 <DollarSign className="w-4 h-4 mr-2" /> Gerar Financeiro
               </Button>
            )}

            {canIntegrate && !nota.integrado_contabil && (
               <Button variant="outline" onClick={() => setShowAcc(true)} disabled={actionLoading} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950/30">
                 <Send className="w-4 h-4 mr-2" /> Enviar Contabilidade
               </Button>
            )}

            {canCancel && (
              <Button variant="outline" onClick={() => setShowCancel(true)} disabled={actionLoading} className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30">
                <XCircle className="w-4 h-4 mr-2" /> Cancelar NF-e
              </Button>
            )}

            {nota.status === 'Emitida' && (
              <Button variant="secondary">
                <Printer className="w-4 h-4 mr-2" /> Imprimir DANFE
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAIN INFO */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-background">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Cliente / Destinatário
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div><p className="text-xs text-muted-foreground mb-1">Razão Social</p><p className="text-sm font-medium text-foreground">{nota.clientes?.nome || '-'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">CNPJ/CPF</p><p className="text-sm text-foreground">{nota.clientes?.cnpj_cpf || '-'}</p></div>
              <div className="md:col-span-2"><p className="text-xs text-muted-foreground mb-1">Endereço</p><p className="text-sm text-foreground">{nota.clientes?.endereco || '-'}, {nota.clientes?.bairro} - {nota.clientes?.cidade}/{nota.clientes?.estado} - CEP: {nota.clientes?.cep}</p></div>
              
              <div className="col-span-full pt-4 border-t border-border grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground mb-1">Natureza da Operação</p><p className="text-sm">{nota.natureza_operacao}</p></div>
                <div><p className="text-xs text-muted-foreground mb-1">Pedido Vinculado</p><p className="text-sm font-medium">{nota.pedidos_venda?.numero || 'Não vinculado'}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground">Itens da NF-e</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 font-medium text-muted-foreground">Produto</th>
                    <th className="p-3 font-medium text-muted-foreground">NCM</th>
                    <th className="p-3 font-medium text-muted-foreground text-right">Qtd</th>
                    <th className="p-3 font-medium text-muted-foreground text-right">V. Unit</th>
                    <th className="p-3 font-medium text-muted-foreground text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {nota.itens?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3">{item.produtos?.nome}</td>
                      <td className="p-3 text-muted-foreground">{item.ncm}</td>
                      <td className="p-3 text-right">{item.quantidade}</td>
                      <td className="p-3 text-right">{formatCurrency(item.valor_unitario)}</td>
                      <td className="p-3 text-right font-medium text-foreground">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-muted border-t border-border flex justify-end gap-8">
                <div className="text-right"><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-medium text-foreground">{formatCurrency(nota.subtotal)}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Descontos</p><p className="font-medium text-red-600">{formatCurrency(nota.total_descontos)}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Impostos</p><p className="font-medium text-foreground">{formatCurrency(nota.total_impostos)}</p></div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(nota.valor_total)}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" /> Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {nota.protocolo ? (
                <>
                  <Button variant="outline" className="w-full justify-between" onClick={() => toast({ title: 'Download', description: 'Baixando XML...' })}>
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-orange-500" /> Download XML</span>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between" onClick={() => toast({ title: 'Download', description: 'Baixando DANFE...' })}>
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-red-500" /> Download PDF</span>
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <div className="mt-4 bg-muted p-3 rounded text-xs text-muted-foreground break-all">
                    <strong>Protocolo:</strong> {nota.protocolo} <br/>
                    <strong>Autorização:</strong> {nota.autorizacao}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Arquivos disponíveis após emissão.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" /> Histórico de Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[300px] overflow-y-auto">
              {nota.historico?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Sem histórico registrado.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-border space-y-6 mt-2 ml-2">
                  {nota.historico?.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-card"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {h.status_anterior ? `${h.status_anterior} → ` : (h.acao ? '' : 'Criada como ')} 
                          <span className="text-blue-600">{h.acao || h.status_novo}</span>
                        </span>
                        {h.detalhes && <span className="text-xs text-muted-foreground mt-0.5">{h.detalhes}</span>}
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

      <CancelNfeDialog 
        isOpen={showCancel} 
        onClose={() => setShowCancel(false)} 
        onConfirm={handleCancel} 
      />

      <ConfirmActionDialog
        isOpen={showCR}
        onClose={() => setShowCR(false)}
        onConfirm={handleGenerateCR}
        title="Gerar Financeiro"
        description={`Deseja gerar o Contas a Receber e a previsão de Fluxo de Caixa para esta nota no valor de ${formatCurrency(nota.valor_total)}?`}
        loading={actionLoading === 'cr'}
      />

      <ConfirmActionDialog
        isOpen={showAcc}
        onClose={() => setShowAcc(false)}
        onConfirm={handleSendAcc}
        title="Enviar à Contabilidade"
        description="Esta ação enviará os arquivos XML e DANFE diretamente para o portal da contabilidade. Confirma o envio?"
        loading={actionLoading === 'acc'}
      />
    </div>
  );
}