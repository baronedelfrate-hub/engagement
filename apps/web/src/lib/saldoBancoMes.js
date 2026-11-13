// Saldo bancário de cada conta no fim de um mês e limite cadastrado.
// Usa o último saldo do extrato até a data. Conta sem saldo no extrato (sem movimento ou lançamentos sem saldo)
// usa o saldo cadastrado + os lançamentos depois da data do saldo inicial. `semMovimento` marca as contas
// que não tiveram nenhum lançamento no mês.
import { supabase } from '@/lib/customSupabaseClient';

export const saldosBancariosNoMes = async (empresaId, ano, mes) => {
  const mm = String(mes + 1).padStart(2, '0');
  const ini = `${ano}-${mm}-01`;
  const fim = `${ano}-${mm}-${new Date(ano, mes + 1, 0).getDate()}`;
  const { data: bs } = await supabase.from('bancos').select('id, nome, conta, limite, saldo, data_saldo_inicial, tipo_conta, ativo').eq('company_id', empresaId);
  const lista = await Promise.all((bs || []).filter((b) => b.ativo !== false && b.tipo_conta !== 'Portador externo').map(async (b) => {
    const { data: l } = await supabase.from('extrato_bancario').select('saldo_posterior').eq('banco_id', b.id).lte('data_transacao', fim).not('saldo_posterior', 'is', null).order('data_transacao', { ascending: false }).order('created_at', { ascending: false }).limit(1);
    const { count } = await supabase.from('extrato_bancario').select('id', { count: 'exact', head: true }).eq('banco_id', b.id).gte('data_transacao', ini).lte('data_transacao', fim);
    let saldo = l?.[0] ? Number(l[0].saldo_posterior) : null;
    let origem = 'extrato';
    if (saldo === null && b.data_saldo_inicial && b.data_saldo_inicial <= fim) {
      const { data: mv } = await supabase.from('extrato_bancario').select('valor').eq('banco_id', b.id).gt('data_transacao', b.data_saldo_inicial).lte('data_transacao', fim);
      saldo = Math.round(((Number(b.saldo) || 0) + (mv || []).reduce((s, x) => s + (Number(x.valor) || 0), 0)) * 100) / 100;
      origem = 'cadastro';
    }
    return { id: b.id, nome: b.nome, conta: b.conta, limite: Math.max(0, Number(b.limite) || 0), saldo, origem, semMovimento: !count };
  }));
  return lista.filter((b) => b.saldo !== null);
};
