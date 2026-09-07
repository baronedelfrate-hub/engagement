import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Eye, Edit, Trash2, Plus, AlertCircle, RefreshCcw, CheckCircle2, FileText } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { usePendenciasContabeis } from '@/contexts/PendenciasContabeisContext';
import { 
  getStatusColor, 
  getTipoColor,
  calculateDiasEmAberto,
  isOverdue,
  formatCompetencia,
  canDeletePendencia,
  getStatusOptions,
  getTipoOptions
} from '@/lib/pendenciasUtils';

export default function PendenciasContabeisList() {
  const navigate = useNavigate();
  const { pendencias, fetchPendencias, deletePendencia, loading } = usePendenciasContabeis();
  
  const today = new Date();
  const defaultCompetencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [empresas, setEmpresas] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    empresa_id: 'all',
    competencia: defaultCompetencia,
    tipo: 'Todos',
    status: 'Todos',
    responsavel_id: 'all',
    mostrarVencidas: false
  });

  const loadDependencies = async () => {
    const [{ data: empData }, { data: usrData }] = await Promise.all([
      supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true),
      supabase.from('users').select('id, nome, email')
    ]);
    if (empData) setEmpresas(empData);
    if (usrData) setUsers(usrData);
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    fetchPendencias(filters);
  }, [filters, fetchPendencias]);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta pendência?')) {
      await deletePendencia(id);
      fetchPendencias(filters);
    }
  };

  const filteredPendencias = pendencias.filter(p => {
    if (filters.mostrarVencidas) {
      return isOverdue(p.prazo) && p.status !== 'Resolvida' && p.status !== 'Cancelada';
    }
    return true;
  });

  // Summary Metrics
  const totalPendencias = filteredPendencias.length;
  const emAberto = filteredPendencias.filter(p => p.status !== 'Resolvida' && p.status !== 'Cancelada').length;
  const vencidas = filteredPendencias.filter(p => isOverdue(p.prazo) && p.status !== 'Resolvida' && p.status !== 'Cancelada').length;
  const resolvidas = filteredPendencias.filter(p => p.status === 'Resolvida').length;

  return (
    <div className="space-y-6">
      
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Total Pendências</p>
              <p className="text-2xl font-bold text-foreground">{totalPendencias}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Em Aberto/Tratamento</p>
              <p className="text-2xl font-bold text-foreground">{emAberto}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold text-red-600">{vencidas}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Resolvidas</p>
              <p className="text-2xl font-bold text-foreground">{resolvidas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-foreground">Listagem de Pendências</h2>
        <Button onClick={() => navigate('/contabilidade/pendencias/novo')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Nova Pendência
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
                placeholder="Descrição, origem..." 
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="w-full md:w-48 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Empresa</label>
            <Select value={filters.empresa_id} onValueChange={(v) => setFilters(prev => ({ ...prev, empresa_id: v }))}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-32 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Competência</label>
            <Input 
              type="month" 
              value={filters.competencia}
              onChange={(e) => setFilters(prev => ({ ...prev, competencia: e.target.value }))}
              className="bg-background"
            />
          </div>

          <div className="w-full md:w-40 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
            <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {getStatusOptions().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pb-2 pl-2">
            <Checkbox 
              id="vencidas" 
              checked={filters.mostrarVencidas} 
              onCheckedChange={(c) => setFilters(prev => ({ ...prev, mostrarVencidas: c }))} 
            />
            <label htmlFor="vencidas" className="text-sm font-medium text-red-600 cursor-pointer">
              Mostrar Apenas Vencidas
            </label>
          </div>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Empresa / Comp.</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-[30%]">Descrição</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Dias</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filteredPendencias.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma pendência encontrada.</TableCell></TableRow>
              ) : (
                filteredPendencias.map((item) => {
                  const overdue = isOverdue(item.prazo) && item.status !== 'Resolvida' && item.status !== 'Cancelada';
                  const dias = calculateDiasEmAberto(item.data_abertura, item.data_resolucao);
                  
                  return (
                    <TableRow key={item.id} className={`hover:bg-muted ${overdue ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}>
                      <TableCell>
                        <div className="font-medium text-foreground">{item.empresa?.nome_fantasia || item.empresa?.razao_social}</div>
                        <div className="text-xs text-muted-foreground">{formatCompetencia(item.competencia)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(item.tipo)}>{item.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground truncate max-w-[300px]" title={item.descricao}>{item.descricao}</div>
                        <div className="text-xs text-muted-foreground">Ref: {item.origem}</div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {item.responsavel?.nome || item.responsavel?.email || 'Não atribuído'}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-foreground'}`}>
                          {new Date(item.prazo).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-foreground">{dias}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="Ver Detalhes" onClick={() => navigate(`/contabilidade/pendencias/${item.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600" title="Editar" onClick={() => navigate(`/contabilidade/pendencias/${item.id}/editar`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {canDeletePendencia(item.status) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" title="Excluir" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}