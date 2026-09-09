import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Inbox, Edit, Trash2, ArrowLeft, Download, FileText,
  DollarSign, RefreshCw, Send, CheckCircle2, History, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { entradaNFService } from '../services/entradaNFService';
import { formatCurrency, formatDate, getStatusColor } from '../utils/entradaNFUtils';
import SubstituirProvisaoModal from './components/SubstituirProvisaoModal';

export default function EntradaNFDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nota, setNota] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action states
  const [actionLoading, setActionLoading] = useState(null);
  const [showSubstituirModal, setShowSubstituirModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [n, h, a] = await Promise.all([
        entradaNFService.getNotaById(id),
        entradaNFService.getHistorico(id),
        entradaNFService.getArquivos(id)
      ]);
      setNota(n);
      setHistorico(h);
      setArquivos(a);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar detalhes.', variant: 'destructive' });
      navigate('/fiscal/entrada-nf');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filePath, nomeOriginal) => {
    try {
      const url = await entradaNFService.getFileUrl(filePath);
      window.open(url, '_blank');
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao abrir arquivo.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir esta nota? Esta ação é irreversível.')) return;
    try {
      await supabase.from('notas_entrada').delete().eq('id', id);
      toast({ title: 'Sucesso', description: 'Nota excluída.' });
      navigate('/fiscal/entrada-nf');
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao excluir.', variant: 'destructive' });
    }
  };

  // --- ACTIONS ---
  const handleGerarCP = async () => {
    if (!confirm(`Gerar Conta a Pagar de ${formatCurrency(nota.valor_total)} para ${nota.fornecedores?.nome}?`)) return;
    setActionLoading('gerar_cp');
    try {
      await entradaNFService.createContasPagarFromNota(nota);
      toast({ title: 'Sucesso', description: 'Conta a Pagar gerada com sucesso.' });
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnviarContabilidade = async () => {
    if (!confirm('Enviar esta nota e seus anexos para a contabilidade?')) return;
    setActionLoading('contabilidade');
    try {
      await entradaNFService.sendToContabilidade(nota);
      toast({ title: 'Sucesso', description: 'Nota marcada como enviada à contabilidade.' });
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!nota) return null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <Helmet><title>Detalhes Entrada NF | ERP Platform</title></Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title={`NF ${nota.numero}${nota.serie ? `-${nota.serie}` : ''}`}
          description={`Emitida por ${nota.fornecedores?.nome || 'N/I'} em ${formatDate(nota.data_emissao)}`}
          icon={Inbox}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' },
            { label: 'Entrada de NF', href: '/fiscal/entrada-nf' },
            { label: 'Detalhes' }
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/entrada-nf')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button variant="outline" onClick={() => navigate(`/fiscal/entrada-nf/${id}/editar`)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:text-blue-400 dark:hover:bg-blue-950/30 dark:border-blue-800">
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:bg-red-950/30 dark:border-red-800">
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </Button>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <Card className="bg-muted border-blue-100 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge className={`${getStatusColor(nota.status)} px-3 py-1 text-sm font-medium`}>{nota.status}</Badge>
            {nota.integrado_financeiro && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Financeiro Integrado</Badge>}
            {nota.integrado_contabil && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Contabilidade Enviada</Badge>}
          </div>

          <div className="flex flex-wrap gap-2">
            {!nota.integrado_financeiro && (
              <>
                <Button
                  onClick={handleGerarCP}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {actionLoading === 'gerar_cp' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Gerar Contas a Pagar
                </Button>
                <Button
                  onClick={() => setShowSubstituirModal(true)}
                  disabled={actionLoading}
                  variant="outline"
                  className="bg-background hover:bg-muted border-border text-foreground"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Substituir Provisão
                </Button>
              </>
            )}
            {!nota.integrado_contabil && (
              <Button
                onClick={handleEnviarContabilidade}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                {actionLoading === 'contabilidade' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar à Contabilidade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN DETAILS */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-background">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Dados do Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">

              <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Empresa Destino</p><p className="text-foreground font-medium">{nota.empresas?.razao_social}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Tipo de Documento</p><p className="text-foreground">{nota.tipo_documento}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Chave de Acesso</p><p className="text-foreground text-xs font-mono bg-muted p-1.5 rounded">{nota.chave_acesso || 'Não informada'}</p></div>
              </div>

              <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Data Emissão</p><p className="text-foreground">{formatDate(nota.data_emissao)}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Data Entrada</p><p className="text-foreground">{formatDate(nota.data_entrada)}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Vencimento</p><p className="text-foreground font-medium">{formatDate(nota.data_vencimento) || '-'}</p></div>
              </div>

              <div className="col-span-full pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Emitente / Fornecedor</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                  <div><p className="text-xs text-muted-foreground">Razão Social</p><p className="text-sm font-medium text-foreground">{nota.fornecedores?.nome}</p></div>
                  <div><p className="text-xs text-muted-foreground">CNPJ</p><p className="text-sm text-foreground">{nota.fornecedores?.cnpj || nota.cnpj_fornecedor}</p></div>
                  <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Endereço</p><p className="text-sm text-foreground">{nota.endereco || nota.fornecedores?.endereco}</p></div>
                </div>
              </div>

              <div className="col-span-full pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Valores</h4>
                <div className="flex gap-8">
                  <div><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-lg font-bold text-foreground">{formatCurrency(nota.valor_total)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Impostos</p><p className="text-base font-medium text-red-600">{formatCurrency(nota.valor_impostos)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Líquido Estimado</p><p className="text-base font-medium text-emerald-600">{formatCurrency(nota.valor_liquido)}</p></div>
                </div>
              </div>

              <div className="col-span-full pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3">Classificação e Pagamento</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-xs text-muted-foreground">Categoria</p><p className="text-sm font-medium">{nota.categorias?.nome || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Subcategoria</p><p className="text-sm">{nota.subcategorias?.nome || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Centro de Custo</p><p className="text-sm">{nota.centros_custo?.nome || '-'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Condição Pag.</p><p className="text-sm">{nota.condicoes_pagamento?.nome || '-'}</p></div>
                </div>
              </div>

              {nota.observacoes && (
                <div className="col-span-full pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Observações</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap bg-yellow-50/50 dark:bg-yellow-950/20 p-3 rounded border border-yellow-100 dark:border-yellow-900">{nota.observacoes}</p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR - FILES & HISTORY */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-background">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" /> Anexos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {arquivos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo anexado.</p>
              ) : (
                <div className="space-y-2">
                  {arquivos.map(arq => (
                    <div key={arq.id} className="flex items-center justify-between p-2.5 bg-muted hover:bg-muted border border-border rounded-md transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded flex-shrink-0 ${arq.tipo_arquivo === 'XML' ? 'bg-orange-100 text-orange-600' : arq.tipo_arquivo === 'PDF' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-foreground truncate" title={arq.nome_original}>{arq.nome_original}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{arq.tipo_arquivo}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-blue-600" onClick={() => handleDownload(arq.caminho_arquivo, arq.nome_original)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-background">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" /> Histórico de Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem histórico registrado.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-border space-y-6 mt-2 ml-2">
                  {historico.map((h, i) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">
                          {h.status_anterior ? `${h.status_anterior} → ` : 'Criada como '}
                          <span className="text-blue-600">{h.status_novo}</span>
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatDate(h.data_mudanca)} às {new Date(h.data_mudanca).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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

      <SubstituirProvisaoModal
        isOpen={showSubstituirModal}
        onClose={() => setShowSubstituirModal(false)}
        nota={nota}
        onSuccess={loadData}
      />
    </div>
  );
}