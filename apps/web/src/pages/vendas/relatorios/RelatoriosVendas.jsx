import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { 
    FileText, Settings, Table, Search, FileSpreadsheet, 
    ArrowUpDown, Eye, Edit, Trash2, MoreHorizontal
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { supabase } from '@/lib/customSupabaseClient';
import VendasReportFilters from './components/VendasReportFilters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Definitions for export functionality
const COLUMNS_DEF = [
    { id: 'numero', label: 'Número', type: 'string' },
    { id: 'data_emissao', label: 'Data Emissão', type: 'date' },
    { id: 'cliente_nome', label: 'Cliente', type: 'string' },
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'valor_total', label: 'Valor Total', type: 'currency' },
    { id: 'observacoes', label: 'Observações', type: 'string' }
];

const RelatoriosVendas = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [source, setSource] = useState('pedidos_venda'); // 'pedidos_venda' or 'orcamentos'
    const [loading, setLoading] = useState(false);
    const [rawData, setRawData] = useState([]);
    
    // Sort and Pagination
    const [sortConfig, setSortConfig] = useState({ key: 'data_emissao', direction: 'desc' });
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [filters, setFilters] = useState({
        dataInicio: '',
        dataFim: '',
        clienteId: 'TODOS',
        status: 'TODOS',
        faixaValorMin: '',
        faixaValorMax: ''
    });

    // Fetch data initially and when source/filters change
    useEffect(() => {
        fetchData();
    }, [source]); // Auto fetch on source change. Filters apply explicitly.

    const fetchData = async () => {
        setLoading(true);
        try {
            console.log(`Buscando dados de: ${source} com filtros:`, filters);
            
            let query = supabase
                .from(source)
                .select(`
                    id, 
                    numero, 
                    data_emissao, 
                    valor_total, 
                    status, 
                    observacoes, 
                    created_at,
                    cliente_id,
                    clientes:cliente_id (nome)
                `);

            // Apply Filters at Database Level
            if (filters.dataInicio) query = query.gte('data_emissao', filters.dataInicio);
            if (filters.dataFim) query = query.lte('data_emissao', filters.dataFim);
            if (filters.clienteId !== 'TODOS') query = query.eq('cliente_id', filters.clienteId);
            if (filters.status !== 'TODOS') query = query.eq('status', filters.status);
            if (filters.faixaValorMin) query = query.gte('valor_total', parseFloat(filters.faixaValorMin));
            if (filters.faixaValorMax) query = query.lte('valor_total', parseFloat(filters.faixaValorMax));

            const { data, error } = await query;

            if (error) throw error;

            // Map standard keys for easy rendering
            const formattedData = (data || []).map(item => ({
                ...item,
                cliente_nome: item.clientes?.nome || 'Cliente não encontrado'
            }));

            setRawData(formattedData);
            setPage(1); // Reset to first page
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar os dados. ' + error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        fetchData();
    };

    const handleClearFilters = () => {
        setFilters({
            dataInicio: '',
            dataFim: '',
            clienteId: 'TODOS',
            status: 'TODOS',
            faixaValorMin: '',
            faixaValorMax: ''
        });
        // We will fetch immediately after state updates
        setTimeout(fetchData, 0); 
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir este registro?")) return;
        try {
            const { error } = await supabase.from(source).delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: 'Registro excluído.', variant: 'success' });
            fetchData();
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao excluir registro.', variant: 'destructive' });
        }
    };

    // Client-side Sorting
    const sortedData = useMemo(() => {
        let sortableItems = [...rawData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) aValue = '';
                if (bValue === null || bValue === undefined) bValue = '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [rawData, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Pagination
    const paginatedData = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return sortedData.slice(start, start + ITEMS_PER_PAGE);
    }, [sortedData, page]);

    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

    // Stats calculations
    const stats = useMemo(() => {
        const total = sortedData.reduce((acc, curr) => acc + parseFloat(curr.valor_total || 0), 0);
        const avg = sortedData.length > 0 ? total / sortedData.length : 0;
        return { count: sortedData.length, total, avg };
    }, [sortedData]);

    const handleExportPDF = () => {
        const title = `Relatório de ${source === 'pedidos_venda' ? 'Pedidos de Venda' : 'Orçamentos'}`;
        exportToPDF(sortedData, COLUMNS_DEF, title, `Período: ${filters.dataInicio || '*'} a ${filters.dataFim || '*'}`);
    };

    const handleExportExcel = () => {
        const title = `Relatorio_${source}`;
        exportToExcel(sortedData, COLUMNS_DEF, title, `Período: ${filters.dataInicio || '*'} a ${filters.dataFim || '*'}`);
    };

    const formatCurrency = (val) => {
        return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(parseISO(dateString), 'dd/MM/yyyy');
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (statusValue) => {
        const colors = {
            'rascunho': 'bg-muted text-muted-foreground border-border',
            'pendente': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
            'confirmado': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
            'aprovado': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
            'em_separacao': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
            'enviado': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
            'faturado': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
            'cancelado': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
            'rejeitado': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
        };
        const st = (statusValue || '').toLowerCase();
        return colors[st] || 'bg-muted text-foreground';
    };

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <Helmet>
                <title>Relatórios de Vendas - ERP</title>
            </Helmet>

            <PageHeader 
                title="Relatórios de Vendas" 
                description="Análise detalhada de orçamentos e pedidos de venda"
            />

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Sidebar Controls */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Source Selection */}
                    <Card>
                        <CardHeader className="py-3"><CardTitle className="text-sm uppercase text-muted-foreground">Fonte de Dados</CardTitle></CardHeader>
                        <CardContent>
                            <Select value={source} onValueChange={(val) => { setSource(val); handleClearFilters(); }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pedidos_venda">Pedidos de Venda</SelectItem>
                                    <SelectItem value="orcamentos">Orçamentos</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Report Filters Component */}
                    <VendasReportFilters 
                        filters={filters} 
                        setFilters={setFilters} 
                        onApply={handleApplyFilters} 
                        onClear={handleClearFilters}
                        source={source}
                    />
                </div>

                {/* Main Content Area */}
                <div className="xl:col-span-3 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Registros Encontrados</p>
                                    <h3 className="text-2xl font-bold">{stats.count}</h3>
                                </div>
                                <div className="h-10 w-10 bg-blue-50 text-blue-500 dark:bg-blue-950/30 dark:text-blue-400 rounded-full flex items-center justify-center">
                                    <Table className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Soma Total</p>
                                    <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.total)}</h3>
                                </div>
                                <div className="h-10 w-10 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-full flex items-center justify-center">
                                    <DollarIcon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Ticket Médio</p>
                                    <h3 className="text-2xl font-bold text-amber-600">{formatCurrency(stats.avg)}</h3>
                                </div>
                                <div className="h-10 w-10 bg-amber-50 text-amber-500 dark:bg-amber-950/30 dark:text-amber-400 rounded-full flex items-center justify-center">
                                    <PercentIcon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-background p-4 rounded-lg border shadow-sm flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                Listando dados da tabela: {source === 'pedidos_venda' ? 'Pedidos de Venda' : 'Orçamentos'}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                className="gap-2 hover:text-red-600 hover:border-red-200"
                                onClick={handleExportPDF}
                                disabled={sortedData.length === 0}
                            >
                                <FileText className="h-4 w-4" /> PDF
                            </Button>
                            <Button 
                                variant="outline" 
                                className="gap-2 hover:text-green-600 hover:border-green-200"
                                onClick={handleExportExcel}
                                disabled={sortedData.length === 0}
                            >
                                <FileSpreadsheet className="h-4 w-4" /> Excel
                            </Button>
                        </div>
                    </div>

                    {/* Data Table Preview */}
                    <Card className="overflow-hidden min-h-[500px] flex flex-col">
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium border-b">
                                    <tr>
                                        <th className="px-4 py-3 cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => requestSort('numero')}>
                                            <div className="flex items-center gap-1">Número <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => requestSort('data_emissao')}>
                                            <div className="flex items-center gap-1">Data Emissão <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:bg-muted" onClick={() => requestSort('cliente_nome')}>
                                            <div className="flex items-center gap-1">Cliente <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:bg-muted text-right" onClick={() => requestSort('valor_total')}>
                                            <div className="flex items-center justify-end gap-1">Valor Total <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:bg-muted text-center" onClick={() => requestSort('status')}>
                                            <div className="flex items-center justify-center gap-1">Status <ArrowUpDown className="h-3 w-3 opacity-50"/></div>
                                        </th>
                                        <th className="px-4 py-3 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-background">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                                                <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                                                <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                                                <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                                <td className="px-4 py-3 flex justify-center"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                                <td className="px-4 py-3"><Skeleton className="h-8 w-8 mx-auto" /></td>
                                            </tr>
                                        ))
                                    ) : paginatedData.length > 0 ? (
                                        paginatedData.map((row) => (
                                            <tr key={row.id} className="hover:bg-muted transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-foreground">
                                                    {row.numero}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {formatDate(row.data_emissao)}
                                                </td>
                                                <td className="px-4 py-3 text-foreground max-w-[200px] truncate" title={row.cliente_nome}>
                                                    {row.cliente_nome}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-foreground">
                                                    {formatCurrency(row.valor_total)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(row.status)}`}>
                                                        {row.status ? row.status.toUpperCase().replace('_', ' ') : 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                          <span className="sr-only">Abrir menu</span>
                                                          <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => navigate(`/vendas/${source === 'pedidos_venda' ? 'pedidos' : 'orcamentos'}/${row.id}`)}>
                                                          <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => navigate(`/vendas/${source === 'pedidos_venda' ? 'pedidos' : 'orcamentos'}/${row.id}/editar`)}>
                                                          <Edit className="mr-2 h-4 w-4" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-red-600">
                                                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Search className="h-10 w-10 opacity-20" />
                                                    <p>Nenhum dado encontrado para os filtros selecionados.</p>
                                                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                                                        Limpar Filtros
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination */}
                        <div className="p-4 border-t bg-muted flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                Mostrando {paginatedData.length > 0 ? ((page - 1) * ITEMS_PER_PAGE) + 1 : 0} a {Math.min(page * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length} registros
                            </span>
                            <div className="flex gap-1 items-center">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={page === 1} 
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Anterior
                                </Button>
                                <span className="text-xs font-medium px-2">
                                    Página {page} de {totalPages || 1}
                                </span>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={page >= totalPages} 
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Próximo
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const DollarIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);

const PercentIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
);

export default RelatoriosVendas;