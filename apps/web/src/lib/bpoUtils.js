import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getPhaseLabel = (fase) => {
  const map = {
    'B1': 'B1 - Onboarding',
    'B2': 'B2 - Operação',
    'B3': 'B3 - Controle',
    'B4': 'B4 - Governança',
    'B5': 'B5 - Educação'
  };
  return map[fase] || fase;
};

export const getPhaseColor = (fase) => {
  const map = {
    'B1': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    'B2': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
    'B3': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
    'B4': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
    'B5': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800'
  };
  return map[fase] || 'bg-muted text-foreground border-border';
};

export const calculatePhaseProgress = (activities) => {
  if (!activities || activities.length === 0) return 0;
  const completed = activities.filter(a => a.status === 'Concluído').length;
  return Math.round((completed / activities.length) * 100);
};

export const formatBPODate = (date) => {
  if (!date) return '-';
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (e) {
    return date;
  }
};

export const BPO_STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Em Onboarding', label: 'Em Onboarding' },
  { value: 'Suspenso', label: 'Suspenso' },
  { value: 'Encerrado', label: 'Encerrado' }
];