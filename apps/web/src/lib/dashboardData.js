// Dados dos blocos da tela inicial (financeiro). Cada função devolve só o necessário para o bloco.
import { supabase } from '@/lib/customSupabaseClient';

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
