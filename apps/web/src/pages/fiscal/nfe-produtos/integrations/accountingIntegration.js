import { supabase } from '@/lib/customSupabaseClient';

export const sendToAccounting = async (nfeData, user) => {
  if (nfeData.integrado_contabil) {
    throw new Error('Esta NF-e já foi enviada à contabilidade.');
  }

  // Update flag in nfe_produtos
  const { error } = await supabase
    .from('nfe_produtos')
    .update({ integrado_contabil: true })
    .eq('id', nfeData.id);

  if (error) throw error;

  // Record history
  await supabase.from('nfe_produtos_historico').insert({
    nfe_produto_id: nfeData.id,
    acao: 'Integração Contábil',
    detalhes: 'Documento e arquivos enviados para a contabilidade.',
    usuario_id: user?.id
  });

  return true;
};