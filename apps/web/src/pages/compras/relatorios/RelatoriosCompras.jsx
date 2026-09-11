import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
    FileText, Settings, Save, Table, AlertTriangle,
    FilterX, Download, Search, FileSpreadsheet, DollarSign
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { exportToExcel, exportToPDF } from '@/lib/exportUtils';
import SelecionarColunasCompras from './components/SelecionarColunasCompras';
import { saveTemplate, getTemplates } from '@/lib/reportTemplates';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/lib/dateUtils';

// Full superset of all possible columns for any source
const ALL_COLUMNS_DEF = [
    { id: 'id', label: 'ID Interno', type: 'string' },
    { id: 'numero', label: 'Nº Pedido / Nota', type: 'string' },
    { id: 'dataEmissao', label: 'Data', type: 'date' },
    { id: 'fornecedorNome', label: 'Fornecedor', type: 'string' },
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'valorTotal', label: 'Valor Total', type: 'currency' },
    { id: 'dataEntrega', label: 'Data Entrega/Prev.', type: 'date' },
    { id: 'observacoes', label: 'Observações', type: 'string' },
    { id: 'serie', label: 'Série', type: 'string' },
    { id: 'produtoNome', label: 'Produto', type: 'string' },
    { id: 'quantidade', label: 'Quantidade', type: 'number' },
    { id: 'referencia', label: 'Referência', type: 'string' },
    { id: 'tipo', label: 'Tipo Divergência', type: 'string' },
    { id: 'descricao', label: 'Descrição', type: 'string' },
    { id: 'justificativa', label: 'Justificativa', type: 'string' },
];

