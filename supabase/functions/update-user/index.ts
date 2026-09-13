import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ user: null, error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ user: null, error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ user: null, error: 'Apenas administradores podem editar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, nome, company_id: requestedCompanyId, role } = await req.json();

    if (!user_id) {
      throw new Error('user_id é obrigatório.');
    }

    if (callerProfile.role !== 'superadmin') {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
      const targetCompanyId = targetUser?.user?.user_metadata?.company_id;
      if (targetCompanyId !== callerProfile.company_id) {
        return new Response(JSON.stringify({ user: null, error: 'Você não tem permissão para editar este usuário.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // Admin (não-superadmin) não pode mover o usuário para outra empresa nem promover ninguém a superadmin.
    const company_id = callerProfile.role === 'superadmin' ? requestedCompanyId : callerProfile.company_id;
    const finalRole = callerProfile.role === 'superadmin' ? role : (role === 'superadmin' ? 'admin' : role);

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      user_metadata: {
        nome,
        company_id,
        role: finalRole
      }
    });

    if (error) throw error;

    // auth.users so tem trigger de sincronizacao com profiles no INSERT (handle_new_user).
    // Sem isso aqui, editar um usuario pela UI mudava so a metadata exibida, nunca o profiles.role
    // que o RLS e o AuthContext realmente leem -- o usuario editado continuava com o acesso antigo.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ nome, company_id, role: finalRole })
      .eq('id', user_id);

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ user: data.user, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ user: null, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});