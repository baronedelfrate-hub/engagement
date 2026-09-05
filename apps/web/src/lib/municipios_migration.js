import { supabase } from './customSupabaseClient';

/**
 * Fallback UUID generator if crypto.randomUUID is not available
 */
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Fetches all municipalities from IBGE API and inserts missing ones into Supabase
 * @param {Function} onProgress Callback function to report progress updates
 * @returns {Promise<{success: boolean, inserted?: number, error?: string}>}
 */
export async function runMunicipiosMigration(onProgress = () => {}) {
  try {
    onProgress({ status: 'fetching_ibge', progress: 10, message: 'Buscando dados na API do IBGE...' });
    
    // 1. Fetch from IBGE API
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
    if (!res.ok) throw new Error('Falha ao buscar dados do IBGE');
    const ibgeData = await res.json();

    onProgress({ status: 'fetching_db', progress: 30, message: 'Verificando municípios já existentes no banco...' });
    
    // 2. Fetch existing from DB to avoid duplicates
    // Fetching all at once since it's ~5500 records max, manageable in one query
    const { data: existing, error: fetchErr } = await supabase
      .from('municipios')
      .select('codigo_ibge');
      
    if (fetchErr) throw fetchErr;

    const existingSet = new Set(existing.map(m => m.codigo_ibge));

    // 3. Filter and map new records
    const toInsert = ibgeData
      .filter(m => !existingSet.has(m.id.toString()))
      .map(m => ({
        id: generateUUID(),
        nome: m.nome,
        uf: m.microrregiao.mesorregiao.UF.sigla, // using uf instead of estado to match schema
        codigo_ibge: m.id.toString()
      }));

    if (toInsert.length === 0) {
      onProgress({ status: 'done', progress: 100, message: 'Todos os municípios já estão cadastrados e atualizados.' });
      return { success: true, inserted: 0 };
    }

    onProgress({ status: 'inserting', progress: 50, message: `Inserindo ${toInsert.length} novos municípios...` });

    // 4. Batch inserts to avoid Supabase payload size limits
    const chunkSize = 500;
    let insertedCount = 0;
    
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      
      const { error: insertErr } = await supabase
        .from('municipios')
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

    onProgress({ status: 'done', progress: 100, message: `Migração concluída com sucesso! ${insertedCount} municípios adicionados.` });
    return { success: true, inserted: insertedCount };
    
  } catch (error) {
    console.error('Erro na migração de municípios:', error);
    onProgress({ status: 'error', progress: 0, message: `Erro: ${error.message}` });
    return { success: false, error: error.message };
  }
}

/**
 * Verifies the total count and distribution of municipalities in the database
 * @returns {Promise<{success: boolean, total?: number, byState?: Object, error?: string}>}
 */
export async function verifyMunicipiosMigration() {
  try {
    // We do a paginated fetch to group by state since count: 'exact' with groupBy is not directly supported in basic select
    const { data, error, count } = await supabase
      .from('municipios')
      .select('uf', { count: 'exact' });

    if (error) throw error;

    const byState = data.reduce((acc, curr) => {
      acc[curr.uf] = (acc[curr.uf] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      total: count,
      byState
    };
  } catch (error) {
    console.error('Erro ao verificar municípios:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test search function to verify data is queriable
 */
export async function searchMunicipios(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('municipios')
      .select('*')
      .ilike('nome', `%${searchTerm}%`)
      .order('nome')
      .limit(10);
      
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}