const RelatoriosCompras = () => {
    const { toast } = useToast();

    // State
    const [source, setSource] = useState('PEDIDOS_COMPRA');
    const [filters, setFilters] = useState({
        dataInicio: '',
        dataFim: '',
        fornecedorId: 'TODOS',
        status: 'TODOS',
        faixaValorMin: '',
        faixaValorMax: '',
    });

    const [fornecedores, setFornecedores] = useState([]);

    const [rawData, setRawData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [previewPage, setPreviewPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Columns Config
    const [selectedColumnIds, setSelectedColumnIds] = useState([]);
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

    // Templates
    const [templateName, setTemplateName] = useState('');
    const [savedTemplates, setSavedTemplates] = useState([]);

    // Initialization
    useEffect(() => {
        supabase.from('fornecedores').select('id, nome').then(({ data }) => setFornecedores(data || []));
        setSavedTemplates(getTemplates().filter(t => t.config?.module === 'COMPRAS'));
    }, []);

    // Source Change Effects
    useEffect(() => {
        let defaultCols = [];
        if (source === 'PEDIDOS_COMPRA') {
            defaultCols = ['numero', 'dataEmissao', 'fornecedorNome', 'status', 'valorTotal'];
        } else if (source === 'NOTAS_FISCAIS') {
            defaultCols = ['numero', 'serie', 'dataEmissao', 'fornecedorNome', 'valorTotal', 'status'];
        } else if (source === 'RECEBIMENTOS') {
            defaultCols = ['produtoNome', 'quantidade', 'dataEmissao', 'referencia'];
        } else if (source === 'DIVERGENCIAS') {
            defaultCols = ['numero', 'fornecedorNome', 'tipo', 'descricao', 'justificativa'];
        }

        setSelectedColumnIds(defaultCols);
        loadData(source);
    }, [source]);

    // Filtering Effect
    useEffect(() => {
        applyFilters();
    }, [filters, rawData]);

    const loadData = async (currentSource) => {
        try {
            if (currentSource === 'PEDIDOS_COMPRA') {
                const { data, error } = await supabase.from('pedidos_compra').select('*, fornecedores(nome)');
                if (error) throw error;
                setRawData((data || []).map(p => ({
                    ...p,
                    numero: p.numero,
                    dataEmissao: p.data_pedido,
                    dataEntrega: p.data_entrega,
                    fornecedorNome: p.fornecedores?.nome || 'N/D',
                    valorTotal: parseFloat(p.valor_total || 0),
                })));
            }
            else if (currentSource === 'NOTAS_FISCAIS') {
                const { data, error } = await supabase.from('notas_fiscais_entrada').select('*, fornecedores(nome)');
                if (error) throw error;
                setRawData((data || []).map(n => ({
                    ...n,
                    numero: n.numero_nfe,
                    dataEmissao: n.data_emissao,
                    fornecedorNome: n.fornecedores?.nome || 'N/D',
                    valorTotal: parseFloat(n.valor_total || 0),
                })));
            }
            else if (currentSource === 'RECEBIMENTOS') {
                const { data, error } = await supabase.from('entradas_estoque').select('*, produtos(nome)');
                if (error) throw error;
                setRawData((data || []).map(e => ({
                    ...e,
                    dataEmissao: e.data_entrada,
                    produtoNome: e.produtos?.nome || 'Produto Removido',
                    valorTotal: parseFloat(e.valor_total || 0),
                })));
            }
            else if (currentSource === 'DIVERGENCIAS') {
                const { data, error } = await supabase.from('nf_divergencia').select('*, notas_fiscais_entrada(numero_nfe, fornecedor_id, fornecedores(nome))');
                if (error) throw error;
                setRawData((data || []).map(d => ({
                    ...d,
                    numero: d.notas_fiscais_entrada?.numero_nfe || '-',
                    fornecedorNome: d.notas_fiscais_entrada?.fornecedores?.nome || 'N/D',
                    dataEmissao: d.created_at,
                })));
            }
        } catch (error) {
            console.error('[RelatoriosCompras] Erro ao carregar dados:', error);
            toast({ title: "Erro", description: "Não foi possível carregar os dados do relatório.", variant: "destructive" });
            setRawData([]);
        }
    };

    const applyFilters = () => {
        let res = [...rawData];

        if (filters.dataInicio) res = res.filter(i => i.dataEmissao >= filters.dataInicio);
        if (filters.dataFim) res = res.filter(i => i.dataEmissao <= filters.dataFim);
        if (filters.fornecedorId !== 'TODOS') res = res.filter(i => i.fornecedor_id === filters.fornecedorId);
        if (filters.status !== 'TODOS') res = res.filter(i => i.status === filters.status);
        if (filters.faixaValorMin) res = res.filter(i => (i.valorTotal || 0) >= parseFloat(filters.faixaValorMin));
        if (filters.faixaValorMax) res = res.filter(i => (i.valorTotal || 0) <= parseFloat(filters.faixaValorMax));

        setFilteredData(res);
        setPreviewPage(1);
    };

    const resetFilters = () => {
        setFilters({
            dataInicio: '',
            dataFim: '',
            fornecedorId: 'TODOS',
            status: 'TODOS',
            faixaValorMin: '',
            faixaValorMax: '',
        });
        toast({ title: "Filtros limpos" });
    };

    const getActiveColumns = () => {
        return selectedColumnIds.map(id => ALL_COLUMNS_DEF.find(c => c.id === id)).filter(Boolean);
    };

    const paginatedData = useMemo(() => {
        const start = (previewPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, previewPage]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

    // Statistics
    const stats = useMemo(() => {
        const total = filteredData.reduce((acc, curr) => acc + parseFloat(curr.valorTotal || 0), 0);
        const avg = filteredData.length > 0 ? total / filteredData.length : 0;

        return { count: filteredData.length, total, avg };
    }, [filteredData]);

    const handleSaveTemplate = () => {
        if (!templateName) return toast({ title: "Nome obrigatório", variant: "destructive" });
        saveTemplate(templateName, { module: 'COMPRAS', source, filters, selectedColumnIds });
        setSavedTemplates(getTemplates().filter(t => t.config?.module === 'COMPRAS'));
        setTemplateName('');
        toast({ title: "Template salvo!" });
    };

    const handleLoadTemplate = (tpl) => {
        setSource(tpl.config.source);
        setFilters(tpl.config.filters);
        setSelectedColumnIds(tpl.config.selectedColumnIds);
        toast({ title: `Template ${tpl.name} carregado` });
    };

    const generateDesc = () => {
        return `Fonte: ${source} | Filtros Ativos: ${filteredData.length !== rawData.length ? 'Sim' : 'Não'}`;
    };

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <Helmet>
                <title>Relatórios de Compras - ERP</title>
            </Helmet>

            <PageHeader
                title="Relatórios de Compras"
                description="Análise completa de aquisições, pedidos e notas fiscais"
            />

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Sidebar Controls */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Source Selection */}
                    <Card>
                        <CardHeader className="py-3"><CardTitle className="text-sm uppercase text-muted-foreground">Fonte de Dados</CardTitle></CardHeader>
                        <CardContent>
                            <Select value={source} onValueChange={setSource}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PEDIDOS_COMPRA">Pedidos de Compra</SelectItem>
                                    <SelectItem value="NOTAS_FISCAIS">Notas Fiscais (Entrada)</SelectItem>
                                    <SelectItem value="RECEBIMENTOS">Recebimentos / Entradas</SelectItem>
                                    <SelectItem value="DIVERGENCIAS">Divergências (NFe)</SelectItem>
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    {/* Filters */}
                    <Card>
                        <CardHeader className="py-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm uppercase text-muted-foreground">Filtros</CardTitle>
                            <Button variant="ghost" size="xs" onClick={resetFilters}><FilterX className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label className="text-xs">Período</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="date" className="text-xs" value={filters.dataInicio} onChange={e => setFilters({...filters, dataInicio: e.target.value})} />
                                    <Input type="date" className="text-xs" value={filters.dataFim} onChange={e => setFilters({...filters, dataFim: e.target.value})} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Fornecedor</Label>
                                <Select value={filters.fornecedorId} onValueChange={v => setFilters({...filters, fornecedorId: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TODOS">Todos</SelectItem>
                                        {fornecedores.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Status</Label>
                                <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TODOS">Todos</SelectItem>
                                        <SelectItem value="Aberto">Aberto</SelectItem>
                                        <SelectItem value="Pendente">Pendente</SelectItem>
                                        <SelectItem value="Em_Entrada">Em Entrada</SelectItem>
                                        <SelectItem value="Concluida">Concluída</SelectItem>
                                        <SelectItem value="Concluido">Concluído</SelectItem>
                                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                                        <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Valor Min</Label>
                                    <Input type="number" className="h-8 text-xs" placeholder="0.00" value={filters.faixaValorMin} onChange={e => setFilters({...filters, faixaValorMin: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Valor Max</Label>
                                    <Input type="number" className="h-8 text-xs" placeholder="Max" value={filters.faixaValorMax} onChange={e => setFilters({...filters, faixaValorMax: e.target.value})} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Templates */}
                    <Card>
                        <CardHeader className="py-3"><CardTitle className="text-sm uppercase text-muted-foreground">Templates</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mb-3">
                                <Input placeholder="Nome..." value={templateName} onChange={e => setTemplateName(e.target.value)} className="h-8 text-xs" />
                                <Button size="sm" onClick={handleSaveTemplate} variant="secondary"><Save className="h-3 w-3" /></Button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {savedTemplates.map(t => (
                                    <div key={t.id} onClick={() => handleLoadTemplate(t)} className="text-xs p-1.5 hover:bg-muted rounded cursor-pointer truncate border border-transparent hover:border-border">
                                        {t.name}
                                    </div>
                                ))}
                                {savedTemplates.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhum template salvo.</span>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="xl:col-span-3 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Registros</p>
                                    <h3 className="text-2xl font-bold">{stats.count}</h3>
                                </div>
                                <Table className="h-8 w-8 text-blue-500 opacity-50" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase">Valor Total</p>
                                    <h3 className="text-2xl font-bold text-red-600">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                </div>
                                <DollarSign className="h-8 w-8 text-red-500 opacity-50" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-background p-4 rounded-lg border shadow-sm flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                {filteredData.length} registros
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsColumnModalOpen(true)} className="gap-2">
                                <Settings className="h-4 w-4" /> Colunas
                            </Button>
                            <Button
                                variant="outline"
                                className="gap-2 hover:text-red-600 hover:border-red-200 dark:hover:text-red-400 dark:hover:border-red-800"
                                onClick={() => exportToPDF(filteredData, getActiveColumns(), `Relatório Compras - ${source}`, generateDesc())}
                            >
                                <FileText className="h-4 w-4" /> PDF
                            </Button>
                            <Button
                                variant="outline"
                                className="gap-2 hover:text-green-600 hover:border-green-200 dark:hover:text-green-400 dark:hover:border-green-800"
                                onClick={() => exportToExcel(filteredData, getActiveColumns(), `Relatório Compras - ${source}`, generateDesc())}
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
                                        {getActiveColumns().map(col => (
                                            <th key={col.id} className="px-4 py-3 whitespace-nowrap text-xs uppercase tracking-wider">
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-muted transition-colors">
                                            {getActiveColumns().map(col => (
                                                <td key={col.id} className="px-4 py-2 whitespace-nowrap text-foreground">
                                                    {renderCell(row, col)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={getActiveColumns().length} className="p-12 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search className="h-10 w-10 opacity-20" />
                                                    <p>Nenhum dado encontrado.</p>
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
                                Página {previewPage} de {totalPages || 1}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={previewPage === 1}
                                    onClick={() => setPreviewPage(p => p - 1)}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={previewPage >= totalPages}
                                    onClick={() => setPreviewPage(p => p + 1)}
                                >
                                    Próximo
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <SelecionarColunasCompras
                isOpen={isColumnModalOpen}
                onClose={() => setIsColumnModalOpen(false)}
                allColumns={ALL_COLUMNS_DEF}
                selectedColumnIds={selectedColumnIds}
                onSave={setSelectedColumnIds}
            />
        </div>
    );
};

const renderCell = (row, col) => {
    const val = row[col.id];
    if (val === null || val === undefined) return '-';

    if (col.type === 'date') {
        return formatDateOnly(val);
    }
    if (col.type === 'currency') {
        return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (col.type === 'status') {
        const colors = {
            'Aberto': 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
            'Recebido': 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400',
            'Concluida': 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400',
            'Concluido': 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400',
            'Cancelado': 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400',
            'Pendente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400',
            'Rejeitada': 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[val] || 'bg-muted'}`}>{val}</span>;
    }
    return val;
};

export default RelatoriosCompras;
