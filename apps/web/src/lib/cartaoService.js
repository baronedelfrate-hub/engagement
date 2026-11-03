// Cartões de crédito: ciclo de fatura (fechamento/vencimento), lançamentos classificados, fatura como título a pagar e uso do limite.
import { supabase } from '@/lib/customSupabaseClient';
import { assinaturaDe } from '@/lib/extratoClassificacao';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const pad = (n) => String(n).padStart(2, '0');
const partes = (s) => String(s).slice(0, 10).split('-').map(Number);
const iso = (a, m, d) => `${a}-${pad(m)}-${pad(d)}`;
const ultimoDia = (a, m) => new Date(a, m, 0).getDate();
const noMes = (a, m, d) => Math.min(Number(d), ultimoDia(a, m));
const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;
export const hojeISO = () => new Date().toISOString().slice(0, 10);

// ---------- ciclos ----------
// O ciclo (fatura) é identificado pelo mês do fechamento: AAAA-MM-01.
export const somaMesesCiclo = (ciclo, n) => { const [a, m] = partes(ciclo); const t = a * 12 + (m - 1) + n; return iso(Math.floor(t / 12), (t % 12) + 1, 1); };
// Compra até o dia do fechamento (inclusive) entra na fatura que fecha naquele mês; depois, na do mês seguinte.
export const cicloDaCompra = (dataCompra, diaFechamento) => {
  const [a, m, d] = partes(dataCompra);
  return d <= noMes(a, m, diaFechamento) ? iso(a, m, 1) : somaMesesCiclo(iso(a, m, 1), 1);
};
export const fechamentoDoCiclo = (ciclo, diaFechamento) => { const [a, m] = partes(ciclo); return iso(a, m, noMes(a, m, diaFechamento)); };
// Vence no mesmo mês do fechamento se o dia de vencimento for depois do fechamento; senão, no mês seguinte.
export const vencimentoDoCiclo = (ciclo, diaFechamento, diaVencimento) => {
  const base = Number(diaVencimento) > Number(diaFechamento) ? ciclo : somaMesesCiclo(ciclo, 1);
  const [a, m] = partes(base);
  return iso(a, m, noMes(a, m, diaVencimento));
};
export const rotuloCiclo = (ciclo) => { const [a, m] = partes(ciclo); return `${pad(m)}/${a}`; };
export const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------- resumo (gasto, fatura, limite) ----------
// faturas: títulos reais do cartão (movimentacao_financeira): { fatura_ciclo, status, valor_total, id }
export const resumoCartao = (cartao, lancamentos, faturas = [], hoje = hojeISO()) => {
  const porCiclo = new Map();
  lancamentos.forEach((l) => {
    const c = cicloDaCompra(l.data_compra, cartao.dia_fechamento);
    porCiclo.set(c, arred((porCiclo.get(c) || 0) + Number(l.valor)));
  });
  const cicloAberto = cicloDaCompra(hoje, cartao.dia_fechamento);
  if (!porCiclo.has(cicloAberto)) porCiclo.set(cicloAberto, 0);
  const faturaDe = (c) => faturas.find((f) => String(f.fatura_ciclo).slice(0, 10) === c);
  const ciclos = [...porCiclo.keys()].sort().map((c) => {
    const f = faturaDe(c);
    return {
      ciclo: c, rotulo: rotuloCiclo(c), valor: porCiclo.get(c),
      fechamento: fechamentoDoCiclo(c, cartao.dia_fechamento), vencimento: vencimentoDoCiclo(c, cartao.dia_fechamento, cartao.dia_vencimento),
      fatura: f || null, paga: f?.status === 'pago', fechada: c < cicloAberto
    };
  });
  const limite = Number(cartao.limite) || 0;
  const utilizado = arred(ciclos.filter((x) => !x.paga).reduce((s, x) => s + x.valor, 0));
  const aPagar = ciclos.find((x) => x.fechada && !x.paga && x.valor !== 0) || null;
  const mes = hoje.slice(0, 7);
  return {
    ciclos, limite, utilizado, disponivel: arred(limite - utilizado),
    percentual: limite > 0 ? Math.round(Math.min(100, (Math.max(0, utilizado) / limite) * 100) * 10) / 10 : null,
    gastoMes: arred(lancamentos.filter((l) => String(l.data_compra).slice(0, 7) === mes).reduce((s, l) => s + Number(l.valor), 0)),
    faturaAberta: ciclos.find((x) => x.ciclo === cicloAberto),
    aPagar
  };
};

// ---------- acesso a dados ----------
export const listarCartoes = async (companyId) => ok(await supabase.from('cartoes').select('*').eq('company_id', companyId).order('nome'));
export const salvarCartao = async (companyId, dados, id) => id
  ? ok(await supabase.from('cartoes').update(dados).eq('id', id).select().single())
  : ok(await supabase.from('cartoes').insert({ company_id: companyId, ...dados }).select().single());
export const excluirCartao = async (id) => ok(await supabase.from('cartoes').delete().eq('id', id));

