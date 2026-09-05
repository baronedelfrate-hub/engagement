import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Inbox, Plus, FileText, Filter, Eye, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { entradaNFService } from '../services/entradaNFService';
import { formatCurrency, formatDate, getStatusColor, STATUS_OPTIONS } from '../utils/entradaNFUtils';
import { supabase } from '@/lib/customSupabaseClient';

export default function EntradaNFList() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    data_inicio: '',
    data_fim: '',
    empresa_id: 'all',
    fornecedor_id: 'all',
    status: 'all',
    integrado_financeiro: 'all',
    integrado_contabil: 'all'
  });

  const [dropdowns, setDropdowns] = useState({ empresas: [], fornecedores: [] });

  useEffect(() => {
    fetchDropdowns();
    loadData();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [empRes, fornRes] = await Promise.all([
        supabase.from('empresas').select('id, razao_social'),
        supabase.from('fornecedores').select('id, nome')
      ]);
      setDropdowns({
        empresas: empRes.data || [],
        fornecedores: fornRes.data || []
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeFilters = {};
      if (filters.data_inicio) activeFilters.data_inicio = filters.data_inicio;
      if (filters.data_fim) activeFilters.data_fim = filters.data_fim;
      if (filters.empresa_id !== 'all') activeFilters.empresa_id = filters.empresa_id;
      if (filters.fornecedor_id !== 'all') activeFilters.fornecedor_id = filters.fornecedor_id;
      if (filters.status !== 'all') activeFilters.status = filters.status;
      if (filters.integrado_financeiro !== 'all') activeFilters.integrado_financeiro = filters.integrado_financeiro === 'true';
      if (filters.integrado_contabil !== 'all') activeFilters.integrado_contabil = filters.integrado_contabil === 'true';

      const result = await entradaNFService.getNotasEntrada(activeFilters);
      setData(result || []);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar notas: ' + error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => loadData();

  const resetFilters = () => {
    setFilters({
      data_inicio: '', data_fim: '', empresa_id: 'all', fornecedor_id: 'all',
      status: 'all', integrado_financeiro: 'all', integrado_contabil: 'all'
    });
    setTimeout(loadData, 0);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    try {
      const { error } = await supabase.from('notas_entrada').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Nota excluída com sucesso.' });
      loadData();
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir: ' + error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet><title>Entrada de NF | ERP Platform</title></Helmet>

      <div className="flex justify-between items-center">
        <PageHeader
          title="Entrada de Notas Fiscais"
          description="Gestão de notas fiscais recebidas de fornecedores."
          icon={Inbox}
          breadcrumbs={[{ label: 'Fiscal', href: '/fiscal/dashboard' }, { label: 'Entrada de NF' }]}
        />
        <Button onClick={() => navigate('/fiscal/entrada-nf/novo')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrada
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4 text-foreground font-medium">
            <Filter className="w-4 h-4" /> Filtros
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">

            <div className="space-y-1.5 xl:col-span-2">
              <Label className="text-xs">Período de Emissão</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={filters.data_inicio} onChange={e => handleFilterChange('data_inicio', e.target.value)} className="h-9 text-foreground" />
                <span className="text-muted-foreground">até</span>
                <Input type="date" value={filters.data_fim} onChange={e => handleFilterChange('data_fim', e.target.value)} className="h-9 text-foreground" />
              </div>
            </div>

            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs">Empresa</Label>
              <Select value={filters.empresa_id} onValueChange={v => handleFilterChange('empresa_id', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {dropdowns.empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs">Fornecedor</Label>
              <Select value={filters.fornecedor_id} onValueChange={v => handleFilterChange('fornecedor_id', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {dropdowns.fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs">Status</Label>
              <Select value={filters.status} onValueChange={v => handleFilterChange('status', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 xl:col-span-1 flex flex-col justify-center pt-5">
              <div className="flex items-center gap-2">
                <Switch
                  checked={filters.integrado_financeiro === 'true'}
                  onCheckedChange={c => handleFilterChange('integrado_financeiro', c ? 'true' : 'all')}
                />
                <Label className="text-xs">Int. Financeiro</Label>
              </div>
            </div>

            <div className="space-y-1.5 xl:col-span-1 flex flex-col justify-end pt-5">
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetFilters} className="h-9 px-3 w-full">Limpar</Button>
                <Button onClick={applyFilters} className="h-9 px-3 w-full bg-slate-800 text-white hover:bg-slate-700">Buscar</Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-32 font-semibold">Número</TableHead>
                <TableHead className="font-semibold">Fornecedor</TableHead>
                <TableHead className="font-semibold">Emissão</TableHead>
                <TableHead className="text-right font-semibold">Valor Total</TableHead>
                <TableHead className="text-center font-semibold">Status</TableHead>
                <TableHead className="text-center font-semibold">Integrações</TableHead>
                <TableHead className="text-right font-semibold w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <p>Nenhuma nota de entrada encontrada com os filtros atuais.</p>
                      <Button variant="link" onClick={resetFilters}>Limpar filtros</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/80 transition-colors group"
                    onClick={() => navigate(`/fiscal/entrada-nf/${item.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">
                      {item.numero}{item.serie ? `-${item.serie}` : ''}
                    </TableCell>
                    <TableCell className="truncate max-w-[200px]" title={item.fornecedores?.nome}>
                      {item.fornecedores?.nome || 'N/I'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(item.data_emissao)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`font-normal ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.integrado_financeiro ?
                          <span className="flex items-center text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded" title="Integrado Financeiro"><CheckCircle2 className="w-3 h-3 mr-1" /> Fin</span> :
                          <span className="w-12"></span>
                        }
                        {item.integrado_contabil ?
                          <span className="flex items-center text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded" title="Integrado Contábil"><CheckCircle2 className="w-3 h-3 mr-1" /> Cont</span> :
                          <span className="w-12"></span>
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); navigate(`/fiscal/entrada-nf/${item.id}/editar`); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(item.id, e)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}