import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, Trash2, Clock, PlayCircle, CheckCircle2, XCircle, Link as LinkIcon, Unlink, FileText } from 'lucide-react';
import { usePendenciasContabeis } from '@/contexts/PendenciasContabeisContext';
import PendenciasStatusActions from './components/PendenciasStatusActions';
import PendenciasVinculosModal from './components/PendenciasVinculosModal';
import { 
  getStatusColor, 
  getTipoIcon,
  calculateDiasEmAberto,
  isOverdue,
  formatCompetencia,
  canDeletePendencia,
  canChangeStatus
} from '@/lib/pendenciasUtils';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';

export default function PendenciasContabeisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getPendencia, deletePendencia, changePendenciaStatus, getHistorico, getVinculos, linkDocument, unlinkDocument } = usePendenciasContabeis();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [statusModal, setStatusModal] = useState({ open: false, actionType: '' });
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await getPendencia(id);
    if (data) {
      setDoc(data);
      const [hist, vinc, { data: uData }] = await Promise.all([
        getHistorico(id),
        getVinculos(id),
        supabase.from('users').select('id, nome, email')
      ]);
      setHistorico(hist);
      setVinculos(vinc);
      if (uData) setUsers(uData);
    } else {
      navigate('/contabilidade/pendencias');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Excluir esta pendência permanentemente?')) {
      const success = await deletePendencia(id);
      if (success) navigate('/contabilidade/pendencias');
    }
  };

  const handleStatusConfirm = async (newStatus, notes, extraData) => {
    const success = await changePendenciaStatus(id, doc.status, newStatus, notes, extraData);
    if (success) {
      setStatusModal({ open: false, actionType: '' });
      loadData();
    }
  };

  const handleUnlink = async (vinculoId) => {
    if (window.confirm('Remover este vínculo?')) {
      await unlinkDocument(vinculoId);
      loadData();
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!doc) return null;

  const overdue = isOverdue(doc.prazo) && doc.status !== 'Resolvida' && doc.status !== 'Cancelada';
  const diasAberto = calculateDiasEmAberto(doc.data_abertura, doc.data_resolucao);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/contabilidade/pendencias')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Detalhes da Pendência</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate(`/contabilidade/pendencias/${id}/editar`)}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          {canDeletePendencia(doc.status) && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* INFO COLUMN */}
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-background rounded shadow-sm">
                    {getTipoIcon(doc.tipo, "w-5 h-5 text-muted-foreground")}
                  </div>
                  <span className="font-semibold text-foreground uppercase text-sm tracking-wider">{doc.tipo}</span>
                </div>
                <CardTitle className="text-xl text-foreground mt-2">{doc.descricao}</CardTitle>
                <p className="text-base text-blue-700 dark:text-blue-400 font-medium mt-1">{doc.empresa?.nome_fantasia || doc.empresa?.razao_social}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-muted-foreground uppercase">Competência</p>
                <p className="text-lg font-bold text-foreground">{formatCompetencia(doc.competencia)}</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Origem</p>
                <p className="text-sm font-medium text-foreground">{doc.origem}</p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Responsável</p>
                <p className="text-sm font-medium text-foreground">{doc.responsavel?.nome || doc.responsavel?.email || 'Não atribuído'}</p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Prazo</p>
                <p className={`text-sm font-medium ${overdue ? 'text-red-600 font-bold' : 'text-foreground'}`}>
                  {format(new Date(doc.prazo), 'dd/MM/yyyy')} {overdue && '(Vencido)'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Data de Abertura</p>
                <p className="text-sm font-medium text-foreground">{format(new Date(doc.data_abertura), 'dd/MM/yyyy')}</p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Data de Resolução</p>
                <p className="text-sm font-medium text-foreground">{doc.data_resolucao ? format(new Date(doc.data_resolucao), 'dd/MM/yyyy') : '-'}</p>
              </div>

              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Dias em Aberto</p>
                <p className="text-sm font-medium text-foreground">{diasAberto} dias</p>
              </div>

              {doc.observacoes && (
                <div className="col-span-full pt-4 border-t border-border">
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Observações Adicionais</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md border border-border whitespace-pre-wrap">{doc.observacoes}</p>
                </div>
              )}
              
              {doc.motivo_cancelamento && (
                <div className="col-span-full pt-4 border-t border-border">
                  <p className="text-xs uppercase font-bold text-red-600 mb-2">Motivo do Cancelamento</p>
                  <p className="text-sm text-red-800 bg-red-50 p-3 rounded-md border border-red-100 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900">{doc.motivo_cancelamento}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LINKED ITEMS */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" /> Documentos Vinculados
              </CardTitle>
              <Button size="sm" variant="outline" className="bg-background" onClick={() => setLinkModalOpen(true)}>
                <LinkIcon className="w-4 h-4 mr-2" /> Vincular Item
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {vinculos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento ou registro vinculado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vinculos.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md text-muted-foreground">
                          {v.tipo_vinculo === 'documentos' && <FileText className="w-4 h-4" />}
                          {v.tipo_vinculo === 'nf' && <FileText className="w-4 h-4" />}
                          {v.tipo_vinculo === 'lancamentos' && <FileText className="w-4 h-4" />}
                          {v.tipo_vinculo === 'fechamentos' && <FileText className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase">{v.tipo_vinculo}</p>
                          <p className="text-sm text-blue-600 hover:underline cursor-pointer truncate max-w-[150px]">Ref: {v.referencia_id.substring(0,8)}...</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30" onClick={() => handleUnlink(v.id)} title="Desvincular">
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR: Actions & History */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border py-4">
              <CardTitle className="text-base text-foreground">Ações de Resolução</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              {canChangeStatus(doc.status, 'Em tratamento') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                  onClick={() => setStatusModal({ open: true, actionType: 'iniciar' })}
                >
                  <PlayCircle className="w-4 h-4 mr-3" /> Iniciar Tratamento
                </Button>
              )}
              {canChangeStatus(doc.status, 'Aguardando cliente') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={() => setStatusModal({ open: true, actionType: 'aguardando' })}
                >
                  <Clock className="w-4 h-4 mr-3" /> Aguardar Cliente
                </Button>
              )}
              {canChangeStatus(doc.status, 'Resolvida') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                  onClick={() => setStatusModal({ open: true, actionType: 'resolver' })}
                >
                  <CheckCircle2 className="w-4 h-4 mr-3" /> Resolver Pendência
                </Button>
              )}
              {canChangeStatus(doc.status, 'Cancelada') && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 mt-4"
                  onClick={() => setStatusModal({ open: true, actionType: 'cancelar' })}
                >
                  <XCircle className="w-4 h-4 mr-3" /> Cancelar Pendência
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border py-4">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {historico.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">Nenhum histórico.</p>
                ) : (
                  historico.map((hist) => (
                    <div key={hist.id} className="relative pl-6 pb-4 border-l-2 border-border last:border-0 last:pb-0">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-muted-foreground" />
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-foreground">{hist.acao}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {format(new Date(hist.data_acao), 'dd/MM HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Por: {hist.usuario?.nome || hist.usuario?.email || 'Sistema'}</p>
                      {hist.status_novo && (
                        <p className="text-xs mt-1">
                          Status: <span className="font-medium text-foreground">{hist.status_novo}</span>
                        </p>
                      )}
                      {hist.observacoes && (
                        <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded mt-1 border border-border">"{hist.observacoes}"</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PendenciasStatusActions 
        open={statusModal.open}
        onOpenChange={(val) => setStatusModal(prev => ({ ...prev, open: val }))}
        actionType={statusModal.actionType}
        onConfirm={handleStatusConfirm}
        loading={loading}
        users={users}
      />

      <PendenciasVinculosModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        pendenciaId={id}
        empresaId={doc.empresa_id}
        onLink={async (tipo, ids) => {
          for (const refId of ids) {
            await linkDocument(id, tipo, refId); 
          }
          setLinkModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}