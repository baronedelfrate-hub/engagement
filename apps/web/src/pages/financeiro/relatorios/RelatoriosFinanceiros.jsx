import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, Download, Table as TableIcon, Filter, Mail, MessageCircle } from 'lucide-react';
import EnviarEmailDialog from '@/components/EnviarEmailDialog';
import EnviarWhatsAppDialog from '@/components/EnviarWhatsAppDialog';
import { montarTextoPagamentos, listarChavesParaCopiar } from '@/lib/mensagemPagamentos';
import { mensagemRelatorioFinanceiro, blocoPagamentosDoRelatorio } from '@/lib/mensagemRelatorioFinanceiro';
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
import { formatDateOnly } from '@/lib/dateUtils';

const SOURCE_COLUMNS = {
  'CONTAS_PAGAR': [
    { id: 'numero', label: 'Nº Título', type: 'string' },
    { id: 'natureza', label: 'Natureza', type: 'string' },
    { id: 'fornecedor_nome', label: 'Fornecedor', type: 'string' },
    { id: 'data_emissao', label: 'Emissão', type: 'date' },
    { id: 'data_vencimento', label: 'Vencimento', type: 'date' },
    { id: 'categoria_nome', label: 'Categoria', type: 'string' },
    { id: 'centro_custo_nome', label: 'C. Custo', type: 'string' },
    { id: 'projeto_nome', label: 'Projeto', type: 'string' },
    { id: 'valor_original', label: 'Valor', type: 'currency' },
    { id: 'status', label: 'Status', type: 'status' }
  ],
  'CONTAS_RECEBER': [
    { id: 'numero', label: 'Nº Título', type: 'string' },
    { id: 'natureza', label: 'Natureza', type: 'string' },
    { id: 'cliente_nome', label: 'Cliente', type: 'string' },
    { id: 'data_emissao', label: 'Emissão', type: 'date' },
    { id: 'data_vencimento', label: 'Vencimento', type: 'date' },
    { id: 'categoria_nome', label: 'Categoria', type: 'string' },
    { id: 'centro_custo_nome', label: 'C. Custo', type: 'string' },
    { id: 'projeto_nome', label: 'Projeto', type: 'string' },
    { id: 'valor_original', label: 'Valor', type: 'currency' },
    { id: 'status', label: 'Status', type: 'status' }
  ]
};

