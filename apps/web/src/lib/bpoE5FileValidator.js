export function validateFile(file) {
  console.log('[bpoE5FileValidator] Validating file:', file.name);
  
  // Max size 10MB
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    console.log('[bpoE5FileValidator] Error: File too large', file.size);
    return { valid: false, error: 'O arquivo excede o tamanho máximo de 10MB.' };
  }

  // Allowed types
  const allowedExtensions = ['.pdf', '.xlsx', '.docx', '.doc', '.png', '.jpg', '.jpeg'];
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    console.log('[bpoE5FileValidator] Error: Invalid extension', fileExtension);
    return { valid: false, error: 'Tipo de arquivo não permitido. Use PDF, XLSX, DOCX, PNG ou JPG.' };
  }

  console.log('[bpoE5FileValidator] File is valid');
  return { valid: true };
}

export function getFileTypeLabel(tipo_arquivo) {
  const labels = {
    'plano_contas': 'Plano de Contas',
    'documentos_padronizados': 'Documentos Padronizados',
    'relatorio_diagnostico': 'Relatório de Diagnóstico',
    'aprovacao_cliente': 'Aprovação do Cliente',
    'comprovante_implantacao': 'Comprovante de Implantação',
    'outros': 'Outros Anexos'
  };
  return labels[tipo_arquivo] || tipo_arquivo;
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isRequiredFileUploaded(fase, tipo_arquivo, arquivos = []) {
  const result = arquivos.some(arq => arq.tipo_arquivo === tipo_arquivo);
  console.log(`[bpoE5FileValidator] Checking required file ${tipo_arquivo} for phase ${fase}: ${result}`);
  return result;
}