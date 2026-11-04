// Chat do WhatsApp dentro do ERP (função whatsapp-chat). Leitura direto das tabelas (com RLS por empresa); envio e sincronização pela função.
import { supabase } from '@/lib/customSupabaseClient';

const chamar = async (body) => {
  const { data, error } = await supabase.functions.invoke('whatsapp-chat', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* mantém a mensagem genérica */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export const listarConversas = async (companyId, limite = 200) => {
  const { data, error } = await supabase.from('whatsapp_conversas').select('id, jid, nome, eh_grupo, ultima_mensagem, ultima_data, nao_lidas')
    .eq('company_id', companyId).order('ultima_data', { ascending: false, nullsFirst: false }).limit(limite);
  if (error) throw new Error(error.message);
  return data || [];
};
export const listarMensagens = async (conversaId, limite = 300) => {
  const { data, error } = await supabase.from('whatsapp_mensagens').select('id, message_id, de_mim, remetente_nome, tipo, texto, midia_path, midia_nome, midia_mime, status, data')
    .eq('conversa_id', conversaId).order('data', { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return (data || []).reverse();
};
export const marcarLida = (conversaId) => supabase.rpc('whatsapp_marcar_lida', { p_conversa: conversaId });
export const urlDaMidia = async (path) => {
  const { data, error } = await supabase.storage.from('whatsapp-midia').createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
};

export const blobParaBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = reject;
  r.readAsDataURL(blob);
});

export const enviarTextoChat = (jid, texto, empresaId) => chamar({ acao: 'enviar', tipo: 'texto', jid, texto, empresa_id: empresaId });
export const enviarArquivoChat = async (jid, arquivo, legenda, empresaId) =>
  chamar({ acao: 'enviar', tipo: 'arquivo', jid, texto: legenda || '', empresa_id: empresaId, anexo: { base64: await blobParaBase64(arquivo), filename: arquivo.name, mimetype: arquivo.type || 'application/octet-stream' } });
export const enviarAudioChat = async (jid, blob, empresaId) =>
  chamar({ acao: 'enviar', tipo: 'audio', jid, empresa_id: empresaId, anexo: { base64: await blobParaBase64(blob), filename: 'audio.webm', mimetype: blob.type || 'audio/webm' } });
export const sincronizarChat = (empresaId) => chamar({ acao: 'sincronizar', empresa_id: empresaId });
export const baixarMidiaChat = (mensagemId, empresaId) => chamar({ acao: 'midia', mensagem_id: mensagemId, empresa_id: empresaId });
export const configurarRecebimento = (empresaId) => chamar({ acao: 'configurar_webhook', empresa_id: empresaId });

export const nomeDaConversa = (c) => c?.nome || (c?.jid ? c.jid.split('@')[0].replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : 'Conversa');
