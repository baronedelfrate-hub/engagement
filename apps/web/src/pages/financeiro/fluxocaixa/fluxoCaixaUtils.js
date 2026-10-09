import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const dois = (n) => String(n).padStart(2, '0');
// chave yyyy-mm-dd no fuso local (toISOString deslocaria o dia em alguns fusos)
const toDateKey = (date) => `${date.getFullYear()}-${dois(date.getMonth() + 1)}-${dois(date.getDate())}`;
const toDayLabel = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const fromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

export const PERIODOS_FLUXO = [
  { valor: 'mes', rotulo: 'Mês atual' },
  { valor: 'prox30', rotulo: 'Próximos 30 dias' },
  { valor: 'prox60', rotulo: 'Próximos 60 dias' },
  { valor: 'ult30', rotulo: 'Últimos 30 dias' },
];

export const intervaloDoPeriodo = (periodo) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const soma = (n) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return d; };
  switch (periodo) {
    case 'prox30': return { inicio: toDateKey(hoje), fim: toDateKey(soma(29)) };
    case 'prox60': return { inicio: toDateKey(hoje), fim: toDateKey(soma(59)) };
    case 'ult30': return { inicio: toDateKey(soma(-29)), fim: toDateKey(hoje) };
    default: return {
      inicio: toDateKey(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
      fim: toDateKey(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
    };
  }
};

const nomeEntidade = (m) => (m?.tipo === 'pagar' ? m?.fornecedor?.nome : m?.cliente?.nome) || '';

/**
 * Movimentos do fluxo de caixa, vindos da Movimentação Financeira (base única):
 * - Previsto: títulos (não cancelados) pelo dia do VENCIMENTO, pelo valor do título;
 * - Realizado: baixas pelo dia do PAGAMENTO/RECEBIMENTO, pelo valor efetivamente pago/recebido.
 * Mesmo formato que a tela já usava: { id, data_movimentacao, valor, status, tipo ('Receita'|'Despesa'), centro_custo_id, categoria, descricao }.
 */
export const carregarMovimentos = async ({ inicio, fim }) => {
  const [titulos, baixas] = await Promise.all([
    buscarTudo(() => supabase
      .from('movimentacao_financeira')
      .select('id, numero_titulo, tipo, valor_total, data_vencimento, centro_custo_id, categoria:categorias(nome), cliente:clientes(nome), fornecedor:fornecedores(nome)')
      .neq('status', 'cancelado')
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim)
      .order('data_vencimento').order('id')),
    buscarTudo(() => supabase
      .from('movimentacao_baixas')
      .select('id, valor_baixa, data_baixa, centro_custo_id, categoria:categorias(nome), movimentacao:movimentacao_financeira(numero_titulo, tipo, centro_custo_id, categoria:categorias(nome), cliente:clientes(nome), fornecedor:fornecedores(nome))')
      .gte('data_baixa', inicio)
      .lte('data_baixa', fim)
      .order('data_baixa').order('id')),
  ]);

  const previstos = titulos.map((t) => ({
    id: `t-${t.id}`,
    data_movimentacao: t.data_vencimento,
    valor: Number(t.valor_total) || 0,
    status: 'Previsto',
    tipo: t.tipo === 'pagar' ? 'Despesa' : 'Receita',
    centro_custo_id: t.centro_custo_id,
    categoria: t.categoria?.nome || 'Sem categoria',
    descricao: [t.numero_titulo, nomeEntidade(t)].filter(Boolean).join(' · '),
  }));

  const realizados = baixas.map((b) => ({
    id: `b-${b.id}`,
    data_movimentacao: b.data_baixa,
    valor: Number(b.valor_baixa) || 0,
    status: 'Realizado',
    tipo: b.movimentacao?.tipo === 'pagar' ? 'Despesa' : 'Receita',
    centro_custo_id: b.centro_custo_id || b.movimentacao?.centro_custo_id || null,
    categoria: b.categoria?.nome || b.movimentacao?.categoria?.nome || 'Sem categoria',
    descricao: [b.movimentacao?.numero_titulo, nomeEntidade(b.movimentacao)].filter(Boolean).join(' · '),
  }));

  return [...previstos, ...realizados];
};

