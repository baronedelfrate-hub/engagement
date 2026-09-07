import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2, ArrowLeft, Download, Send, CheckCircle, AlertCircle, Edit, Trash2, Calendar, FileImage as FileIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  formatCompetencia, 
  getStatusColor, 
  getDocumentTypeIcon,
  canChangeStatus,
  canDeleteDocument
} from './utils/documentosUtils';
import { ActionDialog } from './DocumentosContabilidadeActions';

export default function DocumentosContabilidadeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [historico, setHistorico] = useState([]);
  
  // Action Modal State
  const [actionModal, setActionModal] = useState({ open: false, type: '', title: '', desc: '' });

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documentos_contabilidade')
        .select('*, empresas(nome_fantasia, razao_social)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setDoc(data);

      const { data: hist } = await supabase
        .from('documentos_historico')
        .select('*, users(nome)')
        .eq('documento_id', id)
        .order('data_acao', { ascending: false });
      
      setHistorico(hist || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Documento não encontrado.', variant: 'destructive' });
      navigate('/contabilidade/documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDoc();
  }, [id]);

  const handleDelete = async () => {
    if (!canDeleteDocument(doc?.status)) {
      toast({ title: 'Aviso', description: 'Não é possível excluir um documento já enviado ou conferido.', variant: 'destructive' });
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este documento permanentemente?')) {
      await supabase.from('documentos_contabilidade').delete().eq('id', id);
      toast({ title: 'Sucesso', description: 'Documento excluído.' });
      navigate('/contabilidade/documentos');
    }
  };

  const openAction = (type, title, desc) => {
    if (!canChangeStatus(doc?.status, type === 'enviar' ? 'Enviado' : type === 'conferir' ? 'Conferido' : '')) {
      // toast({ title: 'Aviso', description: 'Ação não permitida para o status atual.' });
      // Proceeding anyway for demo/flexibility but warning in UI could go here
    }
    setActionModal({ open: true, type, title, desc });
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!doc) return null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
      <PageHeader 
        title="Detalhes do Documento" 
        description="Visualização e histórico do documento contábil."
        icon={FileText}
        breadcrumbs={[
          { label: 'Contabilidade', href: '/contabilidade/dashboard' },
          { label: 'Documentos', href: '/contabilidade/documentos' },
          { label: 'Visualizar' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/contabilidade/documentos')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button variant="outline" onClick={() => navigate(`/contabilidade/documentos/${id}/editar`)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
            {canDeleteDocument(doc.status) && (
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INFO COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-background border border-border rounded-lg text-blue-600">
                  {getDocumentTypeIcon(doc.tipo, "w-6 h-6")}
                </div>
                <div>
                  <CardTitle className="text-xl text-foreground">{doc.descricao}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{doc.empresas?.nome_fantasia || doc.empresas?.razao_social}</p>
                </div>
              </div>
              <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Tipo</p>
                <p className="text-sm text-foreground font-medium">{doc.tipo}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Competência</p>
                <p className="text-sm text-foreground font-medium">{formatCompetencia(doc.competencia)}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Origem</p>
                <p className="text-sm text-foreground font-medium">{doc.origem}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Inclusão</p>
                <p className="text-sm text-foreground font-medium">{doc.data_inclusao ? format(new Date(doc.data_inclusao), 'dd/MM/yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Envio</p>
                <p className="text-sm text-foreground font-medium">{doc.data_envio ? format(new Date(doc.data_envio), 'dd/MM/yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Conferência</p>
                <p className="text-sm text-foreground font-medium">{doc.data_conferencia ? format(new Date(doc.data_conferencia), 'dd/MM/yyyy') : '-'}</p>
              </div>
              
              {doc.observacoes && (
                <div className="col-span-full pt-4 border-t border-border">
                  <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Observações</p>
                  <p className="text-sm text-foreground bg-muted p-3 rounded-md border border-border">{doc.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ARQUIVO ANEXO */}
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border py-4">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <FileIcon className="w-5 h-5 text-muted-foreground" /> Arquivo Anexo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-border m-6 rounded-lg bg-muted/50">
              {doc.arquivo_url ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Documento disponível para visualização</p>
                  <Button onClick={() => window.open(doc.arquivo_url, '_blank')} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" /> Baixar / Visualizar
                  </Button>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum arquivo anexado a este registro.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR: Actions & History */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border py-4">
              <CardTitle className="text-base text-foreground">Ações de Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <Button 
                variant="outline" 
                className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30"
                onClick={() => openAction('enviar', 'Enviar à Contabilidade', 'Confirmar o envio deste documento.')}
              >
                <Send className="w-4 h-4 mr-3" /> Marcar como Enviado
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                onClick={() => openAction('conferir', 'Conferir Documento', 'Confirmar que o documento foi validado e contabilizado.')}
              >
                <CheckCircle className="w-4 h-4 mr-3" /> Marcar como Conferido
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30"
                onClick={() => openAction('ajustar', 'Solicitar Ajuste', 'Notificar pendência ou correção necessária.')}
              >
                <AlertCircle className="w-4 h-4 mr-3" /> Solicitar Ajuste
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-yellow-200 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-950/30"
                onClick={() => openAction('separar', 'Marcar Separado', 'Marcar que o documento está separado para envio futuro.')}
              >
                <FileIcon className="w-4 h-4 mr-3" /> Marcar Separado
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="bg-muted border-b border-border py-4">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-5 space-y-4">
                  {historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">Nenhum histórico registrado.</p>
                  ) : (
                    historico.map((hist) => (
                      <div key={hist.id} className="relative pl-6 pb-4 border-l-2 border-border last:border-0 last:pb-0">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500" />
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-semibold text-foreground">{hist.acao}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(hist.data_acao), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">Por: {hist.users?.nome || 'Sistema'}</p>
                        {hist.observacoes && (
                          <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded mt-1">"{hist.observacoes}"</p>
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

      <ActionDialog 
        open={actionModal.open}
        onOpenChange={(val) => setActionModal(prev => ({ ...prev, open: val }))}
        title={actionModal.title}
        description={actionModal.desc}
        actionType={actionModal.type}
        documents={[doc]}
        onComplete={fetchDoc}
      />
    </div>
  );
}