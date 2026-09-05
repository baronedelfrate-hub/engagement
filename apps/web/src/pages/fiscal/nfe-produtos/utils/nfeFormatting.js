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
    case 'Em digitação': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Aguardando emissão': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Emitida': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Cancelada': return 'bg-red-100 text-red-800 border-red-200';
    case 'Rejeitada': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Denegada': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export const getStatusLabel = (status) => {
  return status || 'Desconhecido';
};