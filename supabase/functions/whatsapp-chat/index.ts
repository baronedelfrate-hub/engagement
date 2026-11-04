import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Chat do WhatsApp dentro do ERP, sobre a Evolution API (v2), com UMA instância por empresa (tabela whatsapp_instancias).
//  - Webhook (sem login): a Evolution chama ?i=<instância>&t=<token>; o token é um HMAC da instância com EVOLUTION_API_KEY (não precisa de segredo novo).
//    Eventos tratados: messages.upsert, send.message, messages.update. Grava conversas e mensagens e baixa as mídias para a pasta whatsapp-midia.
//  - Ações com login (corpo { acao }): enviar (texto, arquivo ou áudio), sincronizar (conversas e últimas mensagens), midia (baixa uma mídia que ficou pendente),
//    configurar_webhook (aponta a Evolution para esta função; administrador da empresa ou superadmin).
// Segredos usados (os mesmos de enviar-whatsapp): EVOLUTION_API_URL, EVOLUTION_API_KEY.
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const EVENTOS = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE'];
const BUCKET = 'whatsapp-midia';
const MAX_BASE64 = 20 * 1024 * 1024;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const tokenDa = async (instancia: string, chave: string) => {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(instancia))).slice(0, 40);
};
const iguais = (a: string, b: string) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'application/pdf': 'pdf' };
const extDe = (mime: string, nome?: string) => {
  const m = String(mime || '').split(';')[0].toLowerCase();
  if (EXT[m]) return EXT[m];
  const n = String(nome || '').split('.').pop();
  return n && n.length <= 5 ? n.toLowerCase() : 'bin';
};
const semPrefixo = (b64: string) => String(b64 || '').replace(/^data:[^;]+;base64,/, '');
const bytesDe = (b64: string) => Uint8Array.from(atob(semPrefixo(b64)), (c) => c.charCodeAt(0));

