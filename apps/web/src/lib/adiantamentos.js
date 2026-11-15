import { supabase } from '@/lib/customSupabaseClient';

// Adiantamento = título (a pagar ou a receber) marcado com adiantamento=true. A baixa dele é o dinheiro que já saiu/entrou.
// Quando a nota chega, as baixas passam para o título real da nota (a conciliação com o extrato continua valendo)
// e o título do adiantamento fica "substituido" e vinculado (vinculado_a).

const num = (v) => Number(v) || 0;
export const totalBaixas = (baixas) => (baixas || []).reduce((s, b) => s + num(b.valor_baixa), 0);

// Adiantamentos já pagos/recebidos de uma pessoa e ainda sem nota. tipo: 'pagar' | 'receber'
export const listarAdiantamentosDisponiveis = async ({ tipo, companyId, fornecedorId, clienteId }) => {
  let q = supabase.from('movimentacao_financeira')
    .select('id, numero_titulo, valor_total, data_emissao, data_vencimento, status, observacoes, baixas:movimentacao_baixas(id, valor_baixa, data_baixa)')
    .eq('company_id', companyId).eq('adiantamento', true).eq('tipo', tipo)
    .is('vinculado_a', null).in('status', ['pago', 'pago_parcial']).order('data_emissao');
  if (tipo === 'pagar' && fornecedorId) q = q.eq('fornecedor_id', fornecedorId);
  if (tipo === 'receber' && clienteId) q = q.eq('cliente_id', clienteId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((a) => ({ ...a, pago: totalBaixas(a.baixas) })).filter((a) => a.pago > 0.005);
};

// Move as baixas dos adiantamentos para o título da nota e atualiza os status. Falha sem mexer em nada se passar do valor da nota.
export const vincularAdiantamentos = async (tituloId, adiantamentos) => {
  if (!adiantamentos?.length) return { aplicado: 0, status: null };
  const { data: titulo, error: eT } = await supabase.from('movimentacao_financeira')
    .select('id, valor_total, categoria_id, subcategoria_id, centro_custo_id, projeto_id, baixas:movimentacao_baixas(valor_baixa)').eq('id', tituloId).single();
  if (eT) throw eT;
  const jaPago = totalBaixas(titulo.baixas);
  const novo = adiantamentos.reduce((s, a) => s + num(a.pago), 0);
  if (jaPago + novo > num(titulo.valor_total) + 0.005) {
    throw new Error(`Os adiantamentos escolhidos somam R$ ${novo.toFixed(2)}, mais que o saldo em aberto da nota (R$ ${(num(titulo.valor_total) - jaPago).toFixed(2)}). Escolha menos adiantamentos.`);
  }
  for (const a of adiantamentos) {
    const { error: e1 } = await supabase.from('movimentacao_baixas').update({ movimentacao_id: tituloId }).eq('movimentacao_id', a.id);
    if (e1) throw e1;
    // a baixa herda a classificação da nota quando veio sem
    const herda = {};
    if (titulo.categoria_id) herda.categoria_id = titulo.categoria_id;
    if (titulo.subcategoria_id) herda.subcategoria_id = titulo.subcategoria_id;
    if (titulo.centro_custo_id) herda.centro_custo_id = titulo.centro_custo_id;
    if (titulo.projeto_id) herda.projeto_id = titulo.projeto_id;
    for (const k of Object.keys(herda)) await supabase.from('movimentacao_baixas').update({ [k]: herda[k] }).eq('movimentacao_id', tituloId).is(k, null);
    const { error: e2 } = await supabase.from('movimentacao_financeira').update({ status: 'substituido', vinculado_a: tituloId, updated_at: new Date().toISOString() }).eq('id', a.id);
    if (e2) throw e2;
  }
  const quitado = jaPago + novo >= num(titulo.valor_total) - 0.005;
  const status = quitado ? 'pago' : 'pago_parcial';
  const { error: e3 } = await supabase.from('movimentacao_financeira').update({ status, updated_at: new Date().toISOString() }).eq('id', tituloId);
  if (e3) throw e3;
  return { aplicado: novo, status };
};
