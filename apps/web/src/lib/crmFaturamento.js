// Faturamento mensal dos contratos recorrentes: cada competência devida vira um pedido de venda confirmado.
import { supabase } from '@/lib/customSupabaseClient';
import { totalItem, moeda } from '@/lib/crmService';
import { inserirPedido } from '@/lib/crmPedido';
import { rotuloCompetencia } from '@/lib/crmContratos';

const arred = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Itens do pedido de uma competência: valor cheio como no contrato ou proporcional aos dias. A soma fecha com o valor da competência.
export const itensDaCompetencia = (contrato, c) => {
  const rotulo = rotuloCompetencia(c.competencia);
  const fator = c.diasMes ? c.dias / c.diasMes : 1;
  const linhas = contrato.itens.map((i) => {
    const liquido = c.proporcional ? arred(totalItem(i) * fator) : arred(totalItem(i));
    return c.proporcional
      ? { tipo_item: 'servico', servico_id: i.servico_id, descricao: `${i.descricao} — competência ${rotulo} (proporcional: ${c.dias}/${c.diasMes} dias)`, quantidade: 1, preco_unitario: liquido, desconto: 0, acrescimo: 0, valor_total: liquido }
      : { tipo_item: 'servico', servico_id: i.servico_id, descricao: `${i.descricao} — competência ${rotulo}`, quantidade: Number(i.quantidade) || 1, preco_unitario: Number(i.preco_unitario) || 0, desconto: Number(i.desconto) || 0, acrescimo: 0, valor_total: liquido };
  });
  const diferenca = arred(c.valor - linhas.reduce((s, l) => s + l.valor_total, 0));
  if (linhas.length && Math.abs(diferenca) >= 0.01) {
    const ultima = linhas[linhas.length - 1];
    ultima.valor_total = arred(ultima.valor_total + diferenca);
    if (c.proporcional) ultima.preco_unitario = ultima.valor_total;
  }
  return linhas;
};

// Gera o pedido de uma competência. A linha em contratos_faturamentos (única por contrato e competência) é gravada primeiro
// e funciona como trava: clicar duas vezes, ou em duas telas, não duplica o pedido.
export const gerarPedidoDaCompetencia = async ({ companyId, contrato, competencia }) => {
  const { data: reserva, error } = await supabase.from('contratos_faturamentos').insert({
    company_id: companyId, contrato_id: contrato.id, competencia: competencia.competencia, valor: competencia.valor,
    proporcional: competencia.proporcional, dias_cobrados: competencia.dias, dias_mes: competencia.diasMes
  }).select().single();
  if (error) throw new Error(error.code === '23505' ? `A competência ${competencia.rotulo} deste contrato já foi faturada.` : error.message);
  try {
    const aaaamm = competencia.competencia.slice(0, 7).replace('-', '');
    const pedido = await inserirPedido({
      companyId, clienteId: contrato.cliente_id, numero: `PV-${contrato.numero}-${aaaamm}`, itens: itensDaCompetencia(contrato, competencia),
      vencimento: competencia.vencimento,
      observacoes: `Contrato ${contrato.numero} — ${contrato.titulo}. Competência ${competencia.rotulo}${competencia.proporcional ? ` (proporcional: ${competencia.dias} de ${competencia.diasMes} dias)` : ''}. Valor ${moeda(competencia.valor)}, vencimento em ${competencia.vencimento.split('-').reverse().join('/')}.`
    });
    const { error: e2 } = await supabase.from('contratos_faturamentos').update({ pedido_venda_id: pedido.id }).eq('id', reserva.id);
    if (e2) throw new Error(e2.message);
    return pedido;
  } catch (e) {
    await supabase.from('contratos_faturamentos').delete().eq('id', reserva.id); // libera a competência para tentar de novo
    throw e;
  }
};
