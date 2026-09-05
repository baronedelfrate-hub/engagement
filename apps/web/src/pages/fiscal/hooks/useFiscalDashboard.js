import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useFiscalDashboard() {
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    empresa: 'all',
    tipoDocumento: 'all',
    status: 'all',
    fornecedor: 'all',
    cliente: 'all'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [data, setData] = useState({
    indicators: {
      totalNfe: 0,
      totalNfse: 0,
      totalEntrada: 0,
      pendentesManifestacao: 0,
      pendentesContabilidade: 0,
      totalImpostos: 0,
      totalPendencias: 0,
      variacaoNfe: null,
      variacaoNfse: null,
      variacaoEntrada: null
    },
    grids: {
      ultimasEmitidas: [],
      ultimasEntrada: [],
      pendentesManifestacao: [],
      pendenciasFiscais: []
    }
  });

  const [dropdowns, setDropdowns] = useState({
    empresas: [],
    fornecedores: [],
    clientes: []
  });

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDropdowns = async () => {
    try {
      const [empRes, fornRes, cliRes] = await Promise.all([
        supabase.from('empresas').select('id, razao_social'),
        supabase.from('fornecedores').select('id, nome'),
        supabase.from('clientes').select('id, nome')
      ]);

      setDropdowns({
        empresas: empRes.data || [],
        fornecedores: fornRes.data || [],
        clientes: cliRes.data || []
      });
    } catch (err) {
      console.error('Error fetching dropdowns:', err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const hoje = new Date().toISOString().split('T')[0];

      // Janelas para calcular a variação real "vs mês anterior"
      const now = new Date();
      const inicioMesAtual = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const fimMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      const countNfseMesAtual = supabase.from('notas_fiscais_servico').select('id', { count: 'exact', head: true }).gte('data_emissao', inicioMesAtual);
      const countNfseMesAnterior = supabase.from('notas_fiscais_servico').select('id', { count: 'exact', head: true }).gte('data_emissao', inicioMesAnterior).lte('data_emissao', fimMesAnterior);
      const countEntradaMesAtual = supabase.from('notas_fiscais_entrada').select('id', { count: 'exact', head: true }).gte('data_emissao', inicioMesAtual);
      const countEntradaMesAnterior = supabase.from('notas_fiscais_entrada').select('id', { count: 'exact', head: true }).gte('data_emissao', inicioMesAnterior).lte('data_emissao', fimMesAnterior);
      const countNfeProdutosMesAtual = supabase.from('nfe_produtos').select('id', { count: 'exact', head: true }).gte('data_emissao', inicioMesAtual);
      const countNfeProdutosMesAnterior = supabase.from('nfe_produtos').select('id', { count: 'exact', head: true }).gte('data_emissao', inicioMesAnterior).lte('data_emissao', fimMesAnterior);

      // Build base queries (últimas 10 para as listagens)
      let queryNfse = supabase.from('notas_fiscais_servico').select(`
        id, numero, data_emissao, valor_total, status,
        clientes (nome)
      `).order('data_emissao', { ascending: false }).limit(10);

      let queryEntradas = supabase.from('notas_fiscais_entrada').select(`
        id, numero_nfe, data_emissao, valor_total, status,
        fornecedores (nome)
      `).order('data_emissao', { ascending: false }).limit(10);

      // Contagens reais (para os indicadores), com os mesmos filtros de data
      let countNfse = supabase.from('notas_fiscais_servico').select('id', { count: 'exact', head: true });
      let countEntradas = supabase.from('notas_fiscais_entrada').select('id', { count: 'exact', head: true });
      let countNfeProdutos = supabase.from('nfe_produtos').select('id', { count: 'exact', head: true });

      if (filters.dataInicio) {
        queryNfse = queryNfse.gte('data_emissao', filters.dataInicio);
        queryEntradas = queryEntradas.gte('data_emissao', filters.dataInicio);
        countNfse = countNfse.gte('data_emissao', filters.dataInicio);
        countEntradas = countEntradas.gte('data_emissao', filters.dataInicio);
        countNfeProdutos = countNfeProdutos.gte('data_emissao', filters.dataInicio);
      }
      if (filters.dataFim) {
        queryNfse = queryNfse.lte('data_emissao', filters.dataFim);
        queryEntradas = queryEntradas.lte('data_emissao', filters.dataFim);
        countNfse = countNfse.lte('data_emissao', filters.dataFim);
        countEntradas = countEntradas.lte('data_emissao', filters.dataFim);
        countNfeProdutos = countNfeProdutos.lte('data_emissao', filters.dataFim);
      }

      // Pendentes Contabilidade: documentos com status 'Pendente'
      const countDocsPendentes = supabase
        .from('documentos_contabilidade')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pendente');

      // Impostos Apurados: soma do valor_apurado de todas as apurações
      const queryImpostos = supabase.from('apuracao_impostos').select('valor_apurado');

      // Pendências Fiscais reais: impostos apurados vencidos e ainda não pagos
      const queryImpostosAtrasados = supabase
        .from('apuracao_impostos')
        .select(`
          id, tipo_imposto, periodo_referencia, vencimento, valor_apurado, status,
          users!apuracao_impostos_responsavel_conferencia_id_fkey(nome)
        `)
        .neq('status', 'Pago')
        .lt('vencimento', hoje)
        .order('vencimento', { ascending: true });

      // Execute queries
      const [
        nfseRes, entradasRes,
        countNfseRes, countEntradasRes, countNfeProdutosRes,
        countDocsPendentesRes,
        impostosRes, impostosAtrasadosRes,
        countNfseMesAtualRes, countNfseMesAnteriorRes,
        countEntradaMesAtualRes, countEntradaMesAnteriorRes,
        countNfeProdutosMesAtualRes, countNfeProdutosMesAnteriorRes
      ] = await Promise.all([
        queryNfse, queryEntradas,
        countNfse, countEntradas, countNfeProdutos,
        countDocsPendentes,
        queryImpostos, queryImpostosAtrasados,
        countNfseMesAtual, countNfseMesAnterior,
        countEntradaMesAtual, countEntradaMesAnterior,
        countNfeProdutosMesAtual, countNfeProdutosMesAnterior
      ]);

      if (nfseRes.error) throw nfseRes.error;
      if (entradasRes.error) throw entradasRes.error;
      if (countNfseRes.error) throw countNfseRes.error;
      if (countEntradasRes.error) throw countEntradasRes.error;
      if (countNfeProdutosRes.error) throw countNfeProdutosRes.error;
      if (countDocsPendentesRes.error) throw countDocsPendentesRes.error;
      if (impostosRes.error) throw impostosRes.error;
      if (impostosAtrasadosRes.error) throw impostosAtrasadosRes.error;

      // Variação real "vs mês anterior" (null quando não há base de comparação)
      const calcVariacao = (atual, anterior) => {
        if (!anterior) return null;
        return Math.round(((atual - anterior) / anterior) * 100);
      };
      const variacaoNfse = calcVariacao(countNfseMesAtualRes.count || 0, countNfseMesAnteriorRes.count || 0);
      const variacaoEntrada = calcVariacao(countEntradaMesAtualRes.count || 0, countEntradaMesAnteriorRes.count || 0);
      const variacaoNfe = calcVariacao(countNfeProdutosMesAtualRes.count || 0, countNfeProdutosMesAnteriorRes.count || 0);

      const emitidas = (nfseRes.data || []).map(n => ({
        id: n.id,
        numero: n.numero,
        data: n.data_emissao,
        cliente: n.clientes?.nome || 'Não informado',
        tipo: 'NFS-e',
        valor: n.valor_total,
        status: n.status || 'Autorizado'
      }));

      const entradas = (entradasRes.data || []).map(e => ({
        id: e.id,
        numero: e.numero_nfe,
        data: e.data_emissao,
        fornecedor: e.fornecedores?.nome || 'Não informado',
        valor: e.valor_total,
        status_manifestacao: e.status || 'Pendente'
      }));

      // Pendentes de manifestação: entradas ainda não manifestadas, com dias de atraso reais
      // (calculado a partir da data de emissão, já que é o dado de data disponível nessa consulta)
      const pendentesManif = entradas
        .filter(e => e.status_manifestacao === 'Pendente')
        .map(e => ({
          ...e,
          dias_pendente: e.data
            ? Math.max(0, Math.floor((new Date(hoje) - new Date(e.data)) / (1000 * 60 * 60 * 24)))
            : 0
        }));

      // Pendências fiscais reais: apurações de impostos vencidas e não pagas
      const pendenciasFiscais = (impostosAtrasadosRes.data || []).map(p => ({
        id: p.id,
        tipo: p.tipo_imposto,
        descricao: `${p.tipo_imposto} referente a ${p.periodo_referencia || 'período não informado'}`,
        data: p.vencimento,
        valor: p.valor_apurado,
        responsavel: p.users?.nome || 'Não atribuído',
        status: 'Atrasado'
      }));

      const totalImpostos = (impostosRes.data || []).reduce(
        (acc, item) => acc + (parseFloat(item.valor_apurado) || 0), 0
      );

      setData({
        indicators: {
          totalNfe: countNfeProdutosRes.count || 0,
          totalNfse: countNfseRes.count || 0,
          totalEntrada: countEntradasRes.count || 0,
          pendentesManifestacao: pendentesManif.length,
          pendentesContabilidade: countDocsPendentesRes.count || 0,
          totalImpostos,
          totalPendencias: pendenciasFiscais.length,
          variacaoNfe,
          variacaoNfse,
          variacaoEntrada
        },
        grids: {
          ultimasEmitidas: emitidas,
          ultimasEntrada: entradas,
          pendentesManifestacao: pendentesManif,
          pendenciasFiscais
        }
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, filters, setFilters, loading, error, dropdowns };
}