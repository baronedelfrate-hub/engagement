import { supabase } from '@/lib/customSupabaseClient';

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const toDateKey = (date) => date.toISOString().split('T')[0];
const toDayLabel = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/**
 * Busca movimentações reais de fluxo_caixa_movimentacoes num intervalo de dias
 * a partir de hoje e monta as duas estruturas que a tela precisa:
 * - matrix: {days:[{key,label}], rows:[{id,code,name,values:{[dayKey]:{previsto,realizado}}}]} pra FluxoCaixaTabela
 * - chartTimeline: [{date, saldoFinal:{previsto,realizado}, entradas:{...}, saidas:{...}}] pra FluxoCaixaDashboardChart
 */
export const fetchFluxoCaixaData = async (daysCount = 60) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysCount - 1);

  const startKey = toDateKey(today);
  const endKey = toDateKey(endDate);

  const [movResult, centrosResult] = await Promise.all([
    supabase.from('fluxo_caixa_movimentacoes').select('*').gte('data_movimentacao', startKey).lte('data_movimentacao', endKey),
    supabase.from('centros_custo').select('id, codigo, nome'),
  ]);
  if (movResult.error) throw movResult.error;

  const movimentacoes = movResult.data || [];
  const centros = centrosResult.data || [];
  const centrosMap = {};
  centros.forEach(c => { centrosMap[c.id] = c; });

  const days = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ key: toDateKey(d), label: toDayLabel(d) });
  }

  const rowsMap = {};
  const ensureRow = (id, code, name) => {
    if (!rowsMap[id]) {
      rowsMap[id] = { id, code, name, values: {} };
      days.forEach(d => { rowsMap[id].values[d.key] = { previsto: 0, realizado: 0 }; });
    }
    return rowsMap[id];
  };

  movimentacoes.forEach(m => {
    const centro = centrosMap[m.centro_custo_id];
    const rowId = m.centro_custo_id || 'sem-centro';
    const row = ensureRow(rowId, centro?.codigo || '-', centro?.nome || 'Sem Centro de Custo');
    const cell = row.values[m.data_movimentacao];
    if (!cell) return; // fora do range carregado
    const valor = parseFloat(m.valor || 0);
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
    const dayMovs = movimentacoes.filter(m => m.data_movimentacao === key);
    const soma = (tipo, status) => dayMovs
      .filter(m => m.tipo === tipo && m.status === status)
      .reduce((acc, m) => acc + parseFloat(m.valor || 0), 0);

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
