import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2, ArrowLeft, Edit, Trash2, Send, CheckCircle, UploadCloud, Link as LinkIcon, History } from 'lucide-react';
import { format } from 'date-fns';
import { useLancamentosContabeis } from './hooks/useLancamentosContabeis';
import { 
  formatCompetencia, 
  formatCurrency, 
  getStatusColor, 
  getOrigemIcon,
  canEditLancamento,
  canDeleteLancamento,
  canChangeStatus
} from './utils/lancamentosUtils';
import StatusTransitionDialog from './components/StatusTransitionDialog';

export default function LancamentosContabeisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getLancamento, deleteLancamento, changeLancamentoStatus, getLancamentoHistory } = useLancamentosContabeis();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [historico, setHistorico] = useState([]);
  
  const [statusModal, setStatusModal] = useState({ open: false, newStatus: '' });

  const loadData = async () => {
    setLoading(true);
    const data = await getLancamento(id);
    if (data) {
      setDoc(data);
      const hist = await getLancamentoHistory(id);
      setHistorico(hist);
    } else {
      navigate('/contabilidade/lancamentos');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Excluir este lançamento permanentemente?')) {
      const success = await deleteLancamento(id);
      if (success) navigate('/contabilidade/lancamentos');
    }
  };

  const handleStatusChange = async (notes) => {
    const success = await changeLancamentoStatus(id, doc.status, statusModal.newStatus, notes);
    if (success) {
      setStatusModal({ open: false, newStatus: '' });
      loadData();
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!doc) return null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/contabilidade/lancamentos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <h2 className="text-xl font-semibold text-slate-800">Detalhes do Lançamento</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
          {canEditLancamento(doc.status) && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/contabilidade/lancamentos/${id}/editar`)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          )}
          {canDeleteLancamento(doc.status) && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* INFO COLUMN */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg text-slate-800">{doc.historico}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">{doc.empresa?.nome_fantasia || doc.empresa?.razao_social}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(doc.valor)}</p>
                <p className="text-sm text-slate-500">{format(new Date(doc.data), 'dd/MM/yyyy')} (Ref: {formatCompetencia(doc.competencia)})</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs uppercase font-bold text-blue-700 mb-1">Conta Débito (D)</p>
                <p className="text-base font-semibold text-slate-800">{doc.conta_debito?.codigo}</p>
                <p className="text-sm text-slate-600">{doc.conta_debito?.nome}</p>
              </div>
              
              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                <p className="text-xs uppercase font-bold text-emerald-700 mb-1">Conta Crédito (C)</p>
                <p className="text-base font-semibold text-slate-800">{doc.conta_credito?.codigo}</p>
                <p className="text-sm text-slate-600">{doc.conta_credito?.nome}</p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Origem do Lançamento</p>
                <div className="flex items-center gap-2 text-sm text-slate-800 font-medium">
                  {getOrigemIcon(doc.origem, "w-4 h-4 text-slate-500")}
                  {doc.origem}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Centro de Custo</p>
                <p className="text-sm text-slate-800 font-medium">
                  {doc.centro_custo ? `${doc.centro_custo.codigo} - ${doc.centro_custo.nome}` : '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-slate-500 mb-1">Documento Vinculado</p>
                <p className="text-sm text-slate-800 font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-slate-400" />
                  {doc.documento_vinculado || 'Nenhum'}
                </p>
              </div>

              {doc.observacoes && (
                <div className="col-span-full pt-4 border-t border-slate-100">
                  <p className="text-xs uppercase font-semibold text-slate-500 mb-2">Observações</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-100">{doc.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR: Actions & History */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
              <CardTitle className="text-base text-slate-800">Ações de Fluxo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              {canChangeStatus(doc.status, 'Pendente') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => setStatusModal({ open: true, newStatus: 'Pendente' })}
                >
                  <Send className="w-4 h-4 mr-3" /> Submeter p/ Revisão
                </Button>
              )}
              {canChangeStatus(doc.status, 'Conferido') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setStatusModal({ open: true, newStatus: 'Conferido' })}
                >
                  <CheckCircle className="w-4 h-4 mr-3" /> Aprovar Lançamento
                </Button>
              )}
              {canChangeStatus(doc.status, 'Exportado') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setStatusModal({ open: true, newStatus: 'Exportado' })}
                >
                  <UploadCloud className="w-4 h-4 mr-3" /> Exportar Lançamento
                </Button>
              )}
              {(doc.status === 'Pendente' || doc.status === 'Conferido') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-slate-200 text-slate-700 hover:bg-slate-50 mt-4"
                  onClick={() => setStatusModal({ open: true, newStatus: 'Rascunho' })}
                >
                  <History className="w-4 h-4 mr-3" /> Reverter Status
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
              <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="p-5 space-y-4">
                  {historico.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center">Nenhum histórico.</p>
                  ) : (
                    historico.map((hist) => (
                      <div key={hist.id} className="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-0 last:pb-0">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-slate-400" />
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-semibold text-slate-800">{hist.acao}</p>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                            {format(new Date(hist.data_acao), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">Por: {hist.usuario?.nome || hist.usuario?.email || 'Sistema'}</p>
                        {hist.status_novo && (
                          <p className="text-xs mt-1">
                            Status: <span className="font-medium text-slate-700">{hist.status_novo}</span>
                          </p>
                        )}
                        {hist.observacoes && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded mt-1 border border-slate-100">"{hist.observacoes}"</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <StatusTransitionDialog 
        open={statusModal.open}
        newStatus={statusModal.newStatus}
        currentStatus={doc.status}
        onOpenChange={(val) => setStatusModal(prev => ({ ...prev, open: val }))}
        onConfirm={handleStatusChange}
        loading={loading}
      />
    </div>
  );
}