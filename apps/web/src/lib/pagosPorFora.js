// Pagamentos feitos "por fora" (portador externo, sem banco): não existem no extrato de nenhum banco, mas contam no resultado da empresa.
// Devolve linhas no mesmo formato do extrato ({ id, data_transacao, valor, categoria_id, subcategoria_id, ... }) para as telas gerenciais somarem junto.
// O juros da baixa vira uma linha própria em Despesas financeiras (a parcela em si segue a categoria da baixa).
import { supabase } from '@/lib/customSupabaseClient';

const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const buscarPagosPorFora = async (companyId, { de, ate, projetoId = 'TODOS', centroCustoId = 'TODOS' } = {}) => {
  const { data: ext } = await supabase.from('bancos').select('id').eq('company_id', companyId).eq('tipo_conta', 'Portador externo');
  if (!ext?.length) return [];
  let q = supabase.from('movimentacao_baixas')
    .select('id, data_baixa, valor_baixa, valor_juros, valor_desconto, categoria_id, subcategoria_id, projeto_id, centro_custo_id, movimentacao:movimentacao_financeira(tipo)')
    .eq('company_id', companyId).in('banco_id', ext.map((b) => b.id)).gte('data_baixa', de).lte('data_baixa', ate).limit(2000);
  if (projetoId === 'SEM') q = q.is('projeto_id', null); else if (projetoId !== 'TODOS') q = q.eq('projeto_id', projetoId);
  if (centroCustoId === 'SEM') q = q.is('centro_custo_id', null); else if (centroCustoId !== 'TODOS') q = q.eq('centro_custo_id', centroCustoId);
  const { data: baixas, error } = await q;
  if (error || !baixas?.length) return [];

  // onde lançar o juros: a categoria de despesas financeiras da empresa (subcategoria "Juros e multas…", se existir)
  const { data: cats } = await supabase.from('categorias').select('id').eq('company_id', companyId).eq('grupo_dre', 'desp_financeira').limit(1);
  const catJuros = cats?.[0]?.id || null;
  let subAtraso = null; let subEmprestimo = null;
  if (catJuros) {
    const { data: subs } = await supabase.from('subcategorias').select('id, nome').eq('categoria_id', catJuros);
    subAtraso = (subs || []).find((s) => /juros e multas/i.test(s.nome))?.id || (subs || []).find((s) => /juros/i.test(s.nome))?.id || null;
    subEmprestimo = (subs || []).find((s) => /empr[eé]stimo|financiamento/i.test(s.nome))?.id || subAtraso;
  }
  // parcela de empréstimo: o juros vai para "Juros de empréstimos e financiamentos"
  const { data: todasCats } = await supabase.from('categorias').select('id, grupo_dre').eq('company_id', companyId);
  const grupoDe = new Map((todasCats || []).map((c) => [c.id, c.grupo_dre]));

  const linhas = [];
  for (const b of baixas) {
    const pagar = String(b.movimentacao?.tipo || '').toLowerCase() !== 'receber';
    const sinal = pagar ? -1 : 1;
    const juros = pagar && catJuros ? arred(b.valor_juros) : 0;
    const principal = arred(b.valor_baixa - juros);
    const base = { banco_id: null, cliente_nome: null, projeto_id: b.projeto_id, centro_custo_id: b.centro_custo_id, por_fora: true };
    linhas.push({ ...base, id: `fora-${b.id}`, data_transacao: b.data_baixa, valor: sinal * principal, categoria_id: b.categoria_id, subcategoria_id: b.subcategoria_id });
    if (juros > 0) linhas.push({ ...base, id: `fora-${b.id}-juros`, data_transacao: b.data_baixa, valor: -juros, categoria_id: catJuros, subcategoria_id: grupoDe.get(b.categoria_id) === 'emprestimos' ? subEmprestimo : subAtraso });
  }
  return linhas;
};