// Extrai tipo, texto e metadados do formato de mensagem do Baileys/Evolution.
const lerMensagem = (m0: Obj) => {
  let m: Obj = m0 ?? {};
  for (const w of ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'documentWithCaptionMessage', 'editedMessage']) if (m[w]?.message) m = m[w].message;
  if (m.protocolMessage || m.reactionMessage || m.senderKeyDistributionMessage) return null;
  if (m.conversation != null) return { tipo: 'texto', texto: String(m.conversation) };
  if (m.extendedTextMessage) return { tipo: 'texto', texto: String(m.extendedTextMessage.text ?? '') };
  if (m.imageMessage) return { tipo: 'imagem', texto: m.imageMessage.caption ?? '', mime: m.imageMessage.mimetype };
  if (m.videoMessage) return { tipo: 'video', texto: m.videoMessage.caption ?? '', mime: m.videoMessage.mimetype };
  if (m.audioMessage) return { tipo: 'audio', texto: '', mime: m.audioMessage.mimetype };
  if (m.documentMessage) return { tipo: 'documento', texto: m.documentMessage.caption ?? '', mime: m.documentMessage.mimetype, nome: m.documentMessage.fileName ?? m.documentMessage.title };
  if (m.stickerMessage) return { tipo: 'figurinha', texto: '', mime: m.stickerMessage.mimetype };
  if (m.contactMessage || m.contactsArrayMessage) return { tipo: 'outro', texto: '[Contato compartilhado]' };
  if (m.locationMessage) return { tipo: 'outro', texto: '[Localização]' };
  return { tipo: 'outro', texto: '[Mensagem não suportada]' };
};
const RESUMO: Record<string, string> = { imagem: '📷 Foto', video: '🎥 Vídeo', audio: '🎤 Áudio', documento: '📄 Documento', figurinha: 'Figurinha', outro: 'Mensagem' };
const resumoDe = (tipo: string, texto: string) => (texto?.trim() ? (tipo === 'texto' ? texto : `${RESUMO[tipo] ?? ''} ${texto}`.trim()) : (RESUMO[tipo] ?? 'Mensagem')).slice(0, 140);
const dataDe = (ts: unknown) => {
  const n = typeof ts === 'object' && ts ? Number((ts as Obj).low ?? 0) : Number(ts ?? 0);
  return n > 0 ? new Date((n > 1e12 ? n : n * 1000)).toISOString() : new Date().toISOString();
};
const STATUS: Record<string, string> = { SERVER_ACK: 'enviada', DELIVERY_ACK: 'entregue', READ: 'lida', PLAYED: 'lida' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const base = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/+$/, '');
  const chave = Deno.env.get('EVOLUTION_API_KEY') ?? '';
  const cab = { apikey: chave, 'Content-Type': 'application/json' };

  // ---- conversas e mensagens (compartilhado pelo webhook, pela sincronização e pelo envio) ----
  const garantirConversa = async (companyId: string, instancia: string, jid: string, nome?: string | null) => {
    const { data: ex } = await admin.from('whatsapp_conversas').select('id, nome').eq('company_id', companyId).eq('jid', jid).maybeSingle();
    if (ex) {
      if (nome && !ex.nome) await admin.from('whatsapp_conversas').update({ nome }).eq('id', ex.id);
      return ex.id as string;
    }
    const grupo = jid.endsWith('@g.us');
    let titulo = nome ?? null;
    if (grupo && base) {
      try {
        const r = await fetch(`${base}/group/findGroupInfos/${encodeURIComponent(instancia)}?groupJid=${encodeURIComponent(jid)}`, { headers: cab });
        const t = await r.json().catch(() => ({}));
        if (r.ok && t?.subject) titulo = String(t.subject);
      } catch { /* sem nome do grupo */ }
    }
    const { data: nova, error } = await admin.from('whatsapp_conversas').insert({ company_id: companyId, jid, nome: titulo, eh_grupo: grupo }).select('id').single();
    if (error) { // corrida: outra chamada criou ao mesmo tempo
      const { data: de } = await admin.from('whatsapp_conversas').select('id').eq('company_id', companyId).eq('jid', jid).single();
      return de!.id as string;
    }
    return nova.id as string;
  };

  const baixarMidia = async (companyId: string, instancia: string, conversaId: string, messageId: string, tipo: string, mime?: string, nome?: string, key?: Obj) => {
    try {
      const r = await fetch(`${base}/chat/getBase64FromMediaMessage/${encodeURIComponent(instancia)}`, {
        method: 'POST', headers: cab, body: JSON.stringify({ message: { key: key ?? { id: messageId } }, convertToMp4: false }) });
      const t = await r.json().catch(() => ({}));
      const b64 = t?.base64 ? semPrefixo(t.base64) : '';
      if (!r.ok || !b64 || b64.length > MAX_BASE64) return null;
      const m = String(t?.mimetype || mime || 'application/octet-stream');
      const arquivo = t?.fileName || nome || `${tipo}.${extDe(m)}`;
      const caminho = `${companyId}/${conversaId}/${messageId.replace(/[^A-Za-z0-9_-]/g, '')}.${extDe(m, arquivo)}`;
      const up = await admin.storage.from(BUCKET).upload(caminho, bytesDe(b64), { contentType: m.split(';')[0], upsert: true });
      if (up.error) return null;
      return { midia_path: caminho, midia_nome: String(arquivo).slice(0, 150), midia_mime: m };
    } catch { return null; }
  };

  // Grava (ou atualiza) uma mensagem recebida/enviada no formato do Evolution.
  const gravarMensagem = async (companyId: string, instancia: string, d: Obj, opc: { baixar?: boolean } = {}) => {
    const key = d.key ?? {};
    const jid: string = key.remoteJid ?? d.remoteJid ?? '';
    const messageId: string = key.id ?? d.keyId ?? d.id ?? '';
    if (!jid || !messageId || jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) return;
    const lida = lerMensagem(d.message ?? {});
    if (!lida) return;
    const deMim = !!key.fromMe;
    const grupo = jid.endsWith('@g.us');
    const nomeConversa = !deMim && !grupo ? (d.pushName ?? null) : null;
    const conversaId = await garantirConversa(companyId, instancia, jid, nomeConversa);
    const { data: ja } = await admin.from('whatsapp_mensagens').select('id').eq('company_id', companyId).eq('message_id', messageId).maybeSingle();
    if (ja) return; // já gravada (por exemplo, enviada pelo ERP)
    const quando = dataDe(d.messageTimestamp);
    const linha: Obj = {
      company_id: companyId, conversa_id: conversaId, message_id: messageId, de_mim: deMim, remetente_nome: deMim ? 'Você' : (d.pushName ?? null),
      tipo: lida.tipo, texto: lida.texto || null, midia_mime: lida.mime ?? null, midia_nome: lida.nome ?? null,
      status: deMim ? (STATUS[String(d.status ?? '').toUpperCase()] ?? 'enviada') : 'recebida', data: quando
    };
    if (opc.baixar !== false && ['imagem', 'video', 'audio', 'documento', 'figurinha'].includes(lida.tipo)) {
      const m = await baixarMidia(companyId, instancia, conversaId, messageId, lida.tipo, lida.mime, lida.nome, key);
      if (m) Object.assign(linha, m);
    }
    const { error } = await admin.from('whatsapp_mensagens').insert(linha);
    if (error) return;
    const { data: conv } = await admin.from('whatsapp_conversas').select('nao_lidas, ultima_data').eq('id', conversaId).single();
    const maisNova = !conv?.ultima_data || new Date(quando) >= new Date(conv.ultima_data);
    await admin.from('whatsapp_conversas').update({
      ...(maisNova ? { ultima_mensagem: resumoDe(lida.tipo, lida.texto ?? ''), ultima_data: quando } : {}),
      ...(!deMim && opc.baixar !== false ? { nao_lidas: (conv?.nao_lidas ?? 0) + 1 } : {})
    }).eq('id', conversaId);
  };

  try {
    const url = new URL(req.url);
    const instQuery = url.searchParams.get('i');
    // ================= webhook da Evolution =================
    if (instQuery) {
      if (!chave) return json({ error: 'Segredo ausente.' }, 500);
      const esperado = await tokenDa(instQuery, chave);
      if (!iguais(esperado, url.searchParams.get('t') ?? '')) return json({ error: 'Token inválido.' }, 401);
      const { data: inst } = await admin.from('whatsapp_instancias').select('company_id').eq('instancia', instQuery).maybeSingle();
      if (!inst) return json({ ok: true, ignorado: 'instância desconhecida' });
      const corpo: Obj = await req.json().catch(() => ({}));
      const evento = String(corpo.event ?? '').toLowerCase().replace(/_/g, '.');
      const dados = corpo.data;
      const lista: Obj[] = Array.isArray(dados) ? dados : (dados?.messages ? dados.messages : [dados]).filter(Boolean);
      if (evento === 'messages.upsert' || evento === 'send.message') {
        for (const d of lista) await gravarMensagem(inst.company_id, instQuery, d);
      } else if (evento === 'messages.update') {
        for (const d of lista) {
          const id = d?.keyId ?? d?.key?.id ?? d?.messageId;
          const st = STATUS[String(d?.status ?? '').toUpperCase()];
          if (id && st) await admin.from('whatsapp_mensagens').update({ status: st }).eq('company_id', inst.company_id).eq('message_id', id).eq('de_mim', true);
        }
      }
      return json({ ok: true });
    }

    // ================= ações com login =================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);
    const { data: { user: caller } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return json({ error: 'Não autenticado.' }, 401);
    const { data: perfil } = await admin.from('profiles').select('role, company_id').eq('id', caller.id).single();
    if (!perfil || !['admin', 'user', 'superadmin'].includes(perfil.role)) return json({ error: 'Seu perfil não pode usar o WhatsApp.' }, 403);
    if (!base || !chave) return json({ error: 'O WhatsApp ainda não foi configurado (faltam EVOLUTION_API_URL e EVOLUTION_API_KEY nos segredos do Supabase).' }, 500);

    const b: Obj = await req.json();
    const empresa: string | null = perfil.role === 'superadmin' && b.empresa_id ? String(b.empresa_id) : (perfil.company_id ?? null);
    if (!empresa) return json({ error: 'Escolha a empresa.' }, 400);
    const { data: inst } = await admin.from('whatsapp_instancias').select('instancia').eq('company_id', empresa).maybeSingle();
    if (!inst) return json({ error: 'Esta empresa ainda não conectou um WhatsApp. Conecte em Configurações > WhatsApp.' }, 400);
    const instancia: string = inst.instancia;
    const inst_enc = encodeURIComponent(instancia);

    if (b.acao === 'configurar_webhook') {
      if (!['admin', 'superadmin'].includes(perfil.role)) return json({ error: 'Somente o administrador configura o recebimento.' }, 403);
      const urlWebhook = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-chat?i=${encodeURIComponent(instancia)}&t=${await tokenDa(instancia, chave)}`;
      const variantes: Obj[] = [
        { webhook: { enabled: true, url: urlWebhook, byEvents: false, base64: false, events: EVENTOS } },
        { webhook: { enabled: true, url: urlWebhook, webhookByEvents: false, webhookBase64: false, events: EVENTOS } },
        { enabled: true, url: urlWebhook, webhook_by_events: false, webhook_base64: false, events: EVENTOS }
      ];
      let ultimo = '';
      for (const v of variantes) {
        const r = await fetch(`${base}/webhook/set/${inst_enc}`, { method: 'POST', headers: cab, body: JSON.stringify(v) });
        const t = await r.json().catch(() => ({}));
        if (r.ok) return json({ success: true });
        ultimo = JSON.stringify(t?.response?.message ?? t?.message ?? t).slice(0, 300);
      }
      return json({ error: `A Evolution API não aceitou o webhook: ${ultimo}` }, 502);
    }

    if (b.acao === 'sincronizar') {
      const r = await fetch(`${base}/chat/findChats/${inst_enc}`, { method: 'POST', headers: cab, body: JSON.stringify({}) });
      const t = await r.json().catch(() => ([]));
      if (!r.ok) return json({ error: `Não foi possível listar as conversas: ${JSON.stringify(t?.response?.message ?? t?.message ?? t).slice(0, 200)}` }, 502);
      const chats: Obj[] = (Array.isArray(t) ? t : (t?.chats ?? t?.records ?? [])).filter((c: Obj) => (c.remoteJid ?? c.id) && !String(c.remoteJid ?? c.id).endsWith('@broadcast')).slice(0, 40);
      let conversas = 0; let mensagens = 0;
      for (const c of chats) {
        const jid = String(c.remoteJid ?? c.id);
        const conversaId = await garantirConversa(empresa, instancia, jid, c.pushName ?? c.name ?? c.subject ?? null);
        conversas++;
        try {
          const rm = await fetch(`${base}/chat/findMessages/${inst_enc}`, { method: 'POST', headers: cab, body: JSON.stringify({ where: { key: { remoteJid: jid } }, page: 1, offset: 30 }) });
          const tm = await rm.json().catch(() => ({}));
          const regs: Obj[] = Array.isArray(tm) ? tm : (tm?.messages?.records ?? tm?.messages ?? tm?.records ?? []);
          for (const d of regs) {
            const antes = await admin.from('whatsapp_mensagens').select('id', { count: 'exact', head: true }).eq('conversa_id', conversaId);
            await gravarMensagem(empresa, instancia, { ...d, key: d.key ?? { remoteJid: jid, id: d.id, fromMe: d.fromMe } }, { baixar: false });
            const depois = await admin.from('whatsapp_mensagens').select('id', { count: 'exact', head: true }).eq('conversa_id', conversaId);
            if ((depois.count ?? 0) > (antes.count ?? 0)) mensagens++;
          }
        } catch { /* segue para a próxima conversa */ }
      }
      return json({ success: true, conversas, mensagens });
    }

    if (b.acao === 'midia') {
      const { data: msg } = await admin.from('whatsapp_mensagens').select('id, conversa_id, message_id, tipo, midia_mime, midia_nome, de_mim').eq('id', b.mensagem_id).eq('company_id', empresa).maybeSingle();
      if (!msg) return json({ error: 'Mensagem não encontrada.' }, 404);
      const { data: conv } = await admin.from('whatsapp_conversas').select('jid').eq('id', msg.conversa_id).single();
      const m = await baixarMidia(empresa, instancia, msg.conversa_id, msg.message_id, msg.tipo, msg.midia_mime, msg.midia_nome, { remoteJid: conv?.jid, id: msg.message_id, fromMe: msg.de_mim });
      if (!m) return json({ error: 'O WhatsApp não liberou esta mídia (pode ter expirado).' }, 404);
      await admin.from('whatsapp_mensagens').update(m).eq('id', msg.id);
      return json({ success: true, ...m });
    }

    if (b.acao === 'enviar') {
      const jid = String(b.jid ?? '');
      if (!/^[0-9]{8,20}@(s\.whatsapp\.net|g\.us)$/.test(jid)) return json({ error: 'Conversa inválida.' }, 400);
      const destino = jid.endsWith('@g.us') ? jid : jid.split('@')[0];
      const tipo: string = ['texto', 'arquivo', 'audio'].includes(b.tipo) ? b.tipo : 'texto';
      const texto = String(b.texto ?? '').trim();
      if (texto.length > 4000) return json({ error: 'A mensagem passa de 4000 caracteres.' }, 400);
      const anexo = b.anexo?.base64 ? { base64: semPrefixo(String(b.anexo.base64)), filename: String(b.anexo.filename || 'arquivo').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120), mimetype: String(b.anexo.mimetype || 'application/octet-stream') } : null;
      if (anexo && anexo.base64.length > MAX_BASE64) return json({ error: 'O arquivo passa de 15 MB.' }, 400);

      let rota: string; let corpo: Obj; let tipoMsg = 'texto';
      if (tipo === 'audio' && anexo) {
        rota = 'sendWhatsAppAudio'; corpo = { number: destino, audio: anexo.base64, encoding: true }; tipoMsg = 'audio';
      } else if (tipo === 'arquivo' && anexo) {
        const mt = anexo.mimetype.split(';')[0];
        const midia = mt.startsWith('image/') ? 'image' : mt.startsWith('video/') ? 'video' : 'document';
        rota = 'sendMedia'; corpo = { number: destino, mediatype: midia, mimetype: mt, caption: texto, media: anexo.base64, fileName: anexo.filename };
        tipoMsg = midia === 'image' ? 'imagem' : midia === 'video' ? 'video' : 'documento';
      } else {
        if (!texto) return json({ error: 'Escreva a mensagem.' }, 400);
        rota = 'sendText'; corpo = { number: destino, text: texto };
      }
      const r = await fetch(`${base}/message/${rota}/${inst_enc}`, { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
      const t = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: `Não foi possível enviar: ${JSON.stringify(t?.response?.message ?? t?.message ?? t).slice(0, 250)}` }, 502);
      const messageId: string = t?.key?.id ?? t?.id ?? crypto.randomUUID();
      const conversaId = await garantirConversa(empresa, instancia, jid, null);
      const linha: Obj = { company_id: empresa, conversa_id: conversaId, message_id: messageId, de_mim: true, remetente_nome: 'Você', tipo: tipoMsg, texto: texto || null, status: 'enviada', data: new Date().toISOString() };
      if (anexo) {
        const caminho = `${empresa}/${conversaId}/${messageId.replace(/[^A-Za-z0-9_-]/g, '')}.${extDe(anexo.mimetype, anexo.filename)}`;
        const up = await admin.storage.from(BUCKET).upload(caminho, bytesDe(anexo.base64), { contentType: anexo.mimetype.split(';')[0], upsert: true });
        if (!up.error) Object.assign(linha, { midia_path: caminho, midia_nome: anexo.filename, midia_mime: anexo.mimetype });
      }
      await admin.from('whatsapp_mensagens').upsert(linha, { onConflict: 'company_id,message_id', ignoreDuplicates: true });
      await admin.from('whatsapp_conversas').update({ ultima_mensagem: resumoDe(tipoMsg, texto), ultima_data: linha.data as string }).eq('id', conversaId);
      return json({ success: true, message_id: messageId });
    }

    return json({ error: 'Ação desconhecida.' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
