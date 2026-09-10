import { supabase } from '@/lib/customSupabaseClient';

// F5 Methodology Permissions
export const F5_PERMISSIONS = {
  VIEW: 'f5.view',
  EDIT: 'f5.edit',
  UPLOAD: 'f5.upload',
  KPI_MANAGE: 'f5.kpi.manage',
  REPORT_GENERATE: 'f5.report.generate',
  AUDIT_VIEW: 'f5.audit.view'
};

// Finance Module Permissions
export const FINANCE_PERMISSIONS = {
  BANK_IMPORT: 'bank.import',
  BANK_CONCILIATE: 'bank.conciliate',
  ADJUST_CREATE: 'finance.adjust',
  ADJUST_APPROVE: 'finance.approve_adjustment',
  AP_REVERSE: 'accounts.ap.reverse',
  CASHFLOW_VIEW: 'reports.cashflow.view',
  REGISTER_PAYMENT: 'accounts.ap.register_payment',
  REGISTER_RECEIPT: 'accounts.ar.register_receipt',
  REVERSE_ENTRY: 'accounts.ap.reverse'
};

// Fiscal Module Permissions
export const FISCAL_PERMISSIONS = {
  MODULE: 'gestao.fiscal',
  DASHBOARD: 'gestao.fiscal.dashboard',
  NFE: 'gestao.fiscal.nfe',
  NFSE: 'gestao.fiscal.nfse',
  MANIFESTACAO: 'gestao.fiscal.manifestacao',
  ENTRADAS: 'gestao.fiscal.entradas',
  IMPOSTOS: 'gestao.fiscal.impostos',
  PARAMETROS: 'gestao.fiscal.parametros'
};

/**
 * Checks if the currently logged-in user has a specific permission.
 *
 * Fail-open by design: se não houver usuário logado, se o usuário for
 * superadmin, ou se ele não tiver nenhuma role/permissão configurada nas
 * tabelas role_permissions/user_roles (hoje vazias para todo mundo),
 * o acesso é liberado — mesmo comportamento "default aberto" que o
 * código antigo já tinha (rodando sobre dados mock que nunca batiam com
 * usuário real). Isso evita trancar usuários reais fora do módulo F5
 * antes de alguém popular a matriz de permissões em F5ConfigPermissions.
 *
 * @param {string} permissionCode - The permission code to check
 * @returns {Promise<boolean>}
 */
export const hasPermission = async (permissionCode) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role === 'superadmin') return true;

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', user.id);
    if (!userRoles || userRoles.length === 0) return true;

    const roleIds = userRoles.map((ur) => ur.role_id);
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permissions(codigo)')
      .in('role_id', roleIds);

    return (rolePerms || []).some((rp) => {
      const codigo = rp.permissions?.codigo;
      return codigo === 'admin.full_access' || codigo === permissionCode;
    });
  } catch (error) {
    console.error('[hasPermission] Erro ao verificar permissão, liberando por padrão:', error);
    return true;
  }
};

export const logAudit = async (action, entity, entityId, details = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      acao: action,
      tabela: entity,
      registro_id: entityId || null,
      valores_antigos: details.before || null,
      valores_novos: details.after || (details.message ? { message: details.message } : null),
    });
  } catch (error) {
    console.error('[logAudit] Falha ao registrar log de auditoria:', error);
  }
};

// Alias for backward compatibility
export const logF5Audit = logAudit;
