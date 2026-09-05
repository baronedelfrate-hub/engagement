import { supabase } from './customSupabaseClient';

/**
 * Fallback UUID generator
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
 * Fetches the complete list of official IBGE municipalities and populates the fiscal_municipios_ibge table.
 * Enforces constraints and uses UPSERT (ON CONFLICT DO UPDATE) in chunks of 100 to prevent timeouts.
 */
export async function seedFiscalMunicipios(onProgress = () => {}) {
  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;
  const errorsList = [];

  try {
    onProgress({ status: 'fetching', progress: 10, message: 'Buscando dados da API oficial do IBGE...' });

    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
    if (!response.ok) {
      throw new Error(`Falha ao buscar dados IBGE: ${response.status}`);
    }
    
    const ibgeData = await response.json();
    if (!ibgeData || ibgeData.length === 0) {
      throw new Error('API do IBGE retornou lista vazia.');
    }

    const validUfs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
    
    // Preparar dados
    const records = ibgeData.map(m => {
      const codigo = m.id.toString();
      const nome = m.nome?.trim() || '';
      const uf = m.microrregiao?.mesorregiao?.UF?.sigla?.toUpperCase() || '';

      if (!/^[0-9]{7}$/.test(codigo) || !nome || !validUfs.includes(uf)) {
        return null;
      }

      return {
        id: generateUUID(),
        codigo_ibge: codigo,
        nome_municipio: nome,
        uf: uf,
        ativo: true
      };
    }).filter(Boolean);

    totalProcessed = records.length;
    onProgress({ status: 'processing', progress: 20, message: `Preparados ${totalProcessed} registros válidos. Iniciando UPSERT...` });

    // Inserir em lotes de 100
    const chunkSize = 100;
    
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      
      let retries = 3;
      let success = false;
      
      while (retries > 0 && !success) {
        try {
          const { error } = await supabase
            .from('fiscal_municipios_ibge')
            .upsert(chunk, { 
              onConflict: 'codigo_ibge',
              ignoreDuplicates: false // Faz DO UPDATE em caso de conflito
            });
            
          if (error) throw error;
          
          success = true;
          successCount += chunk.length;
        } catch (err) {
          retries--;
          console.warn(`Erro no lote ${i} (tentativas restantes: ${retries}):`, err.message);
          if (retries === 0) {
            errorCount += chunk.length;
            errorsList.push(`Falha no lote ${i}: ${err.message}`);
          } else {
            await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
          }
        }
      }

      const progress = 20 + Math.floor((successCount / totalProcessed) * 80);
      onProgress({ 
        status: 'inserting', 
        progress, 
        message: `Sincronizados ${successCount} de ${totalProcessed} municípios...` 
      });
    }

    onProgress({ status: 'done', progress: 100, message: 'Sincronização IBGE concluída!' });

    return {
      success: true,
      totalProcessed,
      successCount,
      errorCount,
      errors: errorsList
    };

  } catch (error) {
    console.error('[seedFiscalMunicipios ERRO FATAL]', error);
    onProgress({ status: 'error', progress: 0, message: `Erro: ${error.message}` });
    return {
      success: false,
      error: error.message
    };
  }
}