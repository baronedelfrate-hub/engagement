// Envio de WhatsApp pela função enviar-whatsapp (Evolution API). O servidor normaliza o número, envia texto ou documento e registra em whatsapp_envios.
import { supabase } from '@/lib/customSupabaseClient';

const chamar = async (body) => {
  const { data, error } = await supabase.functions.invoke('enviar-whatsapp', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

// payload: { tipo, para, mensagem, anexo?: { filename, base64, mimetype? }, ref_tipo?, ref_id? }
export const enviarWhatsApp = (payload) => chamar(payload);

// { conectado: boolean, estado: 'open' | 'close' | 'connecting' ... }
export const statusWhatsApp = () => chamar({ acao: 'status' });

// Gestão da conexão (só superadmin): QR code { qr: 'data:image/png;base64,...', codigoPareamento }, criar a instância e desconectar.
export const qrCodeWhatsApp = () => chamar({ acao: 'qrcode' });
export const criarInstanciaWhatsApp = () => chamar({ acao: 'criar' });
export const desconectarWhatsApp = () => chamar({ acao: 'desconectar' });

export const listarEnviosWhatsApp = async (refTipo, refId, limite = 10) => {
  const { data, error } = await supabase.from('whatsapp_envios').select('id, tipo, destinatario, mensagem, anexo, status, erro, created_at')
    .eq('ref_tipo', refTipo).eq('ref_id', refId).order('created_at', { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return data || [];
};

export const apenasDigitos = (t) => String(t || '').replace(/\D/g, '');
export const telefoneValido = (t) => { const d = apenasDigitos(t).replace(/^0+/, ''); return /^(55)?\d{10,11}$/.test(d); };
export const formatarTelefone = (t) => {
  const d = apenasDigitos(t).replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(t || '');
};
