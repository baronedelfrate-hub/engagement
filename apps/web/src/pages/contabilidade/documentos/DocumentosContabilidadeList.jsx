import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Eye, Download, Edit, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  formatCompetencia, 
  getStatusColor, 
  getDocumentTypeIcon,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES
} from './utils/documentosUtils';
import { documentosAutoImportService } from './services/documentosAutoImportService';
import { ActionDialog } from './DocumentosContabilidadeActions';

export default function DocumentosContabilidadeList({ filters, setFilters, empresas }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionModal, setActionModal] = useState({ open: false, type: '', title: '' });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('documentos_contabilidade')
        .select('*, empresas(nome_fantasia, razao_social)')
        .order('created_at', { ascending: false });

      if (filters.empresa_id && filters.empresa_id !== 'all') query = query.eq('empresa_id', filters.empresa_id);
      if (filters.competencia) query = query.eq('competencia', filters.competencia);
      if (filters.tipo && filters.tipo !== 'Todos') query = query.eq('tipo', filters.tipo);
      if (filters.status && filters.status !== 'Todos') query = query.eq('status', filters.status);
      if (filters.search) {
        query = query.or(`descricao.ilike.%${filters.search}%,origem.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data || []);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar documentos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  const handleSync = async () => {
    if (!filters.empresa_id || filters.empresa_id === 'all' || !filters.competencia) {
      toast({ title: 'Atenção', description: 'Selecione uma empresa e uma competência para sincronizar.', variant: 'default' });
      return;
    }
    setSyncing(true);
    const res = await documentosAutoImportService.syncAllDocuments(filters.empresa_id, filters.competencia);
    if (res.error) {
      toast({ title: 'Erro', description: 'Erro ao sincronizar: ' + res.error, variant: 'destructive' });
    } else {
      const total = res.nfEntrada + res.nfSaida + res.impostos;
      toast({ title: 'Sincronização Concluída', description: `${total} novos documentos importados.` });
      fetchDocuments();
    }
    setSyncing(false);
  };

  const toggleSelectAll = (checked) => {
    if (checked) setSelectedIds(documents.map(d => d.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id, checked) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const openBulkAction = (type, title) => {
    if (selectedIds.length === 0) return;
    setActionModal({ open: true, type, title });
  };

  return (
    <div className="space-y-6">
      
      {/* FILTER BAR */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-64 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Busca Livre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Descrição ou origem..." 
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>

          <div className="w-full md:w-56 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Empresa</label>
            <Select value={filters.empresa_id} onValueChange={(v) => setFilters(prev => ({ ...prev, empresa_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Todas as Empresas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-40 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Competência</label>
            <Input 
              type="month" 
              value={filters.competencia}
              onChange={(e) => setFilters(prev => ({ ...prev, competencia: e.target.value }))}
            />
          </div>

          <div className="w-full md:w-40 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Tipo</label>
            <Select value={filters.tipo} onValueChange={(v) => setFilters(prev => ({ ...prev, tipo: v }))}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-40 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {DOCUMENT_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={handleSync} disabled={syncing} className="ml-auto text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30">
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar Módulos
          </Button>
        </CardContent>
      </Card>

      {/* BULK ACTIONS TOOLBAR */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between dark:bg-blue-950/30 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-400 ml-2">{selectedIds.length} documento(s) selecionado(s)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-background" onClick={() => openBulkAction('enviar', 'Enviar Lote à Contabilidade')}>
              <Send className="w-4 h-4 mr-2" /> Enviar
            </Button>
            <Button size="sm" variant="outline" className="bg-background" onClick={() => openBulkAction('conferir', 'Conferir Lote')}>
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Conferir
            </Button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={documents.length > 0 && selectedIds.length === documents.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Tipo / Origem</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Envio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Carregando...</TableCell></TableRow>
              ) : documents.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum documento encontrado.</TableCell></TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted">
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.includes(doc.id)}
                        onCheckedChange={(c) => toggleSelect(doc.id, c)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground">{getDocumentTypeIcon(doc.tipo)}</div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{doc.tipo}</p>
                          <p className="text-xs text-muted-foreground">{doc.origem}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={doc.descricao}>{doc.descricao}</TableCell>
                    <TableCell className="font-medium text-foreground">{formatCompetencia(doc.competencia)}</TableCell>
                    <TableCell><Badge className={getStatusColor(doc.status)}>{doc.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{doc.data_envio ? format(new Date(doc.data_envio), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.arquivo_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" title="Baixar" onClick={() => window.open(doc.arquivo_url, '_blank')}>
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="Ver Detalhes" onClick={() => navigate(`/contabilidade/documentos/${doc.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted" title="Editar" onClick={() => navigate(`/contabilidade/documentos/${doc.id}/editar`)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ActionDialog 
        open={actionModal.open}
        onOpenChange={(v) => setActionModal(prev => ({ ...prev, open: v }))}
        title={actionModal.title}
        description={`Aplicar ação para ${selectedIds.length} documento(s) selecionado(s).`}
        actionType={actionModal.type}
        documents={documents.filter(d => selectedIds.includes(d.id))}
        onComplete={fetchDocuments}
      />
    </div>
  );
}