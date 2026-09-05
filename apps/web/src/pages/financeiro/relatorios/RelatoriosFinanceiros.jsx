import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, Download, Table as TableIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';

import RelatoriosFinanceirosFilters from '@/pages/financeiro/relatorios/components/RelatoriosFinanceirosFilters';
import RelatoriosFinanceirosReportHeader from '@/pages/financeiro/relatorios/components/RelatoriosFinanceirosReportHeader';
import RelatoriosFinanceirosSummaries from '@/pages/financeiro/relatorios/components/RelatoriosFinanceirosSummaries';
import { exportToExcel, exportToPDF } from '@/pages/financeiro/relatorios/components/RelatoriosFinanceirosExportUtils';

const SOURCE_COLUMNS = {
  'CONTAS_PAGAR': [
    { id: 'numero', label: 'Nº Título', type: 'string' },
    { id: 'fornecedor_nome', label: 'Fornecedor', type: 'string' },
    { id: 'data_emissao', label: 'Emissão', type: 'date' },
    { id: 'data_vencimento', label: 'Vencimento', type: 'date' },
    { id: 'categoria_nome', label: 'Categoria', type: 'string' },
    { id: 'centro_custo_nome', label: 'C. Custo', type: 'string' },
    { id: 'valor_original', label: 'Valor', type: 'currency' },
    { id: 'status', label: 'Status', type: 'status' }
  ],
  'CONTAS_RECEBER': [
    { id: 'numero', label: 'Nº Título', type: 'string' },
    { id: 'cliente_nome', label: 'Cliente', type: 'string' },
    { id: 'data_emissao', label: 'Emissão', type: 'date' },
    { id: 'data_vencimento', label: 'Vencimento', type: 'date' },
    { id: 'categoria_nome', label: 'Categoria', type: 'string' },
    { id: 'centro_custo_nome', label: 'C. Custo', type: 'string' },
    { id: 'valor_original', label: 'Valor', type: 'currency' },
    { id: 'status', label: 'Status', type: 'status' }
  ]
};

const initialFilters = {
  dataInicio: '',
  dataFim: '',
  status: 'TODOS',
  entidadeId: 'TODOS',
  categoriaId: 'TODOS',
  subcategoriaId: 'TODOS',
  centroCustosId: 'TODOS',
  projetoId: 'TODOS',
  bancoId: 'TODOS',
  tipoPagamentoId: 'TODOS',
  condicaoPagamentoId: 'TODOS',
  tipoDocumentoId: 'TODOS',
  origemId: 'TODOS'
};

