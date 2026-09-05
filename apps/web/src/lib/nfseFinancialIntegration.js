import { supabase } from './customSupabaseClient';

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

    const receivable = {
        company_id: nfseData.company_id, // Ensure we carry this if multi-tenant
        cliente_id: nfseData.cliente_id,
        numero: `NFSE-${nfseData.numero}`,
        data_emissao: nfseData.data_emissao,
        data_vencimento: new Date(new Date(nfseData.data_emissao).setDate(new Date(nfseData.data_emissao).getDate() + 30)).toISOString(),
        valor_original: nfseData.valor_total, // Usually Gross
        valor_recebido: 0,
        status: 'aberto',
        observacoes: `Gerado automaticamente via NFS-e ${nfseData.numero}. Impostos retidos: R$ ${impostosRetidos.toFixed(2)}`,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('contas_receber')
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