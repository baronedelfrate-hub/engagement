import { supabase } from '@/lib/customSupabaseClient';
import { UnifneIntegrationService } from './unifneIntegrationService';
import { NfsePdfGenerator } from './nfsePdfGenerator';
import { NfseFinancialIntegration } from './nfseFinancialIntegration';
import { calculatePIS, calculateCOFINS, calculateISS, calculateIRPJ, calculateCSLL, calculateTotal, validateNfseData } from './nfseTaxCalculator';

export const nfseService = {
  // Get next number
  async getNextNumber() {
    try {
      console.log('[nfseService] Fetching next NFSE number...');
      const { data, error } = await supabase
        .from('notas_fiscais_servico')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      return (data && data.length > 0 && data[0].numero) ? parseInt(data[0].numero) + 1 : 1;
    } catch (error) {
      console.error('[nfseService] Error getting next number:', error);
      return 1; // Safe fallback
    }
  },

  // CRUD
  async create(data) {
    console.log('[nfseService] Creating NFSE:', data.numero);
    const { data: result, error } = await supabase
      .from('notas_fiscais_servico')
      .insert([data])
      .select()
      .single();
    if(error) {
      console.error('[nfseService] Error creating NFSE:', error);
      throw error;
    }
    return result;
  },

  async update(id, data) {
    console.log(`[nfseService] Updating NFSE ${id}`);
    const { data: result, error } = await supabase
      .from('notas_fiscais_servico')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if(error) {
      console.error(`[nfseService] Error updating NFSE ${id}:`, error);
      throw error;
    }
    return result;
  },

  async getById(id) {
    console.log(`[nfseService] Fetching NFSE by ID: ${id}`);
    const { data, error } = await supabase
      .from('notas_fiscais_servico')
      .select(`
        *,
        clientes (id, nome, cnpj_cpf, endereco, cidade),
        pedidos_venda (id, numero)
      `)
      .eq('id', id)
      .single();
    if(error) {
      console.error(`[nfseService] Error fetching NFSE ${id}:`, error);
      throw error;
    }
    return data;
  },

  // Business Logic
  async emitirNfse(nfseId) {
    // 1. Get Data
    const nfse = await this.getById(nfseId);
    
    // 2. Validate
    const validation = validateNfseData(nfse);
    if(!validation.isValid) throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);

    // 3. Send to Uninfe
    let uninfeResult;
    try {
        console.log(`[nfseService] Sending NFSE ${nfseId} to Uninfe...`);
        uninfeResult = await UnifneIntegrationService.sendNfseToUninfe(nfse);
    } catch (e) {
        console.error(`[nfseService] Uninfe integration error:`, e);
        await this.update(nfseId, { status: 'rejeitada', motivo_cancelamento: e.message });
        throw e;
    }

    if (uninfeResult.success) {
        // 4. Generate PDF
        const pdfPath = await NfsePdfGenerator.generateAndSave(nfse);

        // 5. Update Status
        const updatedNfse = await this.update(nfseId, {
            status: 'emitida',
            protocolo_autorizacao: uninfeResult.protocolo,
            xml: uninfeResult.xml_retorno,
            pdf: pdfPath,
            updated_at: new Date().toISOString()
        });

        // 6. Financial Integration
        try {
          await NfseFinancialIntegration.createReceivable(updatedNfse);
        } catch (finErr) {
          console.error(`[nfseService] Error creating financial receivable for NFSE ${nfseId}:`, finErr);
          // Non-blocking error for emission, but needs logging
        }

        return updatedNfse;
    } else {
        await this.update(nfseId, { status: 'rejeitada' });
        throw new Error(`Rejeição da Sefaz/Prefeitura: ${uninfeResult.mensagem}`);
    }
  },

  async cancelarNfse(id, motivo) {
    console.log(`[nfseService] Cancelling NFSE ${id} - Motivo: ${motivo}`);
    const nfse = await this.getById(id);
    
    const result = await UnifneIntegrationService.cancelNfseViaUninfe(id, motivo);
    if(result.success) {
        return await this.update(id, {
            status: 'cancelada',
            motivo_cancelamento: motivo,
            updated_at: new Date().toISOString()
        });
    }
    throw new Error(`Falha ao cancelar na Uninfe: ${result.mensagem || 'Erro desconhecido'}`);
  },

  async substituirNfse(originalId, newData) {
     console.log(`[nfseService] Substituting NFSE ${originalId}`);
     const original = await this.getById(originalId);
     
     // Create new record first
     const nextNum = await this.getNextNumber();
     const newNfseData = { ...newData, original_nfse_id: originalId, numero: nextNum };
     const newNfse = await this.create(newNfseData);

     // Attempt substitution integration
     try {
         // This usually implies emitting the new one and cancelling the old one
         await this.emitirNfse(newNfse.id);
         await this.cancelarNfse(originalId, `Substituída pela NFS-e ${newNfse.numero}`);
         
         await this.update(originalId, { status: 'substituida' });
         return newNfse;
     } catch (e) {
         console.error(`[nfseService] Substitution process failed:`, e);
         throw e;
     }
  }
};