const RelatoriosFinanceiros = () => {
  const { toast } = useToast();
  
  // Custom Hook for Dropdowns
  const dropdowns = useFinanceiroDropdowns();

  // State Management
  const [source, setSource] = useState('CONTAS_PAGAR');
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('relatoriosFinFiltros');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return initialFilters;
  });

  const [filteredData, setFilteredData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    localStorage.setItem('relatoriosFinFiltros', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    // Fetch data on source change or initial load
    fetchReportData();
  }, [source]); 

  const fetchReportData = async () => {
    setLoadingData(true);
    try {
      const isPagar = source === 'CONTAS_PAGAR';
      const table = source.toLowerCase();

      // Build select query joining relations to get names for summaries
      let selectQuery = `*, 
         categoria:categorias(nome), 
         centro_custo:centros_custo(nome),
         subcategoria:subcategorias(nome),
         projeto:projetos(nome),
         banco:bancos(nome),
         tipo_pagamento:tipos_pagamento(nome),
         condicao_pagamento:condicoes_pagamento(nome),
         tipo_documento:tipos_documento(nome),
         origem:origens(nome)`;
         
      if (isPagar) {
        selectQuery += ', fornecedor:fornecedores(nome)';
      } else {
        selectQuery += ', cliente:clientes(nome)';
      }

      let query = supabase.from(table).select(selectQuery);

      // Apply Filters
      if (filters.dataInicio) query = query.gte('data_vencimento', filters.dataInicio);
      if (filters.dataFim) query = query.lte('data_vencimento', filters.dataFim);
      
      if (filters.status !== 'TODOS') {
        if (filters.status === 'PAGO') query = query.in('status', ['Pago', 'Recebido']);
        else query = query.not('status', 'in', '("Pago", "Recebido")');
      }
      
      if (filters.entidadeId !== 'TODOS') query = query.eq(isPagar ? 'fornecedor_id' : 'cliente_id', filters.entidadeId);
      if (filters.categoriaId !== 'TODOS') query = query.eq('categoria_id', filters.categoriaId);
      if (filters.subcategoriaId !== 'TODOS') query = query.eq('subcategoria_id', filters.subcategoriaId);
      if (filters.centroCustosId !== 'TODOS') query = query.eq('centro_custo_id', filters.centroCustosId);
      if (filters.projetoId !== 'TODOS') query = query.eq('projeto_id', filters.projetoId);
      if (filters.bancoId !== 'TODOS') query = query.eq('banco_id', filters.bancoId);
      if (filters.tipoPagamentoId !== 'TODOS') query = query.eq('tipo_pagamento_id', filters.tipoPagamentoId);
      if (filters.condicaoPagamentoId !== 'TODOS') query = query.eq('condicao_pagamento_id', filters.condicaoPagamentoId);
      if (filters.tipoDocumentoId !== 'TODOS') query = query.eq('tipo_documento_id', filters.tipoDocumentoId);
      if (filters.origemId !== 'TODOS') query = query.eq('origem_id', filters.origemId);

      // Ordering
      query = query.order('data_vencimento', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // Flatten relations for easier table/export use
      const flat = (data || []).map(item => ({
        ...item,
        fornecedor_nome: item.fornecedor?.nome || undefined,
        cliente_nome: item.cliente?.nome || undefined,
        categoria_nome: item.categoria?.nome || undefined,
        centro_custo_nome: item.centro_custo?.nome || undefined,
        subcategoria_nome: item.subcategoria?.nome || undefined,
        projeto_nome: item.projeto?.nome || undefined,
        banco_nome: item.banco?.nome || undefined,
        tipo_pagamento_nome: item.tipo_pagamento?.nome || undefined,
        condicao_pagamento_nome: item.condicao_pagamento?.nome || undefined,
        tipo_documento_nome: item.tipo_documento?.nome || undefined,
        origem_nome: item.origem?.nome || undefined
      }));

      setFilteredData(flat);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Falha ao gerar relatório: " + err.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const getFilterDescription = () => {
    const parts = [];
    if (filters.status !== 'TODOS') parts.push(`Status: ${filters.status}`);
    if (filters.categoriaId !== 'TODOS') parts.push(`Categoria: Específica`);
    if (filters.centroCustosId !== 'TODOS') parts.push(`Centro de Custo: Específico`);
    if (filters.entidadeId !== 'TODOS') parts.push(`Entidade: Específica`);
    // Count others
    let others = 0;
    ['subcategoriaId', 'projetoId', 'bancoId', 'tipoPagamentoId', 'condicaoPagamentoId', 'tipoDocumentoId', 'origemId'].forEach(k => {
      if (filters[k] !== 'TODOS') others++;
    });
    if (others > 0) parts.push(`+${others} filtros ativos`);
    return parts.length > 0 ? parts.join(' | ') : 'Sem filtros específicos aplicados';
  };

  const activeFiltersCount = Object.keys(filters).reduce((acc, key) => {
    if (key === 'dataInicio' || key === 'dataFim') return acc;
    return filters[key] !== 'TODOS' ? acc + 1 : acc;
  }, 0) + (filters.dataInicio || filters.dataFim ? 1 : 0);

  const dateRangeStr = (filters.dataInicio || filters.dataFim) 
    ? `${filters.dataInicio ? new Date(filters.dataInicio).toLocaleDateString('pt-BR') : 'Início'} até ${filters.dataFim ? new Date(filters.dataFim).toLocaleDateString('pt-BR') : 'Fim'}`
    : null;

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const title = `Relatório Financeiro - ${source === 'CONTAS_PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}`;
      await exportToPDF(filteredData, SOURCE_COLUMNS[source], title, getFilterDescription(), source);
      toast({ title: "Sucesso", description: "PDF gerado com sucesso." });
    } catch(e) {
      console.error(e);
      toast({ title: "Erro", description: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const title = `Relatório Financeiro - ${source === 'CONTAS_PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}`;
      await exportToExcel(filteredData, SOURCE_COLUMNS[source], title, getFilterDescription(), source);
      toast({ title: "Sucesso", description: "Excel gerado com sucesso." });
    } catch(e) {
      console.error(e);
      toast({ title: "Erro", description: "Erro ao gerar Excel", variant: "destructive" });
    } finally {
      setExportingExcel(false);
    }
  };

  if (dropdowns.loading) return <div className="p-16 text-center"><Loader2 className="animate-spin inline-block h-8 w-8 text-orange-500"/></div>;

  return (
    <div className="bg-background min-h-screen text-foreground font-sans pb-16">
      <Helmet><title>Relatórios Financeiros - ERP ENGAGEMENT</title></Helmet>
      
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        <RelatoriosFinanceirosReportHeader 
          title={`Relatório Financeiro - ${source === 'CONTAS_PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}`}
          dateRange={dateRangeStr}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={() => {
            setFilters(initialFilters);
          }}
        />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar: Settings & Filters */}
          <div className="w-full lg:w-80 space-y-6 shrink-0">
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardContent className="pt-6">
                <label className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-2 block">
                  Módulo de Relatório
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTAS_PAGAR">Contas a Pagar</SelectItem>
                    <SelectItem value="CONTAS_RECEBER">Contas a Receber</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <RelatoriosFinanceirosFilters 
              filters={filters}
              setFilters={setFilters}
              onApply={fetchReportData}
              onClear={() => setFilters(initialFilters)}
              dropdowns={dropdowns}
              source={source}
            />
          </div>

          {/* Right Content: Summaries & Actions */}
          <div className="flex-1 space-y-6 min-w-0">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center shadow-lg">
              <div className="text-slate-300">
                Mostrando <span className="font-bold text-white">{filteredData.length}</span> registros.
                {loadingData && <Loader2 className="inline-block ml-3 h-4 w-4 animate-spin text-orange-500" />}
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF} 
                  disabled={exportingPdf || loadingData || filteredData.length === 0} 
                  className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white flex-1 sm:flex-none"
                >
                  {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2 text-rose-500" />} 
                  Exportar PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportExcel} 
                  disabled={exportingExcel || loadingData || filteredData.length === 0} 
                  className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white flex-1 sm:flex-none"
                >
                  {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TableIcon className="h-4 w-4 mr-2 text-emerald-500" />} 
                  Exportar Excel
                </Button>
              </div>
            </div>

            {!loadingData && filteredData.length > 0 && (
              <RelatoriosFinanceirosSummaries data={filteredData} source={source} />
            )}

            {!loadingData && filteredData.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center shadow-lg flex flex-col items-center justify-center">
                <Filter className="h-12 w-12 text-slate-700 mb-4" />
                <h3 className="text-lg font-medium text-slate-300">Nenhum registro encontrado</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-md">
                  Tente ajustar seus filtros ou período de datas para visualizar os dados financeiros.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosFinanceiros;