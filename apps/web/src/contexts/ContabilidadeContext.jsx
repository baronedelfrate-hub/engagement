import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { formatCompetencia } from '@/lib/fechamentoUtils';

const ContabilidadeContext = createContext();

export const useContabilidade = () => {
  const context = useContext(ContabilidadeContext);
  if (!context) {
    throw new Error('useContabilidade must be used within a ContabilidadeProvider');
  }
  return context;
};

export const ContabilidadeProvider = ({ children }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  
  const [filtros, setFiltros] = useState({
    periodo: format(new Date(), 'MM/yyyy'),
    empresa_id: 'all',
    status: 'Todos'
  });

  const [dashboardData, setDashboardData] = useState({
    summary: {
      documentosPendentes: { total: 0, nfe: 0, nfse: 0, outros: 0 },
      fechamentosAberto: { total: 0, mesAtual: 0, mesesAnteriores: 0 },
      lancamentosPendentes: { total: 0, automaticos: 0, manuais: 0 },
      nfNaoVinculadas: { total: 0, nfe: 0, nfse: 0 },
      conciliacoesPendentes: { total: 0, bancaria: 0, fiscal: 0, outras: 0 },
      relatoriosDisponiveis: { total: 0, dre: 0, balancete: 0, outros: 0 }
    },
    grids: {
      pendenciasMes: [],
      ultimosDocumentos: [],
      ultimosFechamentos: [],
      ultimosRelatorios: []
    }
  });

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true);
      if (data) setEmpresas(data);
    };
    fetchEmpresas();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let empresaFilter = filtros.empresa_id !== 'all' ? filtros.empresa_id : null;
      // filtros.periodo vem no formato de exibição MM/yyyy, mas fechamentos_contabeis (e as
      // demais tabelas do módulo) gravam competencia no formato yyyy-MM (padrão do <input type="month">).
      const [mesFiltro, anoFiltro] = filtros.periodo.split('/');
      const competenciaFiltro = mesFiltro && anoFiltro ? `${anoFiltro}-${mesFiltro}` : null;

      // Bases queries
      let nfeQuery = supabase.from('nfe_produtos').select('id, integrado_contabil, created_at, status');
      let nfseQuery = supabase.from('nfse_servicos').select('id, integrado_contabil, created_at, status');
      let fechamentosQuery = supabase.from('fechamentos_contabeis').select('*');
      let lancamentosQuery = supabase.from('lancamentos_contabeis').select('*, responsavel_id');
      let conciliacoesQuery = supabase.from('conciliacoes_contabeis').select('*, responsavel_id');
      let docsEnviadosQuery = supabase.from('documentos_contabilidade').select('*').order('data_envio', { ascending: false }).limit(20);
      let apuracoesQuery = supabase.from('apuracao_impostos').select('*').order('created_at', { ascending: false }).limit(20);
      let todosDocsQuery = supabase.from('documentos_contabilidade').select('empresa_id, competencia');
      let dreQuery = supabase.from('dre_dados').select('empresa_id, competencia, created_at').order('created_at', { ascending: false });
      let balanceteQuery = supabase.from('balancete_dados').select('empresa_id, competencia, created_at').order('created_at', { ascending: false });

      if (empresaFilter) {
        nfeQuery = nfeQuery.eq('empresa_id', empresaFilter);
        nfseQuery = nfseQuery.eq('empresa_id', empresaFilter);
        fechamentosQuery = fechamentosQuery.eq('empresa_id', empresaFilter);
        lancamentosQuery = lancamentosQuery.eq('empresa_id', empresaFilter);
        conciliacoesQuery = conciliacoesQuery.eq('empresa_id', empresaFilter);
        docsEnviadosQuery = docsEnviadosQuery.eq('empresa_id', empresaFilter);
        apuracoesQuery = apuracoesQuery.eq('empresa_id', empresaFilter);
        todosDocsQuery = todosDocsQuery.eq('empresa_id', empresaFilter);
        dreQuery = dreQuery.eq('empresa_id', empresaFilter);
        balanceteQuery = balanceteQuery.eq('empresa_id', empresaFilter);
      }

      const [
        { data: nfeData },
        { data: nfseData },
        { data: fechamentosData },
        { data: lancamentosData },
        { data: conciliacoesData },
        { data: docsEnviadosData },
        { data: apuracoesData },
        { data: todosDocsData },
        { data: dreData },
        { data: balanceteData }
      ] = await Promise.all([
        nfeQuery, nfseQuery, fechamentosQuery, lancamentosQuery, conciliacoesQuery, docsEnviadosQuery, apuracoesQuery,
        todosDocsQuery, dreQuery, balanceteQuery
      ]);

      const nfePendentes = (nfeData || []).filter(n => !n.integrado_contabil && n.status !== 'Cancelada').length;
      const nfsePendentes = (nfseData || []).filter(n => !n.integrado_contabil && n.status !== 'Cancelada').length;
      const fechamentosAbertos = (fechamentosData || []).filter(f => f.status?.toLowerCase() !== 'concluído');
      const lancPendentes = (lancamentosData || []).filter(l => l.status?.toLowerCase() === 'pendente');
      const concPendentes = (conciliacoesData || []).filter(c => c.status?.toLowerCase() === 'pendente');

      let pendenciasMesGrid = [
        ...(lancPendentes || []).map(l => ({ id: l.id, tipo: 'Lançamento Contábil', descricao: l.descricao, data: l.data, status: l.status, responsavel: 'Sistema' })),
        ...(concPendentes || []).map(c => ({ id: c.id, tipo: 'Conciliação ' + c.tipo, descricao: `Pendente conciliação ${c.tipo}`, data: c.data_criacao, status: c.status, responsavel: 'Sistema' }))
      ].sort((a, b) => new Date(b.data) - new Date(a.data));

      if (filtros.status !== 'Todos') {
        pendenciasMesGrid = pendenciasMesGrid.filter(p => p.status?.toLowerCase() === filtros.status.toLowerCase());
      }

      let ultimosFechamentosGrid = (fechamentosData || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(f => {
        const documentos = (todosDocsData || []).filter(d => d.empresa_id === f.empresa_id && d.competencia === f.competencia).length;
        return { id: f.id, periodo: formatCompetencia(f.competencia), data_fechamento: f.data_fechamento, status: f.status, responsavel: 'Admin', documentos };
      });

      // Relatórios disponíveis: apurações reais + competências que já têm DRE/Balancete real gerado
      // (dedupe por empresa+competência, já que dre_dados/balancete_dados têm 1 linha por conta/grupo, não por relatório)
      const dedupeByCompetencia = (rows) => {
        const map = new Map();
        (rows || []).forEach(r => {
          const key = `${r.empresa_id}|${r.competencia}`;
          if (!map.has(key)) map.set(key, r);
        });
        return [...map.values()];
      };

      let ultimosRelatoriosGrid = [
        ...(apuracoesData || []).map(a => ({
          id: a.id, tipo: `Apuração ${a.tipo_imposto}`, descricao: `Apuração do período ${a.periodo_referencia}`, data_geracao: a.created_at, periodo: a.periodo_referencia, status: a.status || 'Concluído'
        })),
        ...dedupeByCompetencia(dreData).map(d => ({
          id: `dre-${d.empresa_id}-${d.competencia}`, tipo: 'DRE', descricao: 'Demonstração do Resultado do Exercício', data_geracao: d.created_at, periodo: formatCompetencia(d.competencia), status: 'Disponível'
        })),
        ...dedupeByCompetencia(balanceteData).map(b => ({
          id: `bal-${b.empresa_id}-${b.competencia}`, tipo: 'Balancete', descricao: 'Balancete de Verificação', data_geracao: b.created_at, periodo: formatCompetencia(b.competencia), status: 'Disponível'
        }))
      ].sort((a, b) => new Date(b.data_geracao) - new Date(a.data_geracao));

      const totalDre = dedupeByCompetencia(dreData).length;
      const totalBalancete = dedupeByCompetencia(balanceteData).length;

      setDashboardData({
        summary: {
          documentosPendentes: { total: nfePendentes + nfsePendentes, nfe: nfePendentes, nfse: nfsePendentes, outros: 0 },
          fechamentosAberto: { total: fechamentosAbertos.length, mesAtual: fechamentosAbertos.filter(f => f.competencia === competenciaFiltro).length, mesesAnteriores: fechamentosAbertos.filter(f => f.competencia !== competenciaFiltro).length },
          lancamentosPendentes: { total: lancPendentes.length, manuais: lancPendentes.filter(l => l.origem?.toLowerCase().includes('manual')).length, automaticos: lancPendentes.filter(l => !l.origem?.toLowerCase().includes('manual')).length },
          nfNaoVinculadas: { total: nfePendentes + nfsePendentes, nfe: nfePendentes, nfse: nfsePendentes },
          conciliacoesPendentes: { total: concPendentes.length, bancaria: concPendentes.filter(c => c.tipo?.toLowerCase() === 'bancária').length, fiscal: concPendentes.filter(c => c.tipo?.toLowerCase() === 'fiscal').length, outras: concPendentes.filter(c => c.tipo?.toLowerCase() !== 'bancária' && c.tipo?.toLowerCase() !== 'fiscal').length },
          relatoriosDisponiveis: { total: ultimosRelatoriosGrid.length, dre: totalDre, balancete: totalBalancete, outros: (apuracoesData || []).length }
        },
        grids: {
          pendenciasMes: pendenciasMesGrid,
          ultimosDocumentos: docsEnviadosData || [],
          ultimosFechamentos: ultimosFechamentosGrid,
          ultimosRelatorios: ultimosRelatoriosGrid
        }
      });
      
    } catch (error) {
      console.error('Error fetching contabilidade dashboard:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados contábeis.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filtros, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const value = {
    filtros,
    setFiltros,
    empresas,
    dashboardData,
    loading,
    refreshData: fetchDashboardData
  };

  return <ContabilidadeContext.Provider value={value}>{children}</ContabilidadeContext.Provider>;
};