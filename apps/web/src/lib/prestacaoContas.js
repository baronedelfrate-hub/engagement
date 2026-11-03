// Prestação de contas por obra: dinheiro do cliente que passa pela conta da empresa (grupo "repasse de clientes").
// Fonte: extrato bancário classificado (é o que a conciliação bate), enriquecido com o título pago (fornecedor, NF).
// Entrada positiva = o cliente depositou; saída negativa = pagamento feito por conta do cliente.
import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';
import { posicaoDeCaixa } from '@/lib/dashboardData';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
export const GRUPO_REPASSE = 'repasse_clientes';
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;
const em = (lista, n = 150) => { const r = []; for (let i = 0; i < lista.length; i += n) r.push(lista.slice(i, i + n)); return r; };
export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const hoje = () => new Date().toISOString().slice(0, 10);

export const categoriasRepasse = async (companyId) => ok(await supabase.from('categorias').select('id, codigo, nome').eq('company_id', companyId).eq('grupo_dre', GRUPO_REPASSE));

// projetoId: 'TODOS' | 'SEM' (sem obra) | id da obra
export const carregarRepasses = async (companyId, { projetoId = 'TODOS', de, ate } = {}) => {
  const cats = await categoriasRepasse(companyId);
  if (!cats.length) return { semCategoria: true, lancamentos: [], abertos: [] };
  const catIds = cats.map((c) => c.id);
  const filtroObra = (q) => (projetoId === 'SEM' ? q.is('projeto_id', null) : projetoId && projetoId !== 'TODOS' ? q.eq('projeto_id', projetoId) : q);

  const extrato = await buscarTudo(() => {
    let q = supabase.from('extrato_bancario')
      .select('id, data_transacao, descricao, valor, cliente_nome, nota_fiscal, projeto_id, subcategoria_id, status_conciliacao, banco_id, estornada')
      .eq('company_id', companyId).in('categoria_id', catIds).order('data_transacao').order('id');
    q = filtroObra(q);
    if (de) q = q.gte('data_transacao', de);
    if (ate) q = q.lte('data_transacao', ate);
    return q;
  });
  const lancs = extrato.filter((l) => !l.estornada);

  // título pago que originou cada linha do extrato (fornecedor, nº do título/NF, anexos)
  const porExtrato = new Map();
  for (const lote of em(lancs.map((l) => l.id))) {
    const b = ok(await supabase.from('movimentacao_baixas').select('extrato_bancario_id, movimentacao_id').in('extrato_bancario_id', lote));
    b.forEach((x) => porExtrato.set(x.extrato_bancario_id, x.movimentacao_id));
  }
  const movIds = [...new Set(porExtrato.values())];
  const movs = new Map(); const docs = new Map();
  for (const lote of em(movIds)) {
    ok(await supabase.from('movimentacao_financeira').select('id, numero_titulo, observacoes, fornecedor:fornecedores(nome), cliente:clientes(nome)').in('id', lote)).forEach((m) => movs.set(m.id, m));
    ok(await supabase.from('movimentacao_documentos').select('movimentacao_id').in('movimentacao_id', lote)).forEach((d) => docs.set(d.movimentacao_id, (docs.get(d.movimentacao_id) || 0) + 1));
  }
  const lancamentos = lancs.map((l) => {
    const m = movs.get(porExtrato.get(l.id));
    return {
      ...l, titulo: m?.numero_titulo || null, contraparte: m?.fornecedor?.nome || m?.cliente?.nome || l.cliente_nome || null,
      anexos: m ? docs.get(m.id) || 0 : 0, observacoes: m?.observacoes || null
    };
  });

  // contas a pagar/receber da obra ainda em aberto (compromissos que vão sair do saldo)
  const brutos = ok(await filtroObra(supabase.from('movimentacao_financeira')
    .select('id, tipo, numero_titulo, valor_total, data_vencimento, status, provisao, projeto_id, fornecedor:fornecedores(nome), cliente:clientes(nome)')
    .eq('company_id', companyId).in('categoria_id', catIds).in('status', ['pendente', 'pago_parcial', 'vencido']).order('data_vencimento').limit(3000)));
  const pago = new Map();
  for (const lote of em(brutos.map((t) => t.id))) {
    ok(await supabase.from('movimentacao_baixas').select('movimentacao_id, valor_baixa').in('movimentacao_id', lote)).forEach((x) => pago.set(x.movimentacao_id, (pago.get(x.movimentacao_id) || 0) + Number(x.valor_baixa || 0)));
  }
  const abertos = brutos.map((t) => ({ ...t, saldo: arred(Number(t.valor_total) - (pago.get(t.id) || 0)), contraparte: t.fornecedor?.nome || t.cliente?.nome || null })).filter((t) => t.saldo > 0.009);
  return { semCategoria: false, lancamentos, abertos };
};

