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
      return new Response(JSON.stringify({ users: null, error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ users: null, error: 'Não autenticado.' }), {
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
      return new Response(JSON.stringify({ users: null, error: 'Apenas administradores podem listar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    // Admin (não-superadmin) só vê usuários da própria empresa.
    const users = callerProfile.role === 'superadmin'
      ? data.users
      : data.users.filter((u) => u.user_metadata?.company_id === callerProfile.company_id);

    return new Response(
      JSON.stringify({ users, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ users: null, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});