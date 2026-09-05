import { supabase } from './customSupabaseClient';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Fetches and populates the fiscal_municipios_ibge table with all ~5570 IBGE municipalities
 */
export async function seedFiscalMunicipios(onProgress = () => {}) {
  try {
    onProgress({ status: 'fetching_ibge', progress: 10, message: 'Buscando dados na API oficial do IBGE...' });
    
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
    if (!res.ok) throw new Error('Falha ao buscar dados oficiais do IBGE');
    const ibgeData = await res.json();

    onProgress({ status: 'fetching_db', progress: 30, message: 'Verificando municípios já existentes...' });
    
    const { data: existing, error: fetchErr } = await supabase
      .from('fiscal_municipios_ibge')
      .select('codigo_ibge');
      
    if (fetchErr) throw fetchErr;

    const existingSet = new Set(existing.map(m => m.codigo_ibge));

    const toInsert = ibgeData
      .filter(m => !existingSet.has(m.id.toString()))
      .map(m => ({
        id: generateUUID(),
        codigo_ibge: m.id.toString(),
        nome_municipio: m.nome,
        uf: m.microrregiao.mesorregiao.UF.sigla,
        ativo: true
      }));

    if (toInsert.length === 0) {
      onProgress({ status: 'done', progress: 100, message: 'Base de dados já está 100% atualizada com os ~5.570 municípios.' });
      return { success: true, inserted: 0 };
    }

    onProgress({ status: 'inserting', progress: 50, message: `Inserindo ${toInsert.length} novos municípios...` });

    const chunkSize = 500;
    let insertedCount = 0;
    
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      
      const { error: insertErr } = await supabase
        .from('fiscal_municipios_ibge')
        .insert(chunk);
        
      if (insertErr) throw insertErr;
      
      insertedCount += chunk.length;
      
      const currentProgress = 50 + Math.floor((insertedCount / toInsert.length) * 50);
      onProgress({
        status: 'inserting',
        progress: currentProgress,
        message: `Inseridos ${insertedCount} de ${toInsert.length} municípios...`
      });
    }

    onProgress({ status: 'done', progress: 100, message: `Migração IBGE concluída! ${insertedCount} municípios adicionados.` });
    return { success: true, inserted: insertedCount };
    
  } catch (error) {
    console.error('Erro no seed de municípios fiscais:', error);
    onProgress({ status: 'error', progress: 0, message: `Erro: ${error.message}` });
    return { success: false, error: error.message };
  }
}

/**
 * Verifies if the data was inserted correctly and logs status
 */
export async function verifyFiscalMunicipios() {
  try {
    const { count, error } = await supabase
      .from('fiscal_municipios_ibge')
      .select('*', { count: 'exact', head: true });
      
    if (error) throw error;
    
    // Check specific cities like Indaiatuba
    const { data: indaiatuba } = await supabase
      .from('fiscal_municipios_ibge')
      .select('nome_municipio, uf, codigo_ibge')
      .eq('codigo_ibge', '3520509')
      .single();

    console.log(`[Verificação IBGE] Total de municípios: ${count} de ~5570`);
    console.log(`[Verificação IBGE] Indaiatuba presente:`, !!indaiatuba);
    
    return {
      success: true,
      total: count,
      isComplete: count >= 5568,
      hasIndaiatuba: !!indaiatuba
    };
  } catch (error) {
    console.error('Erro na verificação:', error);
    return { success: false, error: error.message };
  }
}