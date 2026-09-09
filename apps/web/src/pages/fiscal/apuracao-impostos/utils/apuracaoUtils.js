import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return dateString;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Em aberto': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'Em conferência': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800';
    case 'Fechado': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
    case 'Enviado à contabilidade': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800';
    case 'Pago': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const TIPOS_IMPOSTO = [
  'ISS', 'ICMS', 'PIS', 'COFINS', 'IRRF', 'CSLL', 'INSS', 'Simples Nacional', 'Outros'
];

export const STATUS_APURACAO = [
  'Em aberto', 'Em conferência', 'Fechado', 'Enviado à contabilidade', 'Pago'
];