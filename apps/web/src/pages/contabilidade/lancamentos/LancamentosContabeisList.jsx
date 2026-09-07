import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Search, Eye, Edit, Trash2, Plus, Send } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useLancamentosContabeis } from './hooks/useLancamentosContabeis';
import { 
  getStatusColor, 
  getOrigemIcon, 
  formatCurrency, 
  formatDate, 
  formatCompetencia,
  canEditLancamento,
  canDeleteLancamento
} from './utils/lancamentosUtils';

export default function LancamentosContabeisList() {
  const navigate = useNavigate();
  const { fetchLancamentos, deleteLancamento, exportBatch, loading } = useLancamentosContabeis();
  
  const today = new Date();
  const defaultCompetencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [empresas, setEmpresas] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [totals, setTotals] = useState({ debitos: 0, creditos: 0 });

  const [filters, setFilters] = useState({
    search: '',
    empresa_id: 'all',
    competencia: defaultCompetencia,
    origem: 'Todas',
    status: 'Todos'
  });

  const loadDependencies = async () => {
    const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true);
    if (data) setEmpresas(data);
  };

  const loadData = async () => {
    const data = await fetchLancamentos(filters);
    setLancamentos(data);
    setSelectedIds([]);
    
    // Calculate totals for current view
    const sumDeb = data.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
    const sumCred = data.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0); // Assuming standard double entry logic where each row is a complete entry balancing D/C, so total D = total C.
    setTotals({ debitos: sumDeb, creditos: sumCred });
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento rascunho?')) {
      await deleteLancamento(id);
      loadData();
    }
  };

  const handleExportBatch = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Deseja exportar ${selectedIds.length} lançamentos? Somente os com status "Conferido" serão processados.`)) {
      await exportBatch(selectedIds);
      loadData();
    }
  };

  const toggleSelectAll = (checked) => {
    if (checked) setSelectedIds(lancamentos.map(d => d.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id, checked) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(i => i !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-foreground">Listagem de Lançamentos</h2>
        <Button onClick={() => navigate('/contabilidade/lancamentos/novo')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-64 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Busca Livre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Histórico, doc..." 
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
            <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Conferido">Conferido</SelectItem>
                <SelectItem value="Exportado">Exportado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TOTALS AND ACTIONS */}
      <div className="flex justify-between items-center bg-background p-4 rounded-lg border border-border shadow-sm">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Total Exibido</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(totals.debitos)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Lançamentos</p>
            <p className="text-lg font-bold text-foreground">{lancamentos.length}</p>
          </div>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-blue-600">{selectedIds.length} selecionados</span>
            <Button size="sm" onClick={handleExportBatch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Send className="w-4 h-4 mr-2" /> Exportar Lote
            </Button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={lancamentos.length > 0 && selectedIds.length === lancamentos.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Data / Comp.</TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead>Conta Débito</TableHead>
                <TableHead>Conta Crédito</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Carregando...</TableCell></TableRow>
              ) : lancamentos.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum lançamento encontrado.</TableCell></TableRow>
              ) : (
                lancamentos.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted">
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(c) => toggleSelect(item.id, c)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{formatDate(item.data)}</div>
                      <div className="text-xs text-muted-foreground">{formatCompetencia(item.competencia)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate font-medium text-foreground" title={item.historico}>{item.historico}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        {getOrigemIcon(item.origem, "w-3 h-3")} {item.origem} {item.documento_vinculado && `- ${item.documento_vinculado}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{item.conta_debito?.codigo}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">{item.conta_debito?.nome}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-foreground">{item.conta_credito?.codigo}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">{item.conta_credito?.nome}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="Ver Detalhes" onClick={() => navigate(`/contabilidade/lancamentos/${item.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canEditLancamento(item.status) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600" title="Editar" onClick={() => navigate(`/contabilidade/lancamentos/${item.id}/editar`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteLancamento(item.status) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" title="Excluir" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}