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
  const { data, error } = await supabase.from('whatsapp_conversas').select('id, jid, nome, apelido, telefone, eh_grupo, ultima_mensagem, ultima_data, nao_lidas, foto_path, foto_atualizada')
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
// Copia as fotos de perfil das conversas (a função pula as que já foram verificadas há pouco) e devolve links temporários para exibi-las.
export const buscarFotos = (empresaId) => chamar({ acao: 'fotos', empresa_id: empresaId });
export const urlsDasFotos = async (paths) => {
  const unicos = [...new Set((paths || []).filter(Boolean))];
  if (!unicos.length) return {};
  const { data, error } = await supabase.storage.from('whatsapp-midia').createSignedUrls(unicos, 3600);
  if (error) return {};
  return Object.fromEntries((data || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]));
};

export const configurarRecebimento = (empresaId) => chamar({ acao: 'configurar_webhook', empresa_id: empresaId });

export const listarContatos = async (companyId) => {
  const { data, error } = await supabase.from('whatsapp_contatos').select('id, jid, nome_whatsapp, apelido, telefone').eq('company_id', companyId).order('apelido', { nullsFirst: false }).limit(3000);
  if (error) throw new Error(error.message);
  return data || [];
};
// Baixa a agenda do WhatsApp e já aplica os nomes (e telefones) às conversas que existem.
export const baixarContatos = async (empresaId) => {
  const r = await chamar({ acao: 'contatos', empresa_id: empresaId });
  const { data } = await supabase.rpc('whatsapp_aplicar_contatos', { p_company: empresaId });
  return { ...r, conversasNomeadas: Number(data) || 0 };
};
export const iniciarConversa = (telefone, nome, empresaId) => chamar({ acao: 'iniciar_conversa', telefone, nome, empresa_id: empresaId });
export const definirNome = (conversaId, nome) => supabase.rpc('whatsapp_definir_nome', { p_conversa: conversaId, p_nome: nome });

export const formatarTelefoneBR = (t) => {
  const d = String(t || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d ? `+${d}` : '';
};
// Nome que aparece na lista: o que foi dado no ERP, depois o do WhatsApp, depois o telefone. Nunca mostra o identificador interno (LID).
export const nomeDaConversa = (c) => {
  if (!c) return 'Conversa';
  if (c.apelido) return c.apelido;
  if (c.nome && !/^[0-9+\s()-]+$/.test(c.nome)) return c.nome;
  if (c.telefone) return formatarTelefoneBR(c.telefone);
  if (c.eh_grupo) return 'Grupo';
  const num = String(c.jid || '').split('@')[0];
  return String(c.jid || '').endsWith('@s.whatsapp.net') ? formatarTelefoneBR(num) : 'Contato (número oculto pelo WhatsApp)';
};
export const subtituloDaConversa = (c) => (c?.eh_grupo ? 'Grupo' : c?.telefone ? formatarTelefoneBR(c.telefone) : String(c?.jid || '').endsWith('@lid') ? 'Número oculto pelo WhatsApp. Dê um nome para identificar.' : formatarTelefoneBR(String(c?.jid || '').split('@')[0]));
