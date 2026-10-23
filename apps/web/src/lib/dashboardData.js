// Dados dos blocos da tela inicial (financeiro). Cada função devolve só o necessário para o bloco.
import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';
import { montarDRE, calcularPEPeriodo, MESES } from '@/lib/dreGerencial';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

export const hojeISO = () => new Date().toISOString().slice(0, 10);
export const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// Títulos em aberto (a pagar e a receber), com o saldo já descontadas as baixas parciais. Provisões ficam de fora.
export const titulosAbertos = async (companyId) => {
  const t = ok(await supabase.from('movimentacao_financeira')
    .select('id, tipo, numero_titulo, valor_total, data_vencimento, status, cliente:clientes(nome), fornecedor:fornecedores(nome)')
    .eq('company_id', companyId).eq('provisao', false).in('status', ['pendente', 'pago_parcial', 'vencido']).order('data_vencimento').limit(3000));
  const pago = {};
  for (let i = 0; i < t.length; i += 150) {
    const ids = t.slice(i, i + 150).map((x) => x.id);
    const b = ok(await supabase.from('movimentacao_baixas').select('movimentacao_id, valor_baixa').in('movimentacao_id', ids));
    b.forEach((x) => { pago[x.movimentacao_id] = (pago[x.movimentacao_id] || 0) + Number(x.valor_baixa || 0); });
  }
  return t.map((x) => ({ ...x, nome: x.tipo === 'pagar' ? x.fornecedor?.nome : x.cliente?.nome, saldo: Math.round((Number(x.valor_total) - (pago[x.id] || 0)) * 100) / 100 })).filter((x) => x.saldo > 0.009);
};

// Entradas e saídas realizadas no mês (pelas baixas).
export const movimentoDoMes = async (companyId, hoje = hojeISO()) => {
  const ini = `${hoje.slice(0, 7)}-01`;
  const fim = `${hoje.slice(0, 7)}-31`;
  const b = ok(await supabase.from('movimentacao_baixas').select('valor_baixa, data_baixa, movimentacao:movimentacao_financeira(tipo)').eq('company_id', companyId).gte('data_baixa', ini).lte('data_baixa', fim).limit(5000));
  const soma = (tipo) => b.filter((x) => x.movimentacao?.tipo === tipo).reduce((s, x) => s + Number(x.valor_baixa || 0), 0);
  return { entradas: soma('receber'), saidas: soma('pagar') };
};

export const resumoVencimentos = (abertos, hoje = hojeISO()) => {
  const f = (tipo, de, ate) => {
    const l = abertos.filter((x) => x.tipo === tipo && (de === null || x.data_vencimento >= de) && (ate === null || x.data_vencimento <= ate));
    return { qtd: l.length, valor: l.reduce((s, x) => s + x.saldo, 0) };
  };
  const sete = somaDias(hoje, 7);
  return {
    pagarVencidos: f('pagar', null, somaDias(hoje, -1)), pagarHoje: f('pagar', hoje, hoje), pagarSemana: f('pagar', somaDias(hoje, 1), sete),
    receberVencidos: f('receber', null, somaDias(hoje, -1)), receberHoje: f('receber', hoje, hoje), receberSemana: f('receber', somaDias(hoje, 1), sete)
  };
};

// ---------- painel executivo: caixa, receitas, despesas e ponto de equilíbrio ----------
// Saldo atual: o último saldo registrado no extrato de cada banco da empresa. Sem extrato, devolve null.
export const saldoDeCaixa = async (companyId) => {
  const bancos = ok(await supabase.from('bancos').select('id').eq('company_id', companyId));
  let soma = 0; let achou = false;
  for (const b of bancos) {
    const l = ok(await supabase.from('extrato_bancario').select('saldo_posterior, data_transacao').eq('banco_id', b.id).not('saldo_posterior', 'is', null).order('data_transacao', { ascending: false }).order('created_at', { ascending: false }).limit(1));
    if (l[0]) { soma += Number(l[0].saldo_posterior); achou = true; }
  }
  return achou ? Math.round(soma * 100) / 100 : null;
};