// Títulos em aberto já vencidos (saldo = valor do título - o que já foi baixado)
export const fetchVencidos = async () => {
  const hoje = toDateKey(new Date());
  const titulos = await buscarTudo(() => supabase
    .from('movimentacao_financeira')
    .select('id, tipo, valor_total, baixas:movimentacao_baixas(valor_baixa, valor_juros, valor_desconto)')
    .in('status', ['pendente', 'pago_parcial', 'vencido'])
    .lt('data_vencimento', hoje)
    .order('id'));
  const saldo = (t) => (Number(t.valor_total) || 0) - (t.baixas || []).reduce((s, b) => s + (Number(b.valor_baixa) || 0) - (Number(b.valor_juros) || 0) + (Number(b.valor_desconto) || 0), 0);
  const abertos = titulos.map((t) => ({ tipo: t.tipo, saldo: saldo(t) })).filter((t) => t.saldo > 0.005);
  return {
    aPagar: { qtd: abertos.filter((t) => t.tipo === 'pagar').length, valor: abertos.filter((t) => t.tipo === 'pagar').reduce((s, t) => s + t.saldo, 0) },
    aReceber: { qtd: abertos.filter((t) => t.tipo === 'receber').length, valor: abertos.filter((t) => t.tipo === 'receber').reduce((s, t) => s + t.saldo, 0) },
  };
};

/**
 * Monta as duas estruturas que a tela precisa:
 * - matrix: {days:[{key,label}], rows:[{id,code,name,values:{[dayKey]:{previsto,realizado}}}]} pra FluxoCaixaTabela
 * - chartTimeline: [{date, saldoFinal:{previsto,realizado}, entradas:{...}, saidas:{...}}] pra FluxoCaixaDashboardChart
 */
export const fetchFluxoCaixaData = async ({ inicio, fim }) => {
  const [movimentacoes, centrosResult] = await Promise.all([
    carregarMovimentos({ inicio, fim }),
    supabase.from('centros_custo').select('id, codigo, nome'),
  ]);

  const centros = centrosResult.data || [];
  const centrosMap = {};
  centros.forEach((c) => { centrosMap[c.id] = c; });

  const days = [];
  for (let d = fromKey(inicio); toDateKey(d) <= fim; d.setDate(d.getDate() + 1)) {
    days.push({ key: toDateKey(d), label: toDayLabel(d) });
  }

  const rowsMap = {};
  const ensureRow = (id, code, name) => {
    if (!rowsMap[id]) {
      rowsMap[id] = { id, code, name, values: {} };
      days.forEach((d) => { rowsMap[id].values[d.key] = { previsto: 0, realizado: 0 }; });
    }
    return rowsMap[id];
  };

  movimentacoes.forEach((m) => {
    const centro = centrosMap[m.centro_custo_id];
    const rowId = m.centro_custo_id || 'sem-centro';
    const row = ensureRow(rowId, centro?.codigo || '-', centro?.nome || 'Sem Centro de Custo');
    const cell = row.values[m.data_movimentacao];
    if (!cell) return;
    // despesa entra negativa na matriz, para a soma da linha ser o saldo
    const valor = m.tipo === 'Despesa' ? -m.valor : m.valor;
    if (m.status === 'Previsto') cell.previsto += valor;
    else if (m.status === 'Realizado') cell.realizado += valor;
  });

  const matrix = {
    days,
    rows: Object.values(rowsMap).sort((a, b) => String(a.code).localeCompare(String(b.code))),
  };

  let saldoPrevistoAcumulado = 0;
  let saldoRealizadoAcumulado = 0;
  const chartTimeline = days.map(({ key }) => {
    const dayMovs = movimentacoes.filter((m) => m.data_movimentacao === key);
    const soma = (tipo, status) => dayMovs
      .filter((m) => m.tipo === tipo && m.status === status)
      .reduce((acc, m) => acc + m.valor, 0);

    const entradasPrevisto = soma('Receita', 'Previsto');
    const entradasRealizado = soma('Receita', 'Realizado');
    const saidasPrevisto = soma('Despesa', 'Previsto');
    const saidasRealizado = soma('Despesa', 'Realizado');

    saldoPrevistoAcumulado += entradasPrevisto - saidasPrevisto;
    saldoRealizadoAcumulado += entradasRealizado - saidasRealizado;

    return {
      date: key,
      saldoFinal: { previsto: saldoPrevistoAcumulado, realizado: saldoRealizadoAcumulado },
      entradas: { previsto: entradasPrevisto, realizado: entradasRealizado },
      saidas: { previsto: saidasPrevisto, realizado: saidasRealizado },
    };
  });

  return { matrix, chartTimeline, movimentacoes, centrosCusto: centros };
};
