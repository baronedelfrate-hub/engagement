import { supabase } from '@/lib/customSupabaseClient';

export const updateFluxoCaixa = async (nfeData, crData, user) => {
  // Mock flux creation for demonstration
  const payload = {
    company_id: nfeData.empresa_id,
    data_movimentacao: crData?.data_vencimento || new Date().toISOString().split('T')[0],
    tipo: 'Receita',
    categoria: 'Faturamento de Vendas',
    valor: nfeData.valor_total,
    descricao: `Previsão de Recebimento - NF-e ${nfeData.numero || 'S/N'}`,
    status: 'Previsto',
    created_by: user?.id
  };

  const { data, error } = await supabase
    .from('fluxo_caixa_movimentacoes')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};