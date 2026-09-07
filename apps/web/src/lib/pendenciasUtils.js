import React from 'react';
import { differenceInDays, isBefore, startOfDay, parseISO } from 'date-fns';
import { AlertCircle, Clock, CheckCircle2, XCircle, FileText, AlertTriangle, Settings, RefreshCcw, HelpCircle } from 'lucide-react';

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'aberta': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
    case 'em tratamento': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800';
    case 'aguardando cliente': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
    case 'resolvida': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
    case 'cancelada': return 'bg-muted text-foreground border-border';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const getStatusLabel = (status) => {
  return status || 'Desconhecido';
};

export const getStatusIcon = (status, className = "w-4 h-4") => {
  switch (status?.toLowerCase()) {
    case 'aberta': return React.createElement(AlertCircle, { className });
    case 'em tratamento': return React.createElement(RefreshCcw, { className });
    case 'aguardando cliente': return React.createElement(Clock, { className });
    case 'resolvida': return React.createElement(CheckCircle2, { className });
    case 'cancelada': return React.createElement(XCircle, { className });
    default: return React.createElement(HelpCircle, { className });
  }
};

export const getTipoColor = (tipo) => {
  switch (tipo?.toLowerCase()) {
    case 'documento faltante': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800';
    case 'nota divergente': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
    case 'conciliação pendente': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
    case 'imposto divergente': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800';
    case 'ajuste contábil': return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800';
    case 'classificação incorreta': return 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-800';
    default: return 'bg-muted text-foreground border-border';
  }
};

export const getTipoLabel = (tipo) => {
  return tipo || 'Outro';
};

export const getTipoIcon = (tipo, className = "w-4 h-4") => {
  switch (tipo?.toLowerCase()) {
    case 'documento faltante': return React.createElement(FileText, { className });
    case 'nota divergente': return React.createElement(AlertTriangle, { className });
    case 'conciliação pendente': return React.createElement(RefreshCcw, { className });
    case 'imposto divergente': return React.createElement(AlertCircle, { className });
    case 'ajuste contábil': return React.createElement(Settings, { className });
    default: return React.createElement(FileText, { className });
  }
};

export const calculateDiasEmAberto = (dataAbertura, dataResolucao) => {
  if (!dataAbertura) return 0;
  const start = parseISO(dataAbertura);
  const end = dataResolucao ? parseISO(dataResolucao) : new Date();
  return differenceInDays(end, start);
};

export const isOverdue = (prazo) => {
  if (!prazo) return false;
  return isBefore(parseISO(prazo), startOfDay(new Date()));
};

export const canChangeStatus = (currentStatus, newStatus) => {
  const c = currentStatus?.toLowerCase();
  const n = newStatus?.toLowerCase();
  
  if (c === n) return false;
  if (c === 'cancelada' || c === 'resolvida') return false; // Terminal states
  return true;
};

export const canDeletePendencia = (status) => {
  const s = status?.toLowerCase();
  return s === 'aberta';
};

export const formatCompetencia = (competencia) => {
  if (!competencia) return '-';
  try {
    const [year, month] = competencia.split('-');
    return `${month}/${year}`;
  } catch (e) {
    return competencia;
  }
};

export const getStatusOptions = () => [
  'Aberta',
  'Em tratamento',
  'Aguardando cliente',
  'Resolvida',
  'Cancelada'
];

export const getTipoOptions = () => [
  'Documento faltante',
  'Nota divergente',
  'Conciliação pendente',
  'Imposto divergente',
  'Ajuste contábil',
  'Classificação incorreta',
  'Outro'
];