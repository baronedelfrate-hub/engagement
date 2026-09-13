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
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado.' }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Apenas administradores podem desativar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('user_id é obrigatório.');
    }

    if (callerProfile.role !== 'superadmin') {
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
      const targetCompanyId = targetUser?.user?.user_metadata?.company_id;
      if (targetCompanyId !== callerProfile.company_id) {
        return new Response(JSON.stringify({ success: false, error: 'Você não tem permissão para desativar este usuário.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      ban_duration: '876000h' // Effectively bans for 100 years
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});