// Nome da empresa e texto dos filtros das telas gerenciais, para o cabeçalho dos PDFs.
import { supabase } from '@/lib/customSupabaseClient';

export const buscarNomeEmpresa = async (empresaId, fallback = '') => {
  try {
    const { data } = await supabase.from('empresas').select('razao_social, nome_fantasia').eq('id', empresaId).maybeSingle();
    return data?.razao_social || data?.nome_fantasia || fallback;
  } catch { return fallback; }
};

// dados = retorno de useDadosGerenciais
export const rotulosFiltros = ({ bancoId, bancos = [], projetoId, projetos = [], centroCustoId, centros = [] }) => ({
  banco: bancoId === 'TODOS' ? 'Todos' : (bancos.find((b) => b.id === bancoId)?.nome || ''),
  projeto: projetoId === 'TODOS' ? 'Todas' : projetoId === 'SEM' ? 'Sem projeto' : (projetos.find((p) => p.id === projetoId)?.nome || ''),
  centro: centroCustoId === 'TODOS' ? 'Todos' : centroCustoId === 'SEM' ? 'Sem centro de custo' : (centros.find((c) => c.id === centroCustoId)?.nome || '')
});
