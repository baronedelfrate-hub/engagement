import { supabase } from '@/lib/customSupabaseClient';

export const resolveCompanyId = async (user) => {
  console.log("🔍 [resolveCompanyId] Iniciando rastreio do company_id...");
  
  // 1. Tentar obter do localStorage
  const localCompanyId = localStorage.getItem('company_id');
  if (localCompanyId && localCompanyId !== 'null' && localCompanyId !== 'undefined' && localCompanyId.trim() !== '') {
    console.log("✅ [resolveCompanyId] Encontrado no localStorage:", localCompanyId);
    return localCompanyId;
  }

  // 2. Tentar obter do usuário autenticado (metadados)
  if (user?.user_metadata?.company_id) {
    console.log("✅ [resolveCompanyId] Encontrado no user_metadata:", user.user_metadata.company_id);
    localStorage.setItem('company_id', user.user_metadata.company_id);
    return user.user_metadata.company_id;
  }

  // 3. Buscar diretamente na tabela profiles (fonte usada pelas políticas de RLS)
  try {
    const currentUser = user || (await supabase.auth.getUser()).data?.user;
    if (currentUser?.id) {
      console.log("⚠️ [resolveCompanyId] Não encontrado em cache/metadata. Consultando tabela 'profiles'...");
      const { data, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("❌ [resolveCompanyId] Erro ao consultar tabela profiles:", error);
      }

      if (data?.company_id) {
        console.log("✅ [resolveCompanyId] Encontrado na tabela 'profiles':", data.company_id);
        localStorage.setItem('company_id', data.company_id);
        return data.company_id;
      }
    }
  } catch (err) {
    console.error("❌ [resolveCompanyId] Falha ao consultar profiles:", err);
  }

  // 4. Último recurso: Buscar a primeira empresa disponível na tabela empresas
  try {
    console.log("⚠️ [resolveCompanyId] Buscando primeira empresa na tabela 'empresas' como último recurso...");
    const { data, error } = await supabase.from('empresas').select('id').limit(1).single();
    
    if (error && error.code !== 'PGRST116') {
        console.error("❌ [resolveCompanyId] Erro ao consultar tabela empresas:", error);
    }
    
    if (data?.id) {
       console.log("✅ [resolveCompanyId] Fallback aplicado. Empresa encontrada:", data.id);
       localStorage.setItem('company_id', data.id);
       return data.id;
    }
  } catch (err) {
     console.error("❌ [resolveCompanyId] Falha crítica no fallback:", err);
  }

  console.warn("⚠️ [resolveCompanyId] Nenhum company_id válido foi resolvido. Retornando null.");
  return null;
};

/**
 * Insere um ou mais registros em uma tabela, incluindo automaticamente o
 * company_id do usuário logado (a menos que já venha informado no registro).
 * Se a tabela não tiver a coluna company_id, tenta novamente sem ela.
 *
 * Uso: substitui `supabase.from('tabela').insert(payload)` por
 *      `insertWithCompanyId('tabela', payload)`
 * Retorna o mesmo formato { data, error } do Supabase, e aceita encadear
 * `.select()` posteriormente através do parâmetro `chain`.
 */
export const insertWithCompanyId = async (tableName, payload, { user = null, chain } = {}) => {
  const rows = Array.isArray(payload) ? payload : [payload];

  const explicitCompanyId = rows[0]?.company_id;
  const companyId = explicitCompanyId !== undefined
    ? explicitCompanyId
    : await resolveCompanyId(user);

  const buildRows = (includeCompanyId) => rows.map((row) => {
    if (includeCompanyId && companyId && row.company_id === undefined) {
      return { ...row, company_id: companyId };
    }
    return row;
  });

  const runInsert = async (includeCompanyId) => {
    const finalPayload = Array.isArray(payload) ? buildRows(includeCompanyId) : buildRows(includeCompanyId)[0];
    let query = supabase.from(tableName).insert(finalPayload);
    if (typeof chain === 'function') query = chain(query);
    return query;
  };

  let result = await runInsert(true);

  if (result.error && result.error.code === '42703') {
    console.warn(`⚠️ [${tableName}] Tabela não possui coluna 'company_id'. Tentando novamente sem ela...`);
    result = await runInsert(false);
  }

  return result;
};

/**
 * Mesma lógica de insertWithCompanyId, mas para upsert (usado em telas que
 * criam ou atualizam o mesmo registro com uma única chamada).
 */
export const upsertWithCompanyId = async (tableName, payload, { user = null, chain, upsertOptions } = {}) => {
  const explicitCompanyId = payload?.company_id;
  const companyId = explicitCompanyId !== undefined
    ? explicitCompanyId
    : await resolveCompanyId(user);

  const buildRow = (includeCompanyId) => {
    if (includeCompanyId && companyId && payload.company_id === undefined) {
      return { ...payload, company_id: companyId };
    }
    return payload;
  };

  const runUpsert = async (includeCompanyId) => {
    let query = supabase.from(tableName).upsert(buildRow(includeCompanyId), upsertOptions);
    if (typeof chain === 'function') query = chain(query);
    return query;
  };

  let result = await runUpsert(true);

  if (result.error && result.error.code === '42703') {
    console.warn(`⚠️ [${tableName}] Tabela não possui coluna 'company_id'. Tentando novamente sem ela...`);
    result = await runUpsert(false);
  }

  return result;
};