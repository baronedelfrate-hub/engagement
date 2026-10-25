import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Envia WhatsApp pela Evolution API (v2) em nome de um usuário logado (administrador ou usuário comum; cliente somente leitura não envia).
// Segredos (Supabase > Edge Functions > Secrets): EVOLUTION_API_URL (ex.: https://evolution.seudominio.com.br), EVOLUTION_API_KEY, EVOLUTION_INSTANCE.
// Opcional: EVOLUTION_API_VERSION ("1" para a API antiga; padrão "2").
// Ações: { acao: "status" } consulta se a instância está conectada; o resto envia texto ou documento (anexo base64).
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const TIPOS = ['proposta', 'cobranca', 'aviso_faturamento', 'portal', 'pedido_compra', 'relatorio_pagar', 'relatorio_mensal', 'outro'];

// Aceita (19) 99999-9999, 19999999999, +55 19 99999-9999... e devolve só dígitos com 55 na frente.
const normalizarNumero = (bruto: string) => {
  let n = String(bruto || '').replace(/\D/g, '').replace(/^0+/, '');
  if (n.length === 10 || n.length === 11) n = `55${n}`;
  if (!/^55\d{10,11}$/.test(n)) return null;
  return n;
};

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
    const instancia = Deno.env.get('EVOLUTION_INSTANCE');
    if (!base || !chave || !instancia) return json({ error: 'O WhatsApp ainda não foi configurado (faltam EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE nos segredos do Supabase).' }, 500);
    const v1 = Deno.env.get('EVOLUTION_API_VERSION') === '1';
    const cab = { apikey: chave, 'Content-Type': 'application/json' };

    const b = await req.json();

    if (b.acao === 'status') {
      const r = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instancia)}`, { headers: cab });
      const t = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: t?.response?.message?.[0] || t?.message || `A Evolution API respondeu ${r.status}` }, 502);
      const estado = t?.instance?.state ?? t?.state ?? 'desconhecido';
      return json({ success: true, estado, conectado: estado === 'open' });
    }

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
      const bruto = retorno?.response?.message ?? retorno?.message ?? retorno?.error;
      const motivo = Array.isArray(bruto) ? JSON.stringify(bruto[0]) : String(bruto ?? `A Evolution API respondeu ${resp.status}`);
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
