import React from 'react';
import { FileText, CreditCard, Landmark, Users, Edit3, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'rascunho': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'conferido': return 'bg-green-100 text-green-800 border-green-200';
    case 'exportado': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getStatusLabel(status) {
  return status || 'Desconhecido';
}

export function getOrigemLabel(origem) {
  return origem || 'Outro';
}

export function getOrigemIcon(origem, className = "w-4 h-4") {
  const iconProps = { className };
  switch (origem?.toLowerCase()) {
    case 'nf': return React.createElement(FileText, iconProps);
    case 'pagamento': return React.createElement(CreditCard, iconProps);
    case 'recebimento': return React.createElement(Landmark, iconProps);
    case 'folha': return React.createElement(Users, iconProps);
    case 'ajuste manual': return React.createElement(Edit3, iconProps);
    default: return React.createElement(HelpCircle, iconProps);
  }
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  } catch (e) {
    return dateString;
  }
}

export function formatCompetencia(comp) {
  if (!comp) return '-';
  try {
    const [year, month] = comp.split('-');
    return `${month}/${year}`;
  } catch (e) {
    return comp;
  }
}

export function validateLancamento(data) {
  const errors = [];
  if (!data.empresa_id) errors.push('Empresa é obrigatória.');
  if (!data.data) errors.push('Data é obrigatória.');
  if (!data.competencia) errors.push('Competência é obrigatória.');
  if (!data.historico) errors.push('Histórico é obrigatório.');
  if (!data.conta_debito_id) errors.push('Conta Débito é obrigatória.');
  if (!data.conta_credito_id) errors.push('Conta Crédito é obrigatória.');
  if (data.conta_debito_id === data.conta_credito_id) errors.push('Conta Débito e Conta Crédito não podem ser iguais.');
  if (!data.valor || parseFloat(data.valor) <= 0) errors.push('Valor deve ser maior que zero.');
  if (!data.origem) errors.push('Origem é obrigatória.');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function canEditLancamento(status) {
  const s = status?.toLowerCase();
  return s === 'rascunho' || s === 'pendente';
}

export function canDeleteLancamento(status) {
  const s = status?.toLowerCase();
  return s === 'rascunho';
}

export function canChangeStatus(currentStatus, newStatus) {
  const c = currentStatus?.toLowerCase();
  const n = newStatus?.toLowerCase();
  
  if (c === n) return false;
  if (c === 'rascunho' && n === 'pendente') return true;
  if (c === 'pendente' && n === 'conferido') return true;
  if (c === 'pendente' && n === 'rascunho') return true;
  if (c === 'conferido' && n === 'exportado') return true;
  if (c === 'conferido' && n === 'pendente') return true;
  return false;
}

export function calculateBalance(debitos, creditos) {
  const sumDebitos = debitos.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  const sumCreditos = creditos.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
  return {
    debitos: sumDebitos,
    creditos: sumCreditos,
    diferenca: sumDebitos - sumCreditos
  };
}