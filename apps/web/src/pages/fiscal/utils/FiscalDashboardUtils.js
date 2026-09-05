import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return dateString;
  }
};

export const calculateDaysPending = (dateString) => {
  if (!dateString) return 0;
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return differenceInDays(new Date(), date);
  } catch (error) {
    return 0;
  }
};

export const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('autorizado') || s.includes('concluído') || s.includes('pago') || s.includes('sucesso')) return 'bg-green-100 text-green-800 border-green-200';
  if (s.includes('cancelado') || s.includes('erro') || s.includes('atrasado') || s.includes('rejeitado')) return 'bg-red-100 text-red-800 border-red-200';
  if (s.includes('pendente') || s.includes('aguardando') || s.includes('processando')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

export const getStatusVariant = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('autorizado') || s.includes('concluído') || s.includes('pago') || s.includes('sucesso')) return 'success';
  if (s.includes('cancelado') || s.includes('erro') || s.includes('atrasado') || s.includes('rejeitado')) return 'destructive';
  if (s.includes('pendente') || s.includes('aguardando') || s.includes('processando')) return 'warning';
  return 'secondary';
};