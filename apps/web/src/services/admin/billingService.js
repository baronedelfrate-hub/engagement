import { supabase } from '@/lib/customSupabaseClient';

export const listarPlanos = async () => {
  const { data, error } = await supabase
    .from('saas_planos')
    .select('*')
    .order('valor_mensal', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const criarPlano = async (plano) => {
  const { data, error } = await supabase.from('saas_planos').insert(plano).select().single();
  if (error) throw error;
  return data;
};

export const atualizarPlano = async (id, plano) => {
  const { data, error } = await supabase.from('saas_planos').update(plano).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const listarAssinaturas = async () => {
  const { data, error } = await supabase
    .from('saas_assinaturas')
    .select(`
      *,
      empresa:empresas(id, razao_social, nome_fantasia),
      plano:saas_planos(id, nome, valor_mensal)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const buscarAssinaturaPorEmpresa = async (empresaId) => {
  const { data, error } = await supabase
    .from('saas_assinaturas')
    .select(`*, plano:saas_planos(id, nome, valor_mensal)`)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// Cria a assinatura se a empresa ainda nao tiver uma (ex: empresas cadastradas antes do modulo de billing existir).
export const salvarAssinatura = async (empresaId, dados) => {
  const existente = await buscarAssinaturaPorEmpresa(empresaId);
  if (existente) {
    const { data, error } = await supabase
      .from('saas_assinaturas')
      .update({ ...dados, updated_at: new Date().toISOString() })
      .eq('empresa_id', empresaId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('saas_assinaturas')
    .insert({ empresa_id: empresaId, ...dados })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const listarFaturas = async (assinaturaId) => {
  const { data, error } = await supabase
    .from('saas_faturas')
    .select('*')
    .eq('assinatura_id', assinaturaId)
    .order('competencia', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const criarFatura = async (fatura) => {
  const { data, error } = await supabase.from('saas_faturas').insert(fatura).select().single();
  if (error) throw error;
  return data;
};

export const marcarFaturaPaga = async (id, forma_pagamento) => {
  const { data, error } = await supabase
    .from('saas_faturas')
    .update({ status: 'pago', data_pagamento: new Date().toISOString().split('T')[0], forma_pagamento })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const marcarFaturaAtrasada = async (id) => {
  const { data, error } = await supabase
    .from('saas_faturas')
    .update({ status: 'atrasado' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const cancelarFatura = async (id) => {
  const { data, error } = await supabase
    .from('saas_faturas')
    .update({ status: 'cancelado' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
