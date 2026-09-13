import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
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
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, nome, role, password, company_id: requestedCompanyId } = await req.json();
    // Admin (não-superadmin) só pode criar usuário na própria empresa, mesmo que envie outro company_id.
    const company_id = callerProfile.role === 'superadmin' ? requestedCompanyId : callerProfile.company_id;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password || undefined,
      user_metadata: {
        nome: nome,
        company_id: company_id,
        role: role
      }
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ user: data.user, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});