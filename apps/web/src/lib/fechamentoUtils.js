import { differenceInDays, isBefore, startOfDay, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const calculateProgress = (etapas) => {
  if (!etapas || etapas.length === 0) return 0;
  const concluidas = etapas.filter(e => e.concluida).length;
  return Math.round((concluidas / etapas.length) * 100);
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'em aberto': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
    case 'em andamento': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'aguardando contabilidade': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
    case 'concluído': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const getStatusLabel = (status) => {
  return status || 'Desconhecido';
};

export const getStepColor = (numero_etapa) => {
  if (numero_etapa >= 1 && numero_etapa <= 4) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'; // Financeiro
  if (numero_etapa >= 5 && numero_etapa <= 7) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'; // Fiscal
  if (numero_etapa === 8 || numero_etapa === 9) return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'; // Administrativo
  if (numero_etapa === 10) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'; // Contabilidade
  return 'bg-muted text-foreground border-border';
};

export const formatCompetencia = (competencia) => {
  if (!competencia) return '-';
  try {
    const [year, month] = competencia.split('-');
    if (year && month) return `${month}/${year}`;
    return competencia; // Fallback if format is weird
  } catch (e) {
    return competencia;
  }
};

export const isStepOverdue = (prazo) => {
  if (!prazo) return false;
  return isBefore(parseISO(prazo), startOfDay(new Date()));
};

export const canDeleteClosing = (status) => {
  return status?.toLowerCase() === 'em aberto';
};

export const canFinalizeClosing = (etapas) => {
  if (!etapas || etapas.length === 0) return false;
  return etapas.every(e => e.concluida);
};

export const validateClosingData = (data) => {
  const errors = {};
  if (!data.empresa_id) errors.empresa_id = 'Empresa é obrigatória';
  if (!data.competencia) errors.competencia = 'Competência é obrigatória';
  if (!data.responsavel_id) errors.responsavel_id = 'Responsável é obrigatório';
  if (!data.status) errors.status = 'Status é obrigatório';
  return errors;
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy');
  } catch (e) {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch (e) {
    return dateString;
  }
};