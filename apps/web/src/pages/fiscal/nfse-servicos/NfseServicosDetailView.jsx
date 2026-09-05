import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, ArrowLeft, History, Download, Building2, CheckCircle2,
  DollarSign, Send, XCircle, Printer, Loader2, Play, MapPin, Link as LinkIcon
} from 'lucide-react';
import { nfseServicosService } from './services/nfseServicosService';
import { submitToExternalIntegrator, generateXmlForSubmission, updateProtocoloFromExternal } from './services/nfseServicosIntegrations';
import { formatCurrency, formatDate, getStatusColor } from './utils/nfseUtils';
import { ConfirmActionDialog } from './components/NfseActionModals';

export default function NfseServicosDetailView() {
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
      const data = await nfseServicosService.fetchNfseServico(id);
      setNota(data);
    } catch (e) {
      console.error('Error loading NFS-e:', e);
      toast({ title: 'Erro', description: 'Falha ao carregar detalhes da NFS-e.', variant: 'destructive' });
      navigate('/fiscal/nfse-servicos');
    } finally {
      setLoading(false);
    }
  };

  const handleEmitir = async () => {
    if (!nota) return;
    
    // Validate that the DB record actually has the required municipality fields populated
    if (!nota.municipio_id || !nota.municipio_incidencia_iss_nome || !nota.municipio_incidencia_iss_uf) {
      toast({ 
        title: 'Validação Falhou', 
        description: 'Município de incidência (Nome, UF ou ID) não está totalmente preenchido. Edite a NFS-e para corrigir antes de transmitir.', 
        variant: 'destructive' 
      });
      return;
    }

    setActionLoading('emitir');
    try {
      const xml = generateXmlForSubmission(nota);
      const response = await submitToExternalIntegrator(xml);
      
      if (response.success) {
        await nfseServicosService.updateNfseServico(id, { 
          status: 'Emitida', 
          protocolo_emissao: response.protocolo 
        }, null, null);
        
        await updateProtocoloFromExternal(id, response.protocolo);
        
        toast({ title: 'Sucesso', description: 'NFS-e transmitida com sucesso!' });
        loadData();
      } else {
        throw new Error('Retorno do integrador indicou falha.');
      }
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelConfirm = async () => {
    setActionLoading('cancel');
    try {
      await nfseServicosService.cancelNfseServico(id, null);
      toast({ title: 'Sucesso', description: 'NFS-e cancelada.' });
      setShowCancel(false);
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateCR = async () => {
    setActionLoading('cr');
    try {
      await nfseServicosService.generateContasReceber(nota, null);
      toast({ title: 'Sucesso', description: 'Contas a Receber gerado com sucesso.' });
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
      await nfseServicosService.sendToAccounting(nota, null);
      toast({ title: 'Sucesso', description: 'NFS-e enviada à contabilidade.' });
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
      <Helmet><title>Detalhes NFS-e | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title={`NFS-e: ${nota.numero || 'S/N'}${nota.serie ? `-${nota.serie}` : ''}`}
          description={`Emissão: ${formatDate(nota.data_emissao)} | Emitente: ${nota.empresas?.razao_social || 'N/I'}`}
          icon={FileText}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'NFS-e Serviços', href: '/fiscal/nfse-servicos' },
            { label: 'Detalhes' }
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/nfse-servicos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => navigate(`/fiscal/nfse-servicos/${id}/editar`)}>Editar</Button>
          )}
        </div>
      </div>

      {/* BANNER AÇÕES RÁPIDAS */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`${getStatusColor(nota.status)} px-3 py-1 text-sm`}>
              {nota.status}
            </Badge>
            {nota.integrado_financeiro && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Financeiro</Badge>}
            {nota.integrado_contabil && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Contabilidade</Badge>}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canEmitir && (
              <Button onClick={handleEmitir} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {actionLoading === 'emitir' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Transmitir à Prefeitura
              </Button>
            )}
            
            {canIntegrate && !nota.integrado_financeiro && (
               <Button variant="outline" onClick={() => setShowCR(true)} disabled={actionLoading} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                 <DollarSign className="w-4 h-4 mr-2" /> Gerar C. Receber
               </Button>
            )}

            {canIntegrate && !nota.integrado_contabil && (
               <Button variant="outline" onClick={() => setShowAcc(true)} disabled={actionLoading} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                 <Send className="w-4 h-4 mr-2" /> Enviar à Contabilidade
               </Button>
            )}

            {canCancel && (
              <Button variant="outline" onClick={() => setShowCancel(true)} disabled={actionLoading} className="text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="w-4 h-4 mr-2" /> Cancelar NFS-e
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-6">
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Dados do Tomador / Local
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <div><p className="text-xs text-slate-500 mb-1">Razão Social / Nome</p><p className="text-sm font-medium text-slate-900">{nota.clientes?.nome || '-'}</p></div>
              <div><p className="text-xs text-slate-500 mb-1">CNPJ/CPF</p><p className="text-sm text-slate-900">{nota.clientes?.cnpj_cpf || '-'}</p></div>
              <div className="md:col-span-2"><p className="text-xs text-slate-500 mb-1">Localidade</p><p className="text-sm text-slate-700">{[nota.clientes?.bairro, nota.clientes?.cidade, nota.clientes?.estado].filter(Boolean).join(' - ') || '-'}</p></div>
              
              <div className="col-span-full pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Local de Incidência</p>
                <p className="text-sm font-medium text-slate-800">
                  {nota.municipio_incidencia_iss_nome && nota.municipio_incidencia_iss_uf 
                    ? `${nota.municipio_incidencia_iss_nome} - ${nota.municipio_incidencia_iss_uf}` 
                    : 'Não informado'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800">Detalhes do Serviço</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2"><p className="text-xs text-slate-500 mb-1">Serviço Referência</p><p className="text-sm font-medium text-slate-900">{nota.servicos?.nome || '-'}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Código LC 116/03</p><p className="text-sm text-slate-700">{nota.codigo_servico || '-'}</p></div>
                <div className="col-span-full"><p className="text-xs text-slate-500 mb-1">Descrição</p><p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{nota.descricao_servico || '-'}</p></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><p className="text-xs text-slate-500 mb-1">Qtd.</p><p className="text-base font-medium">{nota.quantidade}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">V. Unitário</p><p className="text-base font-medium">{formatCurrency(nota.valor_servico)}</p></div>
                <div className="md:col-span-2 text-right"><p className="text-xs text-slate-500 mb-1">Total do Serviço</p><p className="text-lg font-semibold text-slate-800">{formatCurrency((nota.quantidade||1) * (nota.valor_servico||0))}</p></div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Impostos e Totalizadores</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Alíquota ISS (%)</span>
                  <span className="font-medium text-slate-800">{nota.aliquota}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Valor ISS</span>
                  <span className="font-medium text-red-600">- {formatCurrency(nota.valor_imposto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Outras Retenções</span>
                  <span className="font-medium text-red-600">- {formatCurrency(nota.retencoes)}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Valor Líquido NFS-e</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(nota.valor_liquido)}</span>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-slate-600" /> Vinculações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {nota.vinculacoes?.pedido_venda_id && (
                <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">Pedido:</span>
                  <Link to={`/vendas/pedidos/${nota.vinculacoes.pedido_venda_id}`} className="font-medium text-blue-600 hover:underline">{nota.vinculacoes.pedidos_venda?.numero}</Link>
                </div>
              )}
              {nota.vinculacoes?.proposta_id && (
                <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">Proposta:</span>
                  <Link to={`/crm/propostas/${nota.vinculacoes.proposta_id}`} className="font-medium text-blue-600 hover:underline">{nota.vinculacoes.propostas?.numero}</Link>
                </div>
              )}
              {!nota.vinculacoes?.pedido_venda_id && !nota.vinculacoes?.proposta_id && (
                <p className="text-sm text-slate-500 text-center">Nenhum documento vinculado.</p>
              )}
              <Separator className="my-2" />
              <div className="text-sm">
                <p className="text-xs text-slate-500 mb-1">Condição de Pagamento</p>
                <p className="font-medium text-slate-800">{nota.condicoes_pagamento?.nome || 'Não informada'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" /> Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {nota.protocolo_emissao ? (
                <>
                  <Button variant="outline" className="w-full justify-between" onClick={() => toast({ title: 'Download', description: 'Baixando XML...' })}>
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-orange-500" /> Download XML</span>
                    <Download className="w-4 h-4 text-slate-400" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between" onClick={() => toast({ title: 'Download', description: 'Baixando PDF...' })}>
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-red-500" /> Imprimir NFS-e</span>
                    <Printer className="w-4 h-4 text-slate-400" />
                  </Button>
                  <div className="mt-4 bg-slate-50 p-3 rounded text-xs text-slate-600 break-all border border-slate-100">
                    <strong>Protocolo:</strong> {nota.protocolo_emissao}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">Arquivos disponíveis após emissão municipal.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[300px] overflow-y-auto">
              {nota.historico?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">Sem histórico registrado.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 mt-2 ml-2">
                  {nota.historico?.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">
                          {h.status_anterior ? `${h.status_anterior} → ` : 'Criada como '} 
                          <span className="text-blue-600">{h.status_novo}</span>
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
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

      <ConfirmActionDialog
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={handleCancelConfirm}
        title="Cancelar NFS-e"
        description="Tem certeza que deseja cancelar esta NFS-e? Esta ação se comunicará com a prefeitura."
        loading={actionLoading === 'cancel'}
      />

      <ConfirmActionDialog
        isOpen={showCR}
        onClose={() => setShowCR(false)}
        onConfirm={handleGenerateCR}
        title="Gerar Financeiro"
        description={`Deseja gerar uma Conta a Receber no valor líquido de ${formatCurrency(nota.valor_liquido)}?`}
        loading={actionLoading === 'cr'}
      />

      <ConfirmActionDialog
        isOpen={showAcc}
        onClose={() => setShowAcc(false)}
        onConfirm={handleSendAcc}
        title="Enviar à Contabilidade"
        description="Deseja disponibilizar os arquivos XML e PDF desta nota para a contabilidade?"
        loading={actionLoading === 'acc'}
      />
    </div>
  );
}