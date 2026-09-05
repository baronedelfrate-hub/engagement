import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function usePedidoSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchPedidos = async (searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Iniciando busca de pedidos por:', searchTerm);
      
      // 1. Busca por número do pedido (tabela principal)
      const { data: byNumero, error: err1 } = await supabase
        .from('pedidos_venda')
        .select(`
          id, numero, data_emissao, valor_total, cliente_id, status,
          clientes (nome, cnpj_cpf),
          pedidos_venda_itens (
            id, descricao, quantidade, valor_unitario, preco_unitario,
            desconto, acrescimo, valor_total, tipo_item, ncm, cfop,
            servico_id, produto_id,
            servicos (nome, codigo_servico_lc116, aliquota_issqn),
            produtos (nome, ncm, cfop)
          )
        `)
        .ilike('numero', `%${searchTerm}%`)
        .order('data_emissao', { ascending: false })
        .limit(20);

      if (err1) throw err1;

      // 2. Busca por nome do cliente (usando inner join filtrado)
      const { data: byClient, error: err2 } = await supabase
        .from('pedidos_venda')
        .select(`
          id, numero, data_emissao, valor_total, cliente_id, status,
          clientes!inner (nome, cnpj_cpf),
          pedidos_venda_itens (
            id, descricao, quantidade, valor_unitario, preco_unitario,
            desconto, acrescimo, valor_total, tipo_item, ncm, cfop,
            servico_id, produto_id,
            servicos (nome, codigo_servico_lc116, aliquota_issqn),
            produtos (nome, ncm, cfop)
          )
        `)
        .ilike('clientes.nome', `%${searchTerm}%`)
        .order('data_emissao', { ascending: false })
        .limit(20);

      if (err2) throw err2;

      // Combina os resultados e remove duplicatas (caso a busca bata em ambos)
      const combined = [...(byNumero || []), ...(byClient || [])];
      const uniqueResults = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      console.log('Resultados encontrados:', uniqueResults.length, uniqueResults);
      return uniqueResults;
      
    } catch (err) {
      console.error('Erro na busca de pedidos:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const filterItemsByType = (items, type) => {
    if (!items) return [];
    if (type === 'produto') {
      return items.filter(i => i.tipo_item === 'produto' || (!i.tipo_item && !i.servico_id));
    }
    if (type === 'servico') {
      return items.filter(i => i.tipo_item === 'servico' || i.tipo_item === 'serviço' || i.servico_id);
    }
    return items;
  };

  const calculateTotals = (items) => {
    if (!items || items.length === 0) return { subtotal: 0, descontos: 0, acrescimos: 0, total: 0 };
    
    return items.reduce((acc, item) => {
      const q = parseFloat(item.quantidade || 0);
      const vu = parseFloat(item.valor_unitario || item.preco_unitario || 0);
      const d = parseFloat(item.desconto || 0);
      const a = parseFloat(item.acrescimo || 0);
      const vt = parseFloat(item.valor_total || 0);

      acc.subtotal += (q * vu);
      acc.descontos += d;
      acc.acrescimos += a;
      acc.total += vt;
      return acc;
    }, { subtotal: 0, descontos: 0, acrescimos: 0, total: 0 });
  };

  return {
    searchPedidos,
    filterItemsByType,
    calculateTotals,
    loading,
    error
  };
}