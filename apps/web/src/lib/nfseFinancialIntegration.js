import { supabase } from './customSupabaseClient';
import { montarTituloReceber } from './titulosPagar';

export const NfseFinancialIntegration = {
  async createReceivable(nfseData) {
    if (nfseData.status !== 'emitida') return null;

    // Calculate liquid value
    const impostosRetidos = 
        (nfseData.iss_retido ? (Number(nfseData.valor_iss) || 0) : 0) + 
        (Number(nfseData.valor_pis) || 0) + 
        (Number(nfseData.valor_cofins) || 0) + 
        (Number(nfseData.valor_ir) || 0) + 
        (Number(nfseData.valor_csll) || 0);

    const valorLiquido = Number(nfseData.valor_servicos) - impostosRetidos;

    const emissao = String(nfseData.data_emissao).split('T')[0];
    const vencimento = new Date(new Date(emissao).setDate(new Date(emissao).getDate() + 30)).toISOString().split('T')[0];

    const receivable = montarTituloReceber({
        companyId: nfseData.company_id,
        clienteId: nfseData.cliente_id,
        numero: `NFSE-${nfseData.numero}`,
        valor: nfseData.valor_total, // valor bruto
        emissao,
        vencimento,
        observacoes: `Gerado automaticamente via NFS-e ${nfseData.numero}. Impostos retidos: R$ ${impostosRetidos.toFixed(2)}`
    });

    const { data, error } = await supabase
        .from('movimentacao_financeira')
        .insert([receivable])
        .select()
        .single();
    if (error) {
        console.error("Error creating receivable for NFSe:", error);
        throw error;
    }

    return data;
  }
};