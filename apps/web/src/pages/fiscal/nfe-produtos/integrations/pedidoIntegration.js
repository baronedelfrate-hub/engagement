import { supabase } from '@/lib/customSupabaseClient';

export const pullPedidoData = async (pedidoId) => {
  if (!pedidoId) return null;

  try {
    // Fetch Pedido
    const { data: pedido, error: pedError } = await supabase
      .from('pedidos_venda')
      .select('*')
      .eq('id', pedidoId)
      .single();

    if (pedError) throw pedError;

    // Fetch Itens
    const { data: itens, error: itensError } = await supabase
      .from('pedidos_venda_itens')
      .select('*, produtos(nome, ncm)')
      .eq('pedido_id', pedidoId);

    if (itensError) throw itensError;

    // Format itens for NFE
    const formattedItens = itens.map(item => ({
      id: crypto.randomUUID(), // temp id for UI
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      valor_unitario: item.preco_unitario,
      desconto: item.desconto || 0,
      impostos: (item.valor_icms || 0) + (item.valor_ipi || 0) + (item.valor_pis || 0) + (item.valor_cofins || 0),
      cfop: item.cfop || '',
      ncm: item.produtos?.ncm || '',
      valor_total: item.valor_total
    }));

    return {
      cliente_id: pedido.cliente_id,
      empresa_id: pedido.empresa_id,
      condicao_pagamento_id: pedido.condicao_pagamento_id,
      observacoes: `Referente ao Pedido de Venda: ${pedido.numero}`,
      itens: formattedItens
    };
  } catch (error) {
    console.error('Error pulling pedido data:', error);
    throw error;
  }
};