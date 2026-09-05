import { supabase } from '@/lib/customSupabaseClient';

/**
 * Uploads a file to Supabase Storage with retry logic and detailed error logging.
 * @param {string} bucket - The storage bucket name (e.g., 'logos', 'documentos', 'comprovantes')
 * @param {File} file - The file object to upload
 * @param {string} folder - Optional folder path within the bucket
 * @param {number} maxRetries - Number of upload attempts before failing
 * @returns {Promise<{ url: string, path: string, error: any }>}
 */
export const uploadFile = async (bucket, file, folder = '', maxRetries = 3) => {
  if (!supabase) {
    const errorMsg = 'Supabase client not initialized';
    console.error(`[Storage Upload] ${errorMsg}`);
    return { url: null, path: null, error: new Error(errorMsg) };
  }

  const fileExt = file.name.split('.').pop();
  // Generate a clean, unique file name
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9-_\.]/g, '').replace(`.${fileExt}`, '');
  const fileName = `${Date.now()}_${cleanFileName}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      if (attempt > 0) {
        console.log(`[Storage Upload] Retrying upload for ${fileName} (Attempt ${attempt + 1}/${maxRetries})...`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }

      // The Supabase client automatically handles Authorization headers if the user is signed in.
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type // Ensure correct content type is sent
        });

      if (error) {
        // Log specific error details
        console.error(`[Storage Upload] Supabase raw upload error on attempt ${attempt + 1}:`, {
          message: error.message,
          name: error.name,
          details: error
        });
        throw error;
      }

      // Get Public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      console.log(`[Storage Upload] Successfully uploaded ${fileName} to bucket ${bucket}.`);
      return { url: urlData.publicUrl, path: filePath, error: null };
      
    } catch (error) {
      lastError = error;
      attempt++;
      
      // If it's the last attempt, don't loop again
      if (attempt >= maxRetries) {
        console.error(`[Storage Upload] Final upload failure after ${maxRetries} attempts:`, error);
        return { 
          url: null, 
          path: null, 
          error: {
            message: error.message || 'Falha de conexão com o servidor de arquivos.',
            originalError: error
          } 
        };
      }
    }
  }

  return { url: null, path: null, error: lastError };
};

/**
 * Deletes a file from Supabase Storage
 * @param {string} bucket - The storage bucket name
 * @param {string} filePath - The path of the file to delete (not the full URL)
 */
export const deleteFile = async (bucket, filePath) => {
  if (!supabase || !filePath) return { error: new Error('Missing client or file path') };

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('[Storage Delete] Error:', error);
      throw error;
    }
    return { error: null };
  } catch (error) {
    console.error('[Storage Delete] Exception:', error);
    return { error };
  }
};

export const getBucketConfig = (type) => {
  switch (type) {
    case 'logo':
    case 'image':
      return { 
        bucket: 'logos', 
        maxSizeMB: 5, 
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] 
      };
    case 'documento':
      return { 
        bucket: 'documentos', 
        maxSizeMB: 10, 
        allowedTypes: [
          'application/pdf', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ] 
      };
    case 'comprovante':
      return { 
        bucket: 'comprovantes', 
        maxSizeMB: 20, 
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'] 
      };
    case 'rh-documento':
      return { 
        bucket: 'rh-documentos', 
        maxSizeMB: 5, 
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'] 
      };
    case 'cliente_fase':
      return { 
        bucket: 'cliente_fases', 
        maxSizeMB: 20, 
        allowedTypes: [] // Empty array means accept all typical document/image types, validateFile might need adjustment or just rely on size
      };
    default:
      return { 
        bucket: 'documentos', 
        maxSizeMB: 10, 
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'] 
      };
  }
};

/**
 * Helper to validate file before upload
 */
export const validateFile = (file, config = {}) => {
  const { 
    maxSizeMB = 5, 
    allowedTypes = [] 
  } = config;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `Arquivo muito grande. O tamanho máximo permitido é ${maxSizeMB}MB.` 
    };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    const typesStr = allowedTypes.map(t => t.split('/')[1] || t).join(', ');
    return { 
      valid: false, 
      error: `Tipo de arquivo inválido. Os formatos suportados são: ${typesStr}.` 
    };
  }

  return { valid: true };
};