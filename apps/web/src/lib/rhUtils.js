import { differenceInDays, addDays, isAfter, isBefore, format, parseISO } from 'date-fns';

export const calculateDiasRestantes = (diasTotais, diasGozados) => {
  return Math.max(0, diasTotais - (diasGozados || 0));
};

export const formatCPF = (cpf) => {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const validateCPF = (cpf) => {
  if (!cpf) return false;
  const strCPF = cpf.replace(/[^\d]/g, "");
  let soma = 0;
  let resto;

  if (strCPF === "00000000000") return false;

  for (let i = 1; i <= 9; i++) {
    soma = soma + parseInt(strCPF.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;

  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(strCPF.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma = soma + parseInt(strCPF.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;

  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(strCPF.substring(10, 11))) return false;

  return true;
};

export const calculateExamStatus = (proximaData) => {
  if (!proximaData) return 'Pendente';
  const hoje = new Date();
  const proxima = new Date(proximaData);
  
  if (isBefore(proxima, hoje)) return 'Vencido';
  if (differenceInDays(proxima, hoje) <= 30) return 'A Vencer';
  return 'Válido';
};

export const calculateNRStatus = (validade) => {
  return calculateExamStatus(validade);
};

export const getAlertColor = (status) => {
  switch (status) {
    case 'Vencido': return 'bg-red-100 text-red-800 border-red-200';
    case 'A Vencer': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Válido': return 'bg-green-100 text-green-800 border-green-200';
    case 'Pendente': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-slate-100 text-slate-800';
  }
};