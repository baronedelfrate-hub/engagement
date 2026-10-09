import { supabase } from '@/lib/customSupabaseClient';
import { montarTituloReceber } from '@/lib/titulosPagar';

export const generateContasReceber = async (nfeData, user) => {
  if (nfeData.integrado_financeiro) {
    throw new Error('Financeiro já integrado para esta NF-e.');
  }

  // Calculate default due date (e.g., 30 days from emission if not specified)
  const dtEmissao = new Date(nfeData.data_emissao);
  const dtVencimento = new Date(dtEmissao.setDate(dtEmissao.getDate() + 30)).toISOString().split('T')[0];

  const crPayload = montarTituloReceber({
    companyId: nfeData.empresa_id,
    clienteId: nfeData.cliente_id,
    numero: `NFE-${nfeData.numero || nfeData.id.substring(0, 6)}`,
    valor: nfeData.valor_total,
    emissao: nfeData.data_emissao,
    vencimento: dtVencimento,
    observacoes: `Gerado automaticamente da NF-e ${nfeData.numero || 'S/N'}`,
    createdBy: user?.id
  });

  const { data: crRecord, error: crError } = await supabase
    .from('movimentacao_financeira')
    .insert(crPayload)
    .select()
    .single();
  if (crError) throw crError;

  // Update NF-e flag
  const { error: updError } = await supabase
    .from('nfe_produtos')
    .update({ integrado_financeiro: true })
    .eq('id', nfeData.id);

  if (updError) throw updError;

  return crRecord;
};