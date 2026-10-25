import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Envia e-mail pelo Resend em nome de um usuário logado (administrador ou usuário comum de empresa; cliente somente leitura não envia).
// Segredos necessários (Supabase > Edge Functions > Secrets): RESEND_API_KEY. Opcional: RESEND_FROM_EMAIL (padrão notificacoes@engagementsolucoes.com.br).
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const TIPOS = ['proposta', 'cobranca', 'aviso_faturamento', 'portal', 'pedido_compra', 'relatorio_pagar', 'relatorio_mensal', 'outro'];
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const LARANJA = '#FE6102';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

type Destaque = { rotulo: string; valor: string };

// Layout padrão (cabeçalho com a marca, mensagem, quadro de destaques, botão opcional e rodapé).
const layout = (o: { remetente: string; mensagem: string; destaques?: Destaque[]; botao?: { texto: string; url: string } }) => {
  const paragrafos = esc(o.mensagem).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p.replace(/\n/g, '<br>')}</p>`).join('');
  const quadro = o.destaques?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:6px 0 18px;background:#f6f7f9;border-radius:8px">${o.destaques.map((d) => `<tr><td style="padding:8px 14px;color:#667085;font-size:13px;width:38%">${esc(d.rotulo)}</td><td style="padding:8px 14px;font-weight:600;font-size:14px">${esc(d.valor)}</td></tr>`).join('')}</table>`
    : '';
  const botao = o.botao && /^https:\/\//.test(o.botao.url)
    ? `<p style="margin:18px 0"><a href="${esc(o.botao.url)}" style="background:${LARANJA};color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;display:inline-block">${esc(o.botao.texto)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#eef0f3;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" style="width:100%"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" style="width:100%;max-width:600px;background:#fff;border-radius:10px;overflow:hidden">
<tr><td style="background:#0f172a;padding:18px 24px;color:#fff;font-size:17px;font-weight:700">${esc(o.remetente)}<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${LARANJA};margin-left:8px"></span></td></tr>
<tr><td style="padding:24px;font-size:15px">${paragrafos}${quadro}${botao}</td></tr>
<tr><td style="padding:14px 24px;background:#f6f7f9;color:#98a2b3;font-size:12px">Mensagem enviada por ${esc(o.remetente)}. Se você não esperava este e-mail, pode ignorá-lo.</td></tr>
</table></td></tr></table></body></html>`;
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

    const { data: perfil } = await admin.from('profiles').select('role, company_id, nome').eq('id', caller.id).single();
    if (!perfil || !['admin', 'user', 'superadmin'].includes(perfil.role)) return json({ error: 'Seu perfil não pode enviar e-mails.' }, 403);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return json({ error: 'O envio de e-mail ainda não foi configurado (falta a chave RESEND_API_KEY nos segredos do Supabase).' }, 500);

    const b = await req.json();
    const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'outro';
    const para: string[] = (Array.isArray(b.para) ? b.para : []).map((x: string) => String(x).trim()).filter(Boolean);
    const cc: string[] = (Array.isArray(b.cc) ? b.cc : []).map((x: string) => String(x).trim()).filter(Boolean);
    if (!para.length) return json({ error: 'Informe pelo menos um destinatário.' }, 400);
    if (para.length + cc.length > 10) return json({ error: 'No máximo 10 destinatários por envio.' }, 400);
    const invalido = [...para, ...cc].find((e) => !EMAIL.test(e));
    if (invalido) return json({ error: `E-mail inválido: ${invalido}` }, 400);
    const assunto = String(b.assunto ?? '').trim().slice(0, 200);
    if (!assunto) return json({ error: 'Informe o assunto.' }, 400);
    const mensagem = String(b.mensagem ?? '').trim();
    if (!mensagem && !b.html) return json({ error: 'Escreva a mensagem.' }, 400);

    const anexos: { filename: string; content: string }[] = (Array.isArray(b.anexos) ? b.anexos : [])
      .filter((a: { filename?: string; base64?: string }) => a?.filename && a?.base64)
      .map((a: { filename: string; base64: string }) => ({ filename: String(a.filename).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120), content: a.base64 }));
    const tamanho = anexos.reduce((s, a) => s + a.content.length * 0.75, 0);
    if (tamanho > 18 * 1024 * 1024) return json({ error: 'Os anexos passam de 18 MB.' }, 400);

    let nomeEmpresa = 'Engagement Soluções';
    if (perfil.company_id) {
      const { data: emp } = await admin.from('empresas').select('nome_fantasia, razao_social').eq('id', perfil.company_id).single();
      nomeEmpresa = emp?.nome_fantasia || emp?.razao_social || nomeEmpresa;
    }
    const enderecoDe = Deno.env.get('RESEND_FROM_EMAIL') || 'notificacoes@engagementsolucoes.com.br';
    const nomeDe = nomeEmpresa.replace(/[<>"]/g, '').slice(0, 60);
    const html = typeof b.html === 'string' && b.html ? b.html : layout({ remetente: nomeEmpresa, mensagem, destaques: Array.isArray(b.destaques) ? b.destaques : [], botao: b.botao });

    log = {
      company_id: perfil.company_id ?? null, user_id: caller.id, tipo, destinatarios: [...para, ...cc], assunto,
      anexos: anexos.map((a) => a.filename), ref_tipo: b.ref_tipo ?? null, ref_id: b.ref_id ?? null
    };

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${nomeDe} <${enderecoDe}>`,
        to: para,
        ...(cc.length ? { cc } : {}),
        ...(caller.email ? { reply_to: caller.email } : {}),
        subject: assunto,
        html,
        text: mensagem || undefined,
        ...(anexos.length ? { attachments: anexos } : {})
      })
    });
    const retorno = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const motivo = retorno?.message || retorno?.error || `Resend respondeu ${resp.status}`;
      await admin.from('email_envios').insert({ ...log, status: 'erro', erro: String(motivo).slice(0, 500) });
      return json({ error: `Não foi possível enviar: ${motivo}` }, 502);
    }
    await admin.from('email_envios').insert({ ...log, status: 'enviado', resend_id: retorno.id ?? null });
    return json({ success: true, id: retorno.id ?? null });
  } catch (err) {
    if (log) await admin.from('email_envios').insert({ ...log, status: 'erro', erro: String((err as Error).message).slice(0, 500) });
    return json({ error: (err as Error).message }, 400);
  }
});
