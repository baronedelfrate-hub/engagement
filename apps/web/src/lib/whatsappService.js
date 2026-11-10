// Envio de WhatsApp pela função enviar-whatsapp (Evolution API). O servidor normaliza o número, envia texto ou documento e registra em whatsapp_envios.
import { supabase } from '@/lib/customSupabaseClient';

// "Connection Closed" vem do WhatsApp quando o aparelho da empresa está desconectado do sistema.
const amigavel = (msg) => (/connection closed|not connected|disconnected|close/i.test(String(msg)) ? 'O WhatsApp desta empresa está desconectado do sistema. Reconecte em Cadastros > WhatsApp (conexão) lendo o QR code e tente de novo.' : msg);

const chamar = async (body) => {
  const { data, error } = await supabase.functions.invoke('enviar-whatsapp', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem genérica */ }
    throw new Error(amigavel(msg));
  }
  if (data?.error) throw new Error(amigavel(data.error));
  return data;
};

// payload: { tipo, para, mensagem, anexo?: { filename, base64, mimetype? }, ref_tipo?, ref_id? }
export const enviarWhatsApp = (payload) => chamar(payload);

// { conectado: boolean, estado: 'open' | 'close' | 'connecting' ... }
// Uma instância por empresa. empresaId só vale para o superadmin (os demais usam a empresa do próprio usuário).
// { estado: 'open' | 'close' | 'connecting' | 'sem_instancia' | 'inexistente', conectado, instancia }
export const statusWhatsApp = (empresaId, linhaId) => chamar({ acao: 'status', empresa_id: empresaId, linha_id: linhaId });

// Gestão da conexão (administrador da empresa ou superadmin): QR code { qr: 'data:image/png;base64,...', codigoPareamento }, criar, desconectar e remover a instância.
// linhaId: qual número da empresa (sem ele, vale a linha Principal). criarInstanciaWhatsApp também cria uma linha nova: { rotulo, telefone, usuarioId, reservada }.
export const qrCodeWhatsApp = (empresaId, linhaId) => chamar({ acao: 'qrcode', empresa_id: empresaId, linha_id: linhaId });
export const criarInstanciaWhatsApp = (empresaId, linhaId, nova = {}) => chamar({ acao: 'criar', empresa_id: empresaId, linha_id: linhaId, rotulo: nova.rotulo, telefone: nova.telefone, usuario_id: nova.usuarioId, reservada: nova.reservada });
export const desconectarWhatsApp = (empresaId, linhaId) => chamar({ acao: 'desconectar', empresa_id: empresaId, linha_id: linhaId });
export const removerInstanciaWhatsApp = (empresaId, linhaId) => chamar({ acao: 'remover', empresa_id: empresaId, linha_id: linhaId });

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
