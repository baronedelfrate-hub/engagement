import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || !['admin', 'superadmin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ success: false, error: 'Apenas administradores podem convidar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, nome, role, company_id: requestedCompanyId } = await req.json();
    // Admin (não-superadmin) só pode convidar para a própria empresa, mesmo que envie outro company_id.
    const company_id = callerProfile.role === 'superadmin' ? requestedCompanyId : callerProfile.company_id;

    if (!email) {
      throw new Error('O e-mail é obrigatório para enviar o convite.');
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { nome, company_id, role }
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})