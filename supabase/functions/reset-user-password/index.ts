import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Redefine a senha de um usuário (senha nova informada pelo administrador) ou envia o link de recuperação por e-mail.
// Quem pode: superadmin (qualquer usuário) ou admin (apenas usuários da própria empresa, nunca um superadmin).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);
    const { data: { user: caller } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) return json({ error: 'Não autenticado.' }, 401);

    const { data: callerProfile } = await admin.from('profiles').select('role, company_id').eq('id', caller.id).single();
    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role)) {
      return json({ error: 'Apenas administradores podem redefinir senhas.' }, 403);
    }

    const { user_id, password, send_recovery, redirect_to } = await req.json();
    if (!user_id) return json({ error: 'user_id é obrigatório.' }, 400);
    if (!password && !send_recovery) return json({ error: 'Informe a nova senha ou peça o envio do link.' }, 400);

    const { data: alvo } = await admin.from('profiles').select('role, company_id').eq('id', user_id).single();
    if (!alvo) return json({ error: 'Usuário não encontrado.' }, 404);
    if (callerProfile.role !== 'superadmin') {
      if (alvo.role === 'superadmin' || alvo.company_id !== callerProfile.company_id) {
        return json({ error: 'Você não tem permissão para redefinir a senha deste usuário.' }, 403);
      }
    }

    if (password) {
      if (String(password).length < 8) return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return json({ success: true, acao: 'senha_definida' });
    }

    const { data: alvoAuth, error: erroAlvo } = await admin.auth.admin.getUserById(user_id);
    if (erroAlvo || !alvoAuth?.user?.email) throw new Error('Não foi possível localizar o e-mail do usuário.');
    const destino = typeof redirect_to === 'string' && /^https:\/\/[a-z0-9.-]+(\/.*)?$/i.test(redirect_to) ? redirect_to : undefined;
    const { error } = await admin.auth.resetPasswordForEmail(alvoAuth.user.email, destino ? { redirectTo: destino } : undefined);
    if (error) throw error;
    return json({ success: true, acao: 'link_enviado', email: alvoAuth.user.email });
  } catch (err) {
    return json({ error: (err as Error).message }, 400);
  }
});
