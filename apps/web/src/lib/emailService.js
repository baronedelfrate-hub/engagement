// Envio de e-mail pela função enviar-email (Resend). O servidor monta o layout, anexa os arquivos e registra o envio em email_envios.
import { supabase } from '@/lib/customSupabaseClient';

export const TIPOS_EMAIL = {
  proposta: 'Proposta', cobranca: 'Cobrança', aviso_faturamento: 'Aviso de cobrança do mês', portal: 'Portal do cliente',
  pedido_compra: 'Pedido de compra', relatorio_pagar: 'Relatório de contas a pagar', relatorio_mensal: 'Relatório mensal', outro: 'Outro'
};

// payload: { tipo, para: string[], cc?: string[], assunto, mensagem, destaques?: [{rotulo, valor}], botao?: {texto, url}, anexos?: [{filename, base64}], ref_tipo?, ref_id? }
export const enviarEmail = async (payload) => {
  const { data, error } = await supabase.functions.invoke('enviar-email', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export const listarEnvios = async (refTipo, refId, limite = 10) => {
  const { data, error } = await supabase.from('email_envios').select('id, tipo, destinatarios, assunto, status, erro, anexos, created_at')
    .eq('ref_tipo', refTipo).eq('ref_id', refId).order('created_at', { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return data || [];
};

// "a@x.com; b@y.com, c@z.com" -> ['a@x.com', 'b@y.com', 'c@z.com']
export const separarEmails = (texto) => String(texto || '').split(/[;,\s]+/).map((s) => s.trim()).filter(Boolean);
export const emailValido = (e) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e);

export const bufferParaBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export const moedaBR = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
