import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Envia WhatsApp pela Evolution API (v2), com UMA instância por empresa (tabela whatsapp_instancias).
// Segredos (Supabase > Edge Functions > Secrets): EVOLUTION_API_URL (ex.: https://evolution.seudominio.com.br) e EVOLUTION_API_KEY (chave global).
// Opcionais: EVOLUTION_INSTANCE (instância usada por superadmin sem empresa) e EVOLUTION_API_VERSION ("1" para a API antiga; padrão "2").
// Ações de gestão (corpo { acao }): status (qualquer perfil que envia), criar | qrcode | desconectar | remover (admin da empresa ou superadmin; o superadmin pode informar empresa_id).
// Sem acao: envia texto ou documento (anexo base64) pela instância da empresa de quem está logado.
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const TIPOS = ['proposta', 'cobranca', 'aviso_faturamento', 'portal', 'pedido_compra', 'relatorio_pagar', 'relatorio_mensal', 'outro'];
const GESTAO = ['status', 'criar', 'qrcode', 'desconectar', 'remover'];

// Aceita (19) 99999-9999, 19999999999, +55 19 99999-9999... e devolve só dígitos com 55 na frente.
const normalizarNumero = (bruto: string) => {
  let n = String(bruto || '').replace(/\D/g, '').replace(/^0+/, '');
  if (n.length === 10 || n.length === 11) n = `55${n}`;
  if (!/^55\d{10,11}$/.test(n)) return null;
  return n;
};
const slug = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let log: Record<string, unknown> | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);
    const { data: { user: caller } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return json({ error: 'Não autenticado.' }, 401);

    const { data: perfil } = await admin.from('profiles').select('role, company_id').eq('id', caller.id).single();
    if (!perfil || !['admin', 'user', 'superadmin'].includes(perfil.role)) return json({ error: 'Seu perfil não pode enviar mensagens.' }, 403);

    const base = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/+$/, '');
    const chave = Deno.env.get('EVOLUTION_API_KEY');
    if (!base || !chave) return json({ error: 'O WhatsApp ainda não foi configurado (faltam EVOLUTION_API_URL e EVOLUTION_API_KEY nos segredos do Supabase).' }, 500);
    const v1 = Deno.env.get('EVOLUTION_API_VERSION') === '1';
    const cab = { apikey: chave, 'Content-Type': 'application/json' };

    const b = await req.json();
    const acao = GESTAO.includes(b.acao) ? b.acao : null;

    // Empresa da instância: a de quem está logado; o superadmin pode escolher outra.
    const alvo: string | null = perfil.role === 'superadmin' && b.empresa_id ? String(b.empresa_id) : (perfil.company_id ?? null);
    const buscarInstancia = async (): Promise<string | null> => {
      if (alvo) {
        const { data } = await admin.from('whatsapp_instancias').select('instancia').eq('company_id', alvo).maybeSingle();
        return data?.instancia ?? null;
      }
      return perfil.role === 'superadmin' ? (Deno.env.get('EVOLUTION_INSTANCE') || null) : null;
    };
    // deno-lint-ignore no-explicit-any
    const erroDa = (t: Record<string, any>, r: Response) => {
      const bruto = t?.response?.message ?? t?.message ?? t?.error;
      return Array.isArray(bruto) ? JSON.stringify(bruto[0]) : String(bruto ?? `A Evolution API respondeu ${r.status}`);
    };
    const conectar = async (nome: string) => {
      const r = await fetch(`${base}/instance/connect/${encodeURIComponent(nome)}`, { headers: cab });
      const t = await r.json().catch(() => ({}));
      return { r, t };
    };

    if (acao) {
      if (acao !== 'status' && !['admin', 'superadmin'].includes(perfil.role)) return json({ error: 'Somente o administrador da empresa gerencia a conexão do WhatsApp.' }, 403);
      let instancia = await buscarInstancia();

      if (acao === 'status') {
        if (!instancia) return json({ success: true, estado: 'sem_instancia', conectado: false, instancia: null });
        const r = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instancia)}`, { headers: cab });
        const t = await r.json().catch(() => ({}));
        if (r.status === 404) return json({ success: true, estado: 'inexistente', conectado: false, instancia });
        if (!r.ok) return json({ error: erroDa(t, r) }, 502);
        const estado = t?.instance?.state ?? t?.state ?? 'desconhecido';
        return json({ success: true, estado, conectado: estado === 'open', instancia });
      }

      if (acao === 'criar') {
        if (!alvo) return json({ error: 'Escolha a empresa para criar a instância.' }, 400);
        if (!instancia) {
          const { data: emp } = await admin.from('empresas').select('nome_fantasia, razao_social').eq('id', alvo).single();
          instancia = `erp-${slug(emp?.nome_fantasia || emp?.razao_social || 'empresa')}-${alvo.replace(/-/g, '').slice(0, 6)}`;
        }
        const r = await fetch(`${base}/instance/create`, { method: 'POST', headers: cab, body: JSON.stringify({ instanceName: instancia, integration: 'WHATSAPP-BAILEYS', qrcode: true }) });
        const t = await r.json().catch(() => ({}));
        let qr = t?.qrcode?.base64 ?? t?.base64 ?? null;
        let pareamento = t?.qrcode?.pairingCode ?? t?.pairingCode ?? null;
        if (!r.ok) {
          const msg = erroDa(t, r);
          if (!/already|in use|exist|j[aá] est[aá]/i.test(msg)) return json({ error: msg }, 502);
          const c = await conectar(instancia); // já existia na Evolution: apenas reaproveita e pede o QR
          qr = c.t?.base64 ?? c.t?.qrcode?.base64 ?? null; pareamento = c.t?.pairingCode ?? null;
        }
        await admin.from('whatsapp_instancias').upsert({ company_id: alvo, instancia, created_by: caller.id }, { onConflict: 'company_id' });
        return json({ success: true, instancia, qr, codigoPareamento: pareamento });
      }

      if (!instancia) return json({ error: 'Esta empresa ainda não tem uma instância. Use "Criar instância".' }, 404);

      if (acao === 'qrcode') {
        const { r, t } = await conectar(instancia);
        if (r.status === 404) return json({ error: `A instância "${instancia}" não existe na Evolution API. Use "Criar instância".` }, 404);
        if (!r.ok) return json({ error: erroDa(t, r) }, 502);
        return json({ success: true, instancia, qr: t?.base64 ?? t?.qrcode?.base64 ?? null, codigoPareamento: t?.pairingCode ?? t?.qrcode?.pairingCode ?? null });
      }

      if (acao === 'desconectar') {
        const r = await fetch(`${base}/instance/logout/${encodeURIComponent(instancia)}`, { method: 'DELETE', headers: cab });
        const t = await r.json().catch(() => ({}));
        if (!r.ok && r.status !== 404) return json({ error: erroDa(t, r) }, 502);
        return json({ success: true });
      }

      // remover: apaga a instância na Evolution e o vínculo da empresa
      await fetch(`${base}/instance/logout/${encodeURIComponent(instancia)}`, { method: 'DELETE', headers: cab }).catch(() => null);
      const r = await fetch(`${base}/instance/delete/${encodeURIComponent(instancia)}`, { method: 'DELETE', headers: cab });
      const t = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 404) return json({ error: erroDa(t, r) }, 502);
      if (alvo) await admin.from('whatsapp_instancias').delete().eq('company_id', alvo);
      return json({ success: true });
    }

    // ---- envio ----
    const instancia = await buscarInstancia();
    if (!instancia) return json({ error: 'Esta empresa ainda não conectou um WhatsApp. Peça ao administrador para conectar em Cadastros > WhatsApp.' }, 400);

    const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'outro';
    const numero = normalizarNumero(b.para);
    if (!numero) return json({ error: 'Telefone inválido. Use DDD + número, por exemplo (19) 99999-9999.' }, 400);
    const mensagem = String(b.mensagem ?? '').trim();
    if (!mensagem) return json({ error: 'Escreva a mensagem.' }, 400);
    if (mensagem.length > 4000) return json({ error: 'A mensagem passa de 4000 caracteres.' }, 400);

    const anexo = b.anexo?.base64 && b.anexo?.filename
      ? { filename: String(b.anexo.filename).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120), base64: String(b.anexo.base64), mimetype: String(b.anexo.mimetype || 'application/pdf') }
      : null;
    if (anexo && anexo.base64.length * 0.75 > 15 * 1024 * 1024) return json({ error: 'O anexo passa de 15 MB.' }, 400);

    log = {
      company_id: perfil.company_id ?? null, user_id: caller.id, tipo, destinatario: numero, mensagem: mensagem.slice(0, 4000),
      anexo: anexo?.filename ?? null, ref_tipo: b.ref_tipo ?? null, ref_id: b.ref_id ?? null
    };

    let url: string; let corpo: Record<string, unknown>;
    if (anexo) {
      url = `${base}/message/sendMedia/${encodeURIComponent(instancia)}`;
      corpo = v1
        ? { number: numero, mediaMessage: { mediatype: 'document', fileName: anexo.filename, caption: mensagem, media: anexo.base64 } }
        : { number: numero, mediatype: 'document', mimetype: anexo.mimetype, caption: mensagem, media: anexo.base64, fileName: anexo.filename };
    } else {
      url = `${base}/message/sendText/${encodeURIComponent(instancia)}`;
      corpo = v1 ? { number: numero, textMessage: { text: mensagem } } : { number: numero, text: mensagem };
    }

    const resp = await fetch(url, { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
    const retorno = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const motivo = erroDa(retorno, resp);
      await admin.from('whatsapp_envios').insert({ ...log, status: 'erro', erro: motivo.slice(0, 500) });
      return json({ error: `Não foi possível enviar: ${motivo}` }, 502);
    }
    await admin.from('whatsapp_envios').insert({ ...log, status: 'enviado', mensagem_id: retorno?.key?.id ?? retorno?.id ?? null });
    return json({ success: true });
  } catch (err) {
    if (log) await admin.from('whatsapp_envios').insert({ ...log, status: 'erro', erro: String((err as Error).message).slice(0, 500) });
    return json({ error: (err as Error).message }, 400);
  }
});
