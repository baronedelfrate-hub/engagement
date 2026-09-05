import { differenceInDays, startOfDay } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';

export const PHASES = {
  'd-3': { label: 'Pré-Vencimento (D-3)', color: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', description: 'Lembrete Preventivo' },
  'd+1': { label: 'Aviso de Vencimento', color: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-500', description: 'Aviso de Vencimento' },
  'd+5': { label: 'Cobrança Inicial (D+5)', color: 'bg-yellow-500', text: 'text-yellow-500', border: 'border-yellow-500', description: 'Cobrança Formal' },
  'd+10': { label: 'Cobrança Média (D+10)', color: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-500', description: 'Cobrança Ativa' },
  'd+15': { label: 'Cobrança Forte (D+15)', color: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', description: 'Escalonamento' },
  'd+30': { label: 'Jurídico/Negativação (D+30)', color: 'bg-rose-900', text: 'text-rose-900', border: 'border-rose-900', description: 'Inadimplência' },
  'recuperado': { label: 'Título Recuperado', color: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', description: 'Pago / Acordo' }
};

export const getPhaseSequence = () => ['d-3', 'd+1', 'd+5', 'd+10', 'd+15', 'd+30', 'recuperado'];

export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export const calculateDaysUntilDue = (dataVencimento) => {
  if (!dataVencimento) return 0;
  // Use startOfDay to avoid issues with timezones and hours of the day
  return differenceInDays(startOfDay(new Date(dataVencimento)), startOfDay(new Date()));
};

export const calculatePhaseFromDueDate = (dataVencimento, statusCobranca, dataBaixa) => {
  if (statusCobranca === 'recuperado' || dataBaixa) {
    return {
      fase: 'recuperado',
      dias_ate_vencimento: 0,
      dias_atraso: 0,
      status_label: 'Recuperado',
      phase_name: PHASES['recuperado'].label
    };
  }

  const daysUntilDue = calculateDaysUntilDue(dataVencimento);
  const daysOverdue = daysUntilDue < 0 ? -daysUntilDue : 0;
  
  let fase = '';

  // Logic updated based on Task 1 requirements:
  // D-3 or before (daysUntil >= 3) -> D-3
  // D-2 to D+4 (daysUntil between 2 and -4) -> D+1
  // D+5 to D+9 (daysUntil between -5 and -9) -> D+5
  // D+10 to D+14 (daysUntil between -10 and -14) -> D+10
  // D+15 to D+29 (daysUntil between -15 and -29) -> D+15
  // D+30+ (daysUntil <= -30) -> D+30

  if (daysUntilDue >= 3) {
      fase = 'd-3';
  } else if (daysUntilDue <= 2 && daysUntilDue >= -4) {
      fase = 'd+1';
  } else if (daysUntilDue <= -5 && daysUntilDue >= -9) {
      fase = 'd+5';
  } else if (daysUntilDue <= -10 && daysUntilDue >= -14) {
      fase = 'd+10';
  } else if (daysUntilDue <= -15 && daysUntilDue >= -29) {
      fase = 'd+15';
  } else {
      fase = 'd+30';
  }

  return {
    fase,
    dias_ate_vencimento: daysUntilDue,
    dias_atraso: daysOverdue,
    status_label: PHASES[fase]?.description || PHASES[fase]?.label || fase,
    phase_name: PHASES[fase]?.label || fase
  };
};

export const calculatePhaseByDueDate = calculatePhaseFromDueDate;

export const shouldShowInKanban = (record) => {
  if (!record) return false;
  const validStatuses = ['em_cobranca', 'nao_iniciada', 'recuperado'];
  return validStatuses.includes(record.status_cobranca);
};

export const getKanbanColumn = (record) => {
  if (record.status_cobranca === 'recuperado' || record.data_baixa) return 'recuperado';
  const { fase } = calculatePhaseFromDueDate(record.data_vencimento, record.status_cobranca, record.data_baixa);
  return fase;
};

export const calculatePMR = (items) => {
  if (!items || items.length === 0) return 0;
  
  // Filter only paid/recovered items
  const paidItems = items.filter(item => item.status === 'resolvido' || item.status_cobranca === 'recuperado');
  
  if (paidItems.length === 0) return 0;
  
  // Calculate days between emission and payment for each item
  const totalDays = paidItems.reduce((acc, item) => {
    const emissionDate = new Date(item.data_emissao || item.created_at);
    const paymentDate = new Date(item.data_baixa || item.updated_at);
    const days = differenceInDays(paymentDate, emissionDate);
    return acc + Math.max(0, days); // Ensure non-negative days
  }, 0);
  
  // Return average days to payment
  return totalDays / paidItems.length;
};

export const updateAllCobrancaPhases = async () => {
  try {
    const { data: cobrancas, error } = await supabase
      .from('contas_receber')
      .select('id, data_vencimento, status_cobranca')
      .or('status_cobranca.eq.em_cobranca,status_cobranca.eq.nao_iniciada');
      
    if (error) throw error;

    let updatedCount = 0;
    const updates = [];
    for (const item of cobrancas) {
      const { fase: newPhase } = calculatePhaseFromDueDate(item.data_vencimento, item.status_cobranca, null);
      // Logic to update fase if stored in DB (currently fase is dynamic, but if we stored it):
      // This function might be legacy or for cache. We rely on dynamic calc in hooks mostly.
    }
    return { updated_count: updatedCount, success: true };
  } catch (error) {
    console.error('Error updating phases:', error);
    return { updated_count: 0, success: false, error };
  }
};

export const calculateInadimplencia = (items) => {
  if (!items || items.length === 0) return 0;
  const activeItems = items.filter(i => i.status_cobranca !== 'recuperado');
  if (activeItems.length === 0) return 0;
  
  const totalValue = activeItems.reduce((acc, item) => acc + Number(item.valor_original || 0), 0);
  
  const overdueItems = activeItems.filter(item => {
    const { dias_atraso } = calculatePhaseFromDueDate(item.data_vencimento, item.status_cobranca, null);
    return dias_atraso > 0;
  });
  
  const overdueValue = overdueItems.reduce((acc, item) => acc + Number(item.valor_original || 0), 0);
  return totalValue === 0 ? 0 : (overdueValue / totalValue) * 100;
};