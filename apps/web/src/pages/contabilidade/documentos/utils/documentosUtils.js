import React from 'react';
import { FileText, FileSpreadsheet, Receipt, FileSignature, Landmark, Wallet, MoreHorizontal, CheckCircle2, Clock, Send, AlertCircle, FileImage as FileIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DOCUMENT_TYPES = [
  'NF entrada', 
  'NF saída', 
  'Extrato', 
  'Comprovante', 
  'Folha', 
  'Imposto', 
  'Contrato', 
  'Outro'
];

export const DOCUMENT_STATUSES = [
  'Pendente', 
  'Separado', 
  'Enviado', 
  'Conferido', 
  'Ajuste solicitado'
];

export function formatCompetencia(comp) {
  if (!comp) return '-';
  try {
    const [year, month] = comp.split('-');
    return format(new Date(parseInt(year), parseInt(month) - 1), 'MMM/yyyy', { locale: ptBR }).toUpperCase();
  } catch (e) {
    return comp;
  }
}

export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'pendente': return 'bg-red-100 text-red-800 border-red-200';
    case 'separado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'enviado': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'conferido': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'ajuste solicitado': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getStatusLabel(status) {
  return status || 'Desconhecido';
}

export function getStatusIcon(status) {
  const iconProps = { className: "w-4 h-4" };
  switch (status?.toLowerCase()) {
    case 'pendente': return React.createElement(Clock, iconProps);
    case 'separado': return React.createElement(FileIcon, iconProps);
    case 'enviado': return React.createElement(Send, iconProps);
    case 'conferido': return React.createElement(CheckCircle2, iconProps);
    case 'ajuste solicitado': return React.createElement(AlertCircle, iconProps);
    default: return React.createElement(Clock, iconProps);
  }
}

export function getDocumentTypeLabel(tipo) {
  return tipo || 'Outro';
}

export function getDocumentTypeIcon(tipo, className = "w-4 h-4") {
  const iconProps = { className };
  switch (tipo?.toLowerCase()) {
    case 'nf entrada': return React.createElement(FileText, iconProps);
    case 'nf saída': return React.createElement(FileText, iconProps);
    case 'extrato': return React.createElement(Landmark, iconProps);
    case 'comprovante': return React.createElement(Receipt, iconProps);
    case 'folha': return React.createElement(FileSpreadsheet, iconProps);
    case 'imposto': return React.createElement(Wallet, iconProps);
    case 'contrato': return React.createElement(FileSignature, iconProps);
    default: return React.createElement(MoreHorizontal, iconProps);
  }
}

export function validateFile(file) {
  const maxSizeMB = 50;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `Tamanho máximo excedido (${maxSizeMB}MB)` };
  }

  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Formato de arquivo não suportado.' };
  }

  return { valid: true };
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function canDeleteDocument(status) {
  const s = status?.toLowerCase();
  return s !== 'enviado' && s !== 'conferido';
}

export function canChangeStatus(currentStatus, newStatus) {
  const c = currentStatus?.toLowerCase();
  const n = newStatus?.toLowerCase();
  
  if (c === n) return false;
  if (c === 'conferido') return false;
  return true;
}

export function generateSendingReport(documents) {
  if (!documents || documents.length === 0) return "Nenhum documento selecionado.";
  
  let report = "Relatório de Envio de Documentos Contábeis\n";
  report += "Data: " + format(new Date(), 'dd/MM/yyyy HH:mm') + "\n\n";
  
  const byType = documents.reduce((acc, doc) => {
    const type = doc.tipo || 'Outro';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  for (const [type, docs] of Object.entries(byType)) {
    report += `[${type.toUpperCase()}] - ${docs.length} documento(s)\n`;
    docs.forEach(d => {
      report += `  - ${d.descricao} (Ref: ${d.competencia})\n`;
    });
    report += "\n";
  }

  return report;
}