// Monta os totais e as listas de uma prestação de contas.
export const montarPrestacao = (lancamentos, abertos = []) => {
  const recebimentos = lancamentos.filter((l) => Number(l.valor) > 0);
  const pagamentos = lancamentos.filter((l) => Number(l.valor) < 0).map((l) => ({ ...l, valorAbs: arred(-Number(l.valor)) }));
  const recebido = arred(recebimentos.reduce((s, l) => s + Number(l.valor), 0));
  const pago = arred(pagamentos.reduce((s, l) => s + l.valorAbs, 0));
  const aPagar = arred(abertos.filter((t) => t.tipo === 'pagar').reduce((s, t) => s + t.saldo, 0));
  const aReceber = arred(abertos.filter((t) => t.tipo === 'receber').reduce((s, t) => s + t.saldo, 0));
  const saldo = arred(recebido - pago);
  const meses = new Map();
  lancamentos.forEach((l) => {
    const k = String(l.data_transacao).slice(0, 7);
    const x = meses.get(k) || { mes: k, recebido: 0, pago: 0 };
    if (Number(l.valor) > 0) x.recebido += Number(l.valor); else x.pago += -Number(l.valor);
    meses.set(k, x);
  });
  return {
    recebimentos, pagamentos, recebido, pago, saldo, aPagar, aReceber,
    saldoProjetado: arred(saldo + aReceber - aPagar),
    pendentesConciliacao: lancamentos.filter((l) => !/concili/i.test(l.status_conciliacao || '') || /pendente|nao|não/i.test(l.status_conciliacao || '')).length,
    porMes: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map((x) => ({ ...x, recebido: arred(x.recebido), pago: arred(x.pago), saldo: arred(x.recebido - x.pago) })),
    abertos
  };
};

// Painel: quanto do dinheiro nas contas é de clientes (por obra) e quanto sobra de caixa próprio.
export const painelTerceiros = async (companyId) => {
  const { semCategoria, lancamentos } = await carregarRepasses(companyId);
  if (semCategoria || !lancamentos.length) return { temRepasse: !semCategoria && lancamentos.length > 0, obras: [], total: 0, negativas: 0, caixa: null, proprio: null };
  const ids = [...new Set(lancamentos.map((l) => l.projeto_id).filter(Boolean))];
  const nomes = new Map();
  if (ids.length) ok(await supabase.from('projetos').select('id, nome, codigo').in('id', ids)).forEach((p) => nomes.set(p.id, `${p.codigo ? `${p.codigo} - ` : ''}${p.nome}`));
  const obras = new Map();
  lancamentos.forEach((l) => {
    const k = l.projeto_id || 'SEM';
    const o = obras.get(k) || { id: k, nome: k === 'SEM' ? 'Sem obra informada' : nomes.get(k) || 'Obra removida', recebido: 0, pago: 0 };
    if (Number(l.valor) > 0) o.recebido += Number(l.valor); else o.pago += -Number(l.valor);
    obras.set(k, o);
  });
  const lista = [...obras.values()].map((o) => ({ ...o, recebido: arred(o.recebido), pago: arred(o.pago), saldo: arred(o.recebido - o.pago) })).sort((a, b) => a.saldo - b.saldo);
  const total = arred(lista.reduce((s, o) => s + o.saldo, 0));
  const { caixa } = await posicaoDeCaixa(companyId).catch(() => ({ caixa: null }));
  return { temRepasse: true, obras: lista, total, negativas: lista.filter((o) => o.saldo < -0.005).length, caixa, proprio: caixa === null ? null : arred(caixa - total) };
};
export { hoje };
