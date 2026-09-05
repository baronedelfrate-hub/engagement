import { supabase } from '@/lib/customSupabaseClient';

const BUCKET_NAME = 'cliente-fases-implantacao-uploads';

export const uploadImplantacaoFile = async (file, clienteId, clienteFasesId, fieldType) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const safeClienteId = clienteId || 'default_client';
    const filePath = `${safeClienteId}/${clienteFasesId}/${fieldType}/${fileName}`;

    let logPrefix = fieldType === 'plano_contas' ? 'Plano de Contas' : 'Demais Documentos';
    console.log(`[Upload Implantação] ${logPrefix} - Upload iniciado:`, file.name);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, nome: file.name, path: filePath, tamanho: file.size };
  } catch (error) {
    throw error;
  }
};

export const deleteImplantacaoFile = async (filePath) => {
  try {
    let pathToDelete = filePath;
    if (filePath.includes(BUCKET_NAME)) {
      pathToDelete = filePath.split(`${BUCKET_NAME}/`)[1];
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([pathToDelete]);

    if (error) throw error;
    
    const parts = pathToDelete.split('/');
    const fileName = parts.length > 0 ? parts[parts.length - 1] : pathToDelete;
    console.log(`[Upload Implantação] Arquivo deletado:`, fileName);
    
    return true;
  } catch (error) {
    console.error(`[Upload Implantação] Erro ao deletar arquivo:`, error);
    throw error;
  }
};

export const fetchImplantacaoUploadData = async (clienteFasesId) => {
  try {
    const { data, error } = await supabase
      .from('cliente_fases_implantacao_uploads')
      .select('*')
      .eq('cliente_fases_id', clienteFasesId);

    if (error) throw error;
    
    const result = {
      plano_contas_url: null, plano_contas_nome: null,
      demais_documentos_url: null, demais_documentos_nome: null
    };

    data?.forEach(item => {
      if (item.tipo_arquivo === 'plano_contas') {
        result.plano_contas_url = item.url_arquivo;
        result.plano_contas_nome = item.nome_arquivo;
      } else if (item.tipo_arquivo === 'demais_documentos') {
        result.demais_documentos_url = item.url_arquivo;
        result.demais_documentos_nome = item.nome_arquivo;
      }
    });

    return result;
  } catch (error) {
    console.error('Erro ao buscar dados de upload de implantação:', error);
    return {};
  }
};

export const updateImplantacaoUploadRecord = async (clienteFasesId, fieldType, url, nome, tamanho = 0) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!url) {
      // Delete record if url is null
      await supabase
        .from('cliente_fases_implantacao_uploads')
        .delete()
        .eq('cliente_fases_id', clienteFasesId)
        .eq('tipo_arquivo', fieldType);
      return true;
    }

    // Check if record exists for this fieldType
    const { data: existing } = await supabase
      .from('cliente_fases_implantacao_uploads')
      .select('id')
      .eq('cliente_fases_id', clienteFasesId)
      .eq('tipo_arquivo', fieldType)
      .maybeSingle();

    const updateData = {
      cliente_fases_id: clienteFasesId,
      tipo_arquivo: fieldType,
      url_arquivo: url,
      nome_arquivo: nome,
      tamanho: tamanho,
      data_upload: new Date().toISOString(),
      user_id: userData?.user?.id || null
    };

    let result;
    if (existing) {
      result = await supabase
        .from('cliente_fases_implantacao_uploads')
        .update(updateData)
        .eq('id', existing.id);
    } else {
      result = await supabase
        .from('cliente_fases_implantacao_uploads')
        .insert([updateData]);
    }

    if (result.error) throw result.error;
    return true;
  } catch (error) {
    console.error('Erro ao atualizar registro de upload de implantação:', error);
    throw error;
  }
};