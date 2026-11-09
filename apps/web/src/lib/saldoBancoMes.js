// Saldo bancário de cada conta no fim de um mês (último saldo do extrato até a data) e limite cadastrado.
import { supabase } from '@/lib/customSupabaseClient';

export const saldosBancariosNoMes = async (empresaId, ano, mes) => {
  const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-${new Date(ano, mes + 1, 0).getDate()}`;
  const { data: bs } = await supabase.from('bancos').select('id, nome, conta, limite').eq('company_id', empresaId);
  const lista = await Promise.all((bs || []).map(async (b) => {
    const { data: l } = await supabase.from('extrato_bancario').select('saldo_posterior').eq('banco_id', b.id).lte('data_transacao', fim).not('saldo_posterior', 'is', null).order('data_transacao', { ascending: false }).order('created_at', { ascending: false }).limit(1);
    return { id: b.id, nome: b.nome, conta: b.conta, limite: Math.max(0, Number(b.limite) || 0), saldo: l?.[0] ? Number(l[0].saldo_posterior) : null };
  }));
  return lista.filter((b) => b.saldo !== null);
};
