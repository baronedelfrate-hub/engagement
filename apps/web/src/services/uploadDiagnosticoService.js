import { supabase } from '@/lib/customSupabaseClient';

const BUCKET_NAME = 'cliente-fases-diagnostico-uploads';

export const uploadFile = async (file, clienteFasesId, fieldType) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${clienteFasesId}/${fieldType}/${fileName}`;

    console.log(`[Upload Diagnóstico] Proposta de Melhoria - Upload iniciado:`, file.name);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log(`[Upload] Arquivo enviado com sucesso:`, urlData.publicUrl);
    return { url: urlData.publicUrl, nome: file.name, path: filePath, tamanho: file.size };
  } catch (error) {
    console.error(`[Upload Diagnóstico] Erro ao fazer upload:`, error);
    throw error;
  }
};

export const deleteFile = async (filePath, fieldType) => {
  try {
    let pathToDelete = filePath;
    if (filePath.includes(BUCKET_NAME)) {
      pathToDelete = filePath.split(`${BUCKET_NAME}/`)[1];
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([pathToDelete]);

    if (error) throw error;
    console.log(`[Upload] Arquivo deletado:`, pathToDelete);
    return true;
  } catch (error) {
    console.error(`[Upload Diagnóstico] Erro ao deletar arquivo:`, error);
    throw error;
  }
};

export const downloadFile = async (url, fileName) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Erro ao fazer download do arquivo:', error);
  }
};

export const saveDiagnosticoUploads = async (clienteFasesId, uploadData) => {
  try {
    await supabase
      .from('cliente_fases_diagnostico_uploads')
      .delete()
      .eq('cliente_fase_id', clienteFasesId);

    const recordsToInsert = [];
    
    if (uploadData.proposta_melhoria_url) {
      recordsToInsert.push({
        cliente_fase_id: clienteFasesId,
        tipo_arquivo: 'proposta_melhoria',
        url_arquivo: uploadData.proposta_melhoria_url,
        nome_arquivo: uploadData.proposta_melhoria_nome,
        data_upload: new Date().toISOString()
      });
    }

    if (recordsToInsert.length > 0) {
      const { data, error } = await supabase
        .from('cliente_fases_diagnostico_uploads')
        .insert(recordsToInsert)
        .select();

      if (error) throw error;
      return data;
    }
    return [];
  } catch (error) {
    console.error('Erro ao salvar dados de upload diagnóstico:', error);
    throw error;
  }
};

export const fetchDiagnosticoUploads = async (clienteFasesId) => {
  try {
    const { data, error } = await supabase
      .from('cliente_fases_diagnostico_uploads')
      .select('*')
      .eq('cliente_fase_id', clienteFasesId);

    if (error) throw error;

    const result = {};
    if (data) {
      data.forEach(item => {
        if (item.tipo_arquivo === 'proposta_melhoria') {
          result.proposta_melhoria_url = item.url_arquivo;
          result.proposta_melhoria_nome = item.nome_arquivo;
        }
      });
    }
    return result;
  } catch (error) {
    console.error('Erro ao buscar uploads do diagnóstico:', error);
    return null;
  }
};