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

export const getStatusManifestacaoColor = (status) => {
  switch (status) {
    case 'Pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Ciência': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Confirmação': return 'bg-green-100 text-green-800 border-green-200';
    case 'Desconhecimento': return 'bg-red-100 text-red-800 border-red-200';
    case 'Não realizada': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const getSituacaoConsultaColor = (situacao) => {
  switch (situacao) {
    case 'Não consultada': return 'bg-muted text-muted-foreground border-border';
    case 'Consultada': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'XML Disponível': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const canManifestar = (status) => {
  return status !== 'Confirmação' && status !== 'Desconhecimento';
};

export const canImport = (situacao, statusManifestacao, importado) => {
  if (importado) return false;
  if (statusManifestacao === 'Desconhecimento' || statusManifestacao === 'Não realizada') return false;
  return situacao === 'XML Disponível';
};

export const MANIFESTACAO_OPTIONS = [
  'Pendente',
  'Ciência',
  'Confirmação',
  'Desconhecimento',
  'Não realizada'
];

export const SITUACAO_OPTIONS = [
  'Não consultada',
  'Consultada',
  'XML Disponível'
];