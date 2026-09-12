import { supabase } from '@/lib/customSupabaseClient';

export const criarUsuario = async (email, senha, nome, company_id, role) => {
  try {
    const functionName = senha ? 'create-user' : 'invite-user';
    const body = { email, nome, company_id, role };
    if (senha) {
      body.password = senha;
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data.user;
  } catch (error) {
    console.error('Erro ao convidar/criar usuário:', error);
    throw error;
  }
};

export const listarUsuarios = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('list-users');
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data.users.map(user => ({
      id: user.id,
      email: user.email,
      nome: user.user_metadata?.nome || 'Sem Nome',
      company_id: user.user_metadata?.company_id || null,
      role: user.user_metadata?.role || 'user',
      banned_until: user.banned_until,
      last_sign_in_at: user.last_sign_in_at
    }));
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    throw error;
  }
};

export const buscarEmpresa = async (company_id) => {
  try {
    if (!company_id) return { nome: 'Sem Empresa' };
    
    const { data, error } = await supabase
      .from('empresas')
      .select('id, razao_social')
      .eq('id', company_id)
      .single();
      
    if (error) throw error;
    return { id: data.id, nome: data.razao_social };
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    throw error;
  }
};

export const buscarTodasEmpresas = async () => {
  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('id, razao_social')
      .order('razao_social');
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }

    return data.map(emp => ({
      id: emp.id,
      nome: emp.razao_social || 'Empresa sem nome'
    }));
  } catch (error) {
    console.error('Erro ao buscar todas empresas:', error);
    return [];
  }
};

export const desativarUsuario = async (user_id) => {
  try {
    const { data, error } = await supabase.functions.invoke('disable-user', {
      body: { user_id }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data;
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    throw error;
  }
};

export const atualizarUsuario = async (user_id, dados) => {
  try {
    const { data, error } = await supabase.functions.invoke('update-user', {
      body: { 
        user_id, 
        nome: dados.nome, 
        company_id: dados.company_id, 
        role: dados.role 
      }
    });
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data.user;
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
};