// DRE do ano corrente (regime de caixa, a mesma das telas gerenciais) resumida para os indicadores e o gráfico.
export const resumoExecutivo = async (companyId, hoje = hojeISO()) => {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7)) - 1;
  const [cats, subs, movs, caixa] = await Promise.all([
    supabase.from('categorias').select('id, codigo, nome, grupo_dre').eq('company_id', companyId),
    supabase.from('subcategorias').select('id, codigo, nome, categoria_id').eq('company_id', companyId),
    buscarTudo(() => supabase.from('extrato_bancario').select('id, data_transacao, valor, categoria_id, subcategoria_id, cliente_nome, banco_id').eq('company_id', companyId).gte('data_transacao', `${ano}-01-01`).lte('data_transacao', `${ano}-12-31`).order('data_transacao').order('id')),
    saldoDeCaixa(companyId).catch(() => null)
  ]);
  const temDados = movs.length > 0;
  const dre = montarDRE(movs, { ano, categorias: cats.data || [], subcategorias: subs.data || [] });
  const v = (k, i) => dre.porChave[k].valores[i];
  const receita = (i) => v('receita_bruta', i);
  const despesa = (i) => Math.round((v('receita_bruta', i) - v('lucro_liquido', i)) * 100) / 100;
  const serie = [];
  for (let i = Math.max(0, mes - 5); i <= mes; i += 1) serie.push({ mes: MESES[i], receitas: receita(i), despesas: Math.max(0, despesa(i)) });
  const naoClassificado = dre.porChave.nao_classificado ? Math.abs(dre.porChave.nao_classificado.valores[mes]) : 0;
  return { temDados, caixa, mesRotulo: `${MESES[mes]}/${ano}`, receitas: receita(mes), despesas: despesa(mes), pe: calcularPEPeriodo(dre, mes, mes), serie, naoClassificado };
};

// ---------- agenda ----------
export const listarEventos = async (companyId, de, ate) => ok(
  await supabase.from('agenda_eventos').select('*').eq('company_id', companyId).gte('data_inicio', de).lte('data_inicio', ate).order('data_inicio').order('hora_inicio', { nullsFirst: true })
);
export const criarEvento = async (companyId, userId, d) => ok(await supabase.from('agenda_eventos').insert({ company_id: companyId, created_by: userId, ...d }).select().single());
export const atualizarEvento = async (id, d) => ok(await supabase.from('agenda_eventos').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single());
export const excluirEvento = async (id) => ok(await supabase.from('agenda_eventos').delete().eq('id', id));

export const TIPOS_EVENTO = { compromisso: 'Compromisso', reuniao: 'Reunião', evento: 'Evento', gravacao: 'Gravação', viagem: 'Viagem', outro: 'Outro' };

// Link do Google Agenda com o evento já preenchido (com horário, ou de dia inteiro).
export const linkGoogleEvento = (e) => {
  const pad = (n) => String(n).padStart(2, '0');
  const compacta = (data, hora) => `${data.replace(/-/g, '')}T${String(hora).slice(0, 5).replace(':', '')}00`;
  const fimData = e.data_fim || e.data_inicio;
  let dates;
  if (e.dia_inteiro || !e.hora_inicio) {
    const fim = new Date(`${fimData}T12:00:00`); fim.setDate(fim.getDate() + 1);
    dates = `${e.data_inicio.replace(/-/g, '')}/${fim.toISOString().slice(0, 10).replace(/-/g, '')}`;
  } else {
    let fimHora = e.hora_fim;
    let fimDia = fimData;
    if (!fimHora) { const [h, m] = String(e.hora_inicio).split(':').map(Number); fimHora = `${pad((h + 1) % 24)}:${pad(m)}`; }
    // término às 00:30 de um evento que começa às 23:30 (ou hora final menor que a inicial): cai no dia seguinte
    if (fimDia === e.data_inicio && String(fimHora).slice(0, 5) <= String(e.hora_inicio).slice(0, 5)) { const d = new Date(`${fimDia}T12:00:00`); d.setDate(d.getDate() + 1); fimDia = d.toISOString().slice(0, 10); }
    dates = `${compacta(e.data_inicio, e.hora_inicio)}/${compacta(fimDia, fimHora)}`;
  }
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titulo, dates, details: e.descricao || '', location: e.local || '' });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};