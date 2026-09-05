import { supabase } from '@/lib/customSupabaseClient';
import { BPO_STANDARD_ACTIVITIES } from './bpo_standard_activities';

export const bpoAutomationService = {
  
  async createBPOClient(clientData) {
    try {
      // 1. Create Client Record
      const { data: bpoClient, error: clientError } = await supabase
        .from('bpo_clientes')
        .insert([{
          cliente_id: clientData.cliente_id,
          status_bpo: clientData.status_bpo,
          responsavel_id: clientData.responsavel_id,
          data_inicio: clientData.data_inicio
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      const phases = ['B1', 'B2', 'B3', 'B4', 'B5'];
      
      // 2. Create Phases
      for (const faseName of phases) {
        const { data: fase, error: faseError } = await supabase
          .from('bpo_fases')
          .insert([{
            bpo_cliente_id: bpoClient.id,
            fase: faseName,
            status: 'Pendente',
            data_inicio: new Date().toISOString()
          }])
          .select()
          .single();

        if (faseError) throw faseError;

        // 3. Handle B1 Special Logic (Blocos)
        if (faseName === 'B1') {
          await this.createB1Activities(fase.id);
        } else {
          // 4. Handle Standard Phases (Direct Activities)
          await this.createStandardActivities(fase.id, faseName);
        }
      }

      return { success: true, data: bpoClient };
    } catch (error) {
      console.error('Error in createBPOClient:', error);
      return { success: false, error };
    }
  },

  async createB1Activities(faseId) {
    // Create 'Diagnostico' Block
    const { data: blocoDiag } = await supabase
      .from('bpo_blocos')
      .insert([{ bpo_fase_id: faseId, bloco: 'Diagnóstico', ordem: 1 }])
      .select()
      .single();

    if (blocoDiag) {
      const activities = BPO_STANDARD_ACTIVITIES.B1.Diagnostico.map((desc, idx) => ({
        bpo_fase_id: faseId,
        bpo_bloco_id: blocoDiag.id,
        descricao: desc,
        status: 'Pendente',
        ordem: idx + 1
      }));
      await supabase.from('bpo_atividades').insert(activities);
    }

    // Create 'Implantacao' Block
    const { data: blocoImp } = await supabase
      .from('bpo_blocos')
      .insert([{ bpo_fase_id: faseId, bloco: 'Implantação', ordem: 2 }])
      .select()
      .single();

    if (blocoImp) {
      const activities = BPO_STANDARD_ACTIVITIES.B1.Implantacao.map((desc, idx) => ({
        bpo_fase_id: faseId,
        bpo_bloco_id: blocoImp.id,
        descricao: desc,
        status: 'Pendente',
        ordem: idx + 1
      }));
      await supabase.from('bpo_atividades').insert(activities);
    }
  },

  async createStandardActivities(faseId, faseName) {
    const descriptions = BPO_STANDARD_ACTIVITIES[faseName];
    if (descriptions && descriptions.length > 0) {
      const activities = descriptions.map((desc, idx) => ({
        bpo_fase_id: faseId,
        descricao: desc,
        status: 'Pendente',
        ordem: idx + 1
      }));
      await supabase.from('bpo_atividades').insert(activities);
    }
  }
};