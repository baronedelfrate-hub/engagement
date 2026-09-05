import { PHASE_CONFIGS } from './bpoE5PhaseConfig';

/**
 * Calculates the overall status of a BPO phase based on its fields and files.
 * @param {string} fase - The phase identifier (B1, B2, B3, B4, B5)
 * @param {object} faseData - The database row data for the phase
 * @param {array} arquivos - Array of uploaded files for this phase
 * @returns {string} 'Pendente', 'Em andamento', or 'Concluído'
 */
export function calculatePhaseStatus(fase, faseData, arquivos = []) {
  console.log(`[bpoE5StatusCalculator] Calculating status for ${fase}`, { faseData, filesCount: arquivos.length });

  if (!faseData) return 'Pendente';

  const config = PHASE_CONFIGS[fase];
  if (!config) return 'Pendente';

  const { diagnostico_preenchido, analise_aprovada, implantacao_ok } = faseData;

  // Check if any work has started
  const isStarted = diagnostico_preenchido || analise_aprovada || implantacao_ok || arquivos.length > 0;
  
  if (!isStarted) {
    console.log(`[bpoE5StatusCalculator] ${fase} -> Pendente (not started)`);
    return 'Pendente';
  }

  // Check if all main steps are completed
  const allStepsDone = diagnostico_preenchido && analise_aprovada && implantacao_ok;

  // Check if required files are uploaded
  const requiredUploads = config.required_uploads || [];
  const uploadedTypes = arquivos.map(a => a.tipo_arquivo);
  const allFilesUploaded = requiredUploads.every(req => uploadedTypes.includes(req));

  if (allStepsDone && allFilesUploaded) {
    console.log(`[bpoE5StatusCalculator] ${fase} -> Concluído (All steps & files met)`);
    return 'Concluído';
  }

  console.log(`[bpoE5StatusCalculator] ${fase} -> Em andamento (Missing some steps or files)`);
  return 'Em andamento';
}

export function getPhaseConfig(fase) {
  return PHASE_CONFIGS[fase] || null;
}

export function validatePhaseCompletion(fase, faseData, arquivos) {
  const status = calculatePhaseStatus(fase, faseData, arquivos);
  console.log(`[bpoE5StatusCalculator] validatePhaseCompletion result: ${status}`);
  return status === 'Concluído';
}