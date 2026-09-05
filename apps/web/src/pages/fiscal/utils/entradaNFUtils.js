import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const validateChaveAcesso = (chave) => {
  if (!chave) return false;
  const cleanChave = chave.replace(/\D/g, '');
  return cleanChave.length === 44;
};

export const validateCNPJ = (cnpj) => {
  if (!cnpj) return false;
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.length === 14;
};

export const validateDates = (emissao, entrada, vencimento) => {
  if (!emissao || !entrada || !vencimento) return true; // Let required validation handle empty
  const dEmissao = new Date(emissao);
  const dEntrada = new Date(entrada);
  const dVencimento = new Date(vencimento);
  
  // Emissão should be <= Entrada
  if (dEmissao > dEntrada) return false;
  return true;
};

export const validatePositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
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

export const calculateValorLiquido = (total, impostos) => {
  const t = parseFloat(total) || 0;
  const i = parseFloat(impostos) || 0;
  return Math.max(0, t - i);
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'Pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Conferência': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Lançada': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Integrada': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Enviada à contabilidade':
    case 'Enviada': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'Cancelada': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

export const getStatusLabel = (status) => {
  return status || 'Desconhecido';
};

export const STATUS_OPTIONS = [
  'Pendente',
  'Conferência',
  'Lançada',
  'Integrada',
  'Enviada à contabilidade',
  'Cancelada'
];

export const isValidTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) return true;
  if (newStatus === 'Cancelada') return true; // Can cancel anytime

  const transitions = {
    'Pendente': ['Conferência', 'Lançada'],
    'Conferência': ['Lançada'],
    'Lançada': ['Integrada'],
    'Integrada': ['Enviada à contabilidade'],
    'Enviada à contabilidade': []
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
};