export const listarLancamentos = async (cartaoId) => ok(await supabase.from('cartao_lancamentos').select('*').eq('cartao_id', cartaoId).order('data_compra', { ascending: false }).order('created_at', { ascending: false }));
export const atualizarLancamento = async (id, d) => ok(await supabase.from('cartao_lancamentos').update(d).eq('id', id).select().single());
export const excluirLancamento = async (id) => ok(await supabase.from('cartao_lancamentos').delete().eq('id', id));
export const faturasDoCartao = async (cartaoId) => ok(await supabase.from('movimentacao_financeira').select('id, numero_titulo, valor_total, data_vencimento, status, fatura_ciclo, provisao').eq('cartao_id', cartaoId).eq('provisao', false).order('fatura_ciclo'));

// Compra à vista ou parcelada: as parcelas caem nas faturas dos meses seguintes.
export const criarLancamentos = async (companyId, cartaoId, { data, descricao, valor, categoria_id, subcategoria_id, parcelas = 1, observacoes }) => {
  const n = Math.max(1, Math.min(60, Number(parcelas) || 1));
  const total = Math.round(Number(valor) * 100);
  const base = Math.floor(total / n);
  const linhas = Array.from({ length: n }, (_, k) => {
    const [a, m, d] = partes(data);
    const t = a * 12 + (m - 1) + k;
    const ano = Math.floor(t / 12); const mes = (t % 12) + 1;
    return {
      company_id: companyId, cartao_id: cartaoId, data_compra: iso(ano, mes, noMes(ano, mes, d)),
      descricao: n > 1 ? `${descricao.trim()} (${k + 1}/${n})` : descricao.trim(),
      valor: (k === n - 1 ? total - base * (n - 1) : base) / 100,
      categoria_id: categoria_id || null, subcategoria_id: subcategoria_id || null,
      parcela_atual: n > 1 ? k + 1 : null, total_parcelas: n > 1 ? n : null, observacoes: observacoes || null
    };
  });
  return ok(await supabase.from('cartao_lancamentos').insert(linhas).select());
};

// Sugere categoria/subcategoria pela descrição: usa a classificação do último lançamento igual (mesma assinatura).
export const sugerirClassificacao = async (companyId, descricao) => {
  const ass = assinaturaDe(descricao);
  if (!ass) return null;
  const l = ok(await supabase.from('cartao_lancamentos').select('descricao, categoria_id, subcategoria_id').eq('company_id', companyId).not('categoria_id', 'is', null).order('created_at', { ascending: false }).limit(500));
  const achado = l.find((x) => assinaturaDe(x.descricao) === ass);
  return achado ? { categoria_id: achado.categoria_id, subcategoria_id: achado.subcategoria_id } : null;
};

// Cria ou atualiza a fatura (título a pagar) de um ciclo com a soma dos lançamentos. Fatura já paga não é alterada.
export const gerarFatura = async (companyId, cartao, ciclo, valor, userId) => {
  const venc = vencimentoDoCiclo(ciclo, cartao.dia_fechamento, cartao.dia_vencimento);
  const existente = ok(await supabase.from('movimentacao_financeira').select('id, status').eq('cartao_id', cartao.id).eq('fatura_ciclo', ciclo).eq('provisao', false).limit(1));
  if (existente[0]) {
    if (existente[0].status === 'pago') throw new Error('Esta fatura já está paga.');
    return ok(await supabase.from('movimentacao_financeira').update({ valor_total: valor, data_vencimento: venc, data_emissao: fechamentoDoCiclo(ciclo, cartao.dia_fechamento) }).eq('id', existente[0].id).select().single());
  }
  const [av, mv] = partes(venc);
  return ok(await supabase.from('movimentacao_financeira').insert({
    company_id: companyId, tipo: 'pagar',
    numero_titulo: `FATURA ${String(cartao.nome).toUpperCase()}${cartao.final ? ` ${cartao.final}` : ''} (${pad(mv)}/${av})`,
    fornecedor_id: cartao.emissor_fornecedor_id || null, valor_total: valor,
    data_emissao: fechamentoDoCiclo(ciclo, cartao.dia_fechamento), data_vencimento: venc,
    categoria_id: cartao.categoria_fatura_id || null, subcategoria_id: cartao.subcategoria_fatura_id || null, banco_id: cartao.banco_id || null,
    status: 'pendente', provisao: false, parcela_atual: 1, total_parcelas: 1, cartao_id: cartao.id, fatura_ciclo: ciclo,
    observacoes: `Fatura do cartão ${cartao.nome}${cartao.final ? ` final ${cartao.final}` : ''}, gerada pelos lançamentos do ciclo ${rotuloCiclo(ciclo)}.`,
    ...(userId ? { created_by: userId } : {})
  }).select().single());
};

// Para o painel: um resumo por cartão ativo.
export const resumoDosCartoes = async (companyId, hoje = hojeISO()) => {
  const cartoes = (await listarCartoes(companyId)).filter((c) => c.ativo);
  if (!cartoes.length) return [];
  const ids = cartoes.map((c) => c.id);
  const [lan, fat] = await Promise.all([
    ok(await supabase.from('cartao_lancamentos').select('cartao_id, data_compra, valor').in('cartao_id', ids).limit(10000)),
    ok(await supabase.from('movimentacao_financeira').select('cartao_id, fatura_ciclo, status, valor_total, id').in('cartao_id', ids).eq('provisao', false).limit(5000))
  ]);
  return cartoes.map((c) => ({ cartao: c, ...resumoCartao(c, lan.filter((l) => l.cartao_id === c.id), fat.filter((f) => f.cartao_id === c.id), hoje) }));
};