const initialFilters = {
  dataInicio: '',
  dataFim: '',
  status: 'TODOS',
  natureza: 'TODOS', // TODOS | TITULO | PROVISAO
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
  const [emailAberto, setEmailAberto] = useState(false);
  const [zapAberto, setZapAberto] = useState(false);
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

  // Busca de novo sempre que o módulo ou qualquer filtro muda (o botão "Aplicar Filtros" continua valendo).
  // Sem isso o relatório e as exportações ficavam com os dados da primeira carga, ignorando as datas do filtro.
  useEffect(() => {
    const t = setTimeout(() => { fetchReportData(); }, 350);
    return () => clearTimeout(t);
  }, [source, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const pedidoAtual = useRef(0);

  const fetchReportData = async () => {
    const meuPedido = ++pedidoAtual.current;
    setLoadingData(true);
    try {
      const isPagar = source === 'CONTAS_PAGAR';

      // Lê a movimentação financeira: títulos reais e provisões em aberto (cancelados e provisões já substituídas ficam de fora)
      let selectQuery = `*,
         categoria:categorias(nome),
         centro_custo:centros_custo(nome),
         subcategoria:subcategorias(nome),
         projeto:projetos(nome, codigo),
         banco:bancos(nome)`;

      if (isPagar) {
        selectQuery += ', fornecedor:fornecedores(nome, chave_pix, tipo_chave_pix)';
      } else {
        selectQuery += ', cliente:clientes(nome)';
      }

      let query = supabase.from('movimentacao_financeira').select(selectQuery)
        .eq('tipo', isPagar ? 'pagar' : 'receber')
        .not('status', 'in', '(cancelado,substituido)');
      if (filters.natureza === 'TITULO') query = query.eq('provisao', false);
      else if (filters.natureza === 'PROVISAO') query = query.eq('provisao', true);

      // Apply Filters
      if (filters.dataInicio) query = query.gte('data_vencimento', filters.dataInicio);
      if (filters.dataFim) query = query.lte('data_vencimento', filters.dataFim);

      if (filters.status !== 'TODOS') {
        if (filters.status === 'PAGO') query = query.eq('status', 'pago');
        else query = query.neq('status', 'pago');
      }

      if (filters.entidadeId !== 'TODOS') query = query.eq(isPagar ? 'fornecedor_id' : 'cliente_id', filters.entidadeId);
      if (filters.categoriaId !== 'TODOS') query = query.eq('categoria_id', filters.categoriaId);
      if (filters.subcategoriaId !== 'TODOS') query = query.eq('subcategoria_id', filters.subcategoriaId);
      if (filters.centroCustosId !== 'TODOS') query = query.eq('centro_custo_id', filters.centroCustosId);
      if (filters.projetoId === 'SEM') query = query.is('projeto_id', null);
      else if (filters.projetoId !== 'TODOS') query = query.eq('projeto_id', filters.projetoId);
      if (filters.bancoId !== 'TODOS') query = query.eq('banco_id', filters.bancoId);

      // Ordering
      query = query.order('data_vencimento', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      // Flatten relations for easier table/export use
      const rotuloStatus = (s) => (s === 'pago' ? (isPagar ? 'Pago' : 'Recebido') : s === 'pago_parcial' ? 'Parcial' : s === 'vencido' ? 'Vencido' : 'Pendente');
      const flat = (data || []).map(item => ({
        ...item,
        numero: item.provisao ? String(item.numero_titulo || '').replace(/^PROV · /, '') : item.numero_titulo,
        natureza: item.provisao ? 'Provisão' : 'Título',
        valor_original: item.valor_total,
        status: rotuloStatus(item.status),
        fornecedor_nome: item.fornecedor?.nome || undefined,
        fornecedor_pix: item.fornecedor?.chave_pix || undefined,
        fornecedor_tipo_pix: item.fornecedor?.tipo_chave_pix || undefined,
        cliente_nome: item.cliente?.nome || undefined,
        categoria_nome: item.categoria?.nome || undefined,
        centro_custo_nome: item.centro_custo?.nome || undefined,
        subcategoria_nome: item.subcategoria?.nome || undefined,
        projeto_nome: item.projeto ? `${item.projeto.codigo ? item.projeto.codigo + ' - ' : ''}${item.projeto.nome}` : 'Não se aplica',
        banco_nome: item.banco?.nome || undefined
      }));

      if (meuPedido !== pedidoAtual.current) return; // chegou uma resposta mais nova: ignora esta
      setFilteredData(flat);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Falha ao gerar relatório: " + err.message, variant: "destructive" });
    } finally {
      if (meuPedido === pedidoAtual.current) setLoadingData(false);
    }
  };

  const getFilterDescription = () => {
    const parts = [];
    if (filters.dataInicio || filters.dataFim) parts.push(`Vencimento: ${filters.dataInicio ? formatDateOnly(filters.dataInicio) : 'início'} a ${filters.dataFim ? formatDateOnly(filters.dataFim) : 'fim'}`);
    if (filters.status !== 'TODOS') parts.push(`Status: ${filters.status}`);
    if (filters.natureza !== 'TODOS') parts.push(`Natureza: ${filters.natureza === 'PROVISAO' ? 'Só provisões' : 'Só títulos'}`);
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
    ? `${filters.dataInicio ? formatDateOnly(filters.dataInicio) : 'Início'} até ${filters.dataFim ? formatDateOnly(filters.dataFim) : 'Fim'}`
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
            <Card className="bg-background border-border shadow-xl">
              <CardContent className="pt-6">
                <label className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-2 block">
                  Módulo de Relatório
                </label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="bg-muted border-border text-white h-12">
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
            <div className="bg-background border border-border rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center shadow-lg">
              <div className="text-muted-foreground">
                Mostrando <span className="font-bold text-white">{filteredData.length}</span> registros.
                {loadingData && <Loader2 className="inline-block ml-3 h-4 w-4 animate-spin text-orange-500" />}
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF} 
                  disabled={exportingPdf || loadingData || filteredData.length === 0} 
                  className="bg-muted border-border text-foreground hover:bg-muted hover:text-foreground flex-1 sm:flex-none"
                >
                  {exportingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2 text-rose-500" />} 
                  Exportar PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportExcel} 
                  disabled={exportingExcel || loadingData || filteredData.length === 0} 
                  className="bg-muted border-border text-foreground hover:bg-muted hover:text-foreground flex-1 sm:flex-none"
                >
                  {exportingExcel ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TableIcon className="h-4 w-4 mr-2 text-emerald-500" />}
                  Exportar Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEmailAberto(true)}
                  disabled={loadingData || filteredData.length === 0}
                  className="bg-muted border-border text-foreground hover:bg-muted hover:text-foreground flex-1 sm:flex-none"
                >
                  <Mail className="h-4 w-4 mr-2 text-blue-500" />
                  Enviar por e-mail
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setZapAberto(true)}
                  disabled={loadingData || filteredData.length === 0}
                  className="bg-muted border-border text-foreground hover:bg-muted hover:text-foreground flex-1 sm:flex-none"
                >
                  <MessageCircle className="h-4 w-4 mr-2 text-emerald-500" />
                  WhatsApp
                </Button>
              </div>
            </div>

            {!loadingData && filteredData.length > 0 && (
              <RelatoriosFinanceirosSummaries data={filteredData} source={source} />
            )}

            <EnviarWhatsAppDialog
              open={zapAberto} onOpenChange={setZapAberto}
              titulo={`Enviar o relatório de ${source === 'CONTAS_PAGAR' ? 'contas a pagar' : 'contas a receber'} por WhatsApp`}
              descricao={getFilterDescription()}
              tipo="relatorio_pagar" refTipo="relatorio_financeiro" refId={null}
              blocoExtra={source === 'CONTAS_PAGAR' ? blocoPagamentosDoRelatorio(montarTextoPagamentos(filteredData), listarChavesParaCopiar(filteredData)) : null}
              mensagemInicial={mensagemRelatorioFinanceiro({ source, periodo: dateRangeStr, linhas: filteredData })}
              anexos={[{ rotulo: 'Relatório em PDF', gerar: () => exportToPDF(filteredData, SOURCE_COLUMNS[source], `Relatório Financeiro - ${source === 'CONTAS_PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}`, getFilterDescription(), source, { base64: true }) }]}
            />
            <EnviarEmailDialog
              open={emailAberto} onOpenChange={setEmailAberto}
              titulo={`Enviar o relatório de ${source === 'CONTAS_PAGAR' ? 'contas a pagar' : 'contas a receber'}`}
              descricao={getFilterDescription()}
              tipo="relatorio_pagar" refTipo="relatorio_financeiro" refId={null}
              assuntoInicial={`Relatório de ${source === 'CONTAS_PAGAR' ? 'contas a pagar' : 'contas a receber'}${dateRangeStr ? ` — ${dateRangeStr}` : ''}`}
              mensagemInicial={`Olá!\n\nSegue em anexo o relatório de ${source === 'CONTAS_PAGAR' ? 'contas a pagar' : 'contas a receber'}${dateRangeStr ? ` (${dateRangeStr})` : ''}, com o detalhamento dos títulos e os resumos por dia, ${source === 'CONTAS_PAGAR' ? 'fornecedor' : 'cliente'}, categoria e centro de custo.\n\nQualquer dúvida, é só responder este e-mail.\n\nUm abraço.`}
              destaques={[
                { rotulo: 'Registros', valor: String(filteredData.length) },
                { rotulo: 'Valor total', valor: filteredData.reduce((s, r) => s + Number(r.valor_original || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
                { rotulo: 'Filtros', valor: getFilterDescription() }
              ]}
              anexos={[{ rotulo: 'Relatório em PDF', gerar: () => exportToPDF(filteredData, SOURCE_COLUMNS[source], `Relatório Financeiro - ${source === 'CONTAS_PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}`, getFilterDescription(), source, { base64: true }) }]}
            />

            {!loadingData && filteredData.length === 0 && (
              <div className="bg-background border border-border rounded-xl p-16 text-center shadow-lg flex flex-col items-center justify-center">
                <Filter className="h-12 w-12 text-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-md">
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