import { storage } from '@/lib/storage';

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

// Mock current user ID (In a real app, this comes from Auth Context)
const CURRENT_USER_ID = 'ADM001'; 

/**
 * Checks if the current user has a specific permission
 * @param {string} permissionCode - The permission code to check
 * @returns {boolean}
 */
export const hasPermission = (permissionCode) => {
  // 1. Get Current User
  const users = storage.get('USUARIOS') || [];
  const user = users.find(u => u.codigo === CURRENT_USER_ID || u.id === CURRENT_USER_ID);
  
  if (!user) return true; // Default to true for dev/demo if no user system active
  if (!user.ativo) return false; 

  // 2. Get User Roles
  const userRoles = storage.get('USER_ROLES')?.filter(ur => ur.user_id === user.id) || [];
  // If no roles defined in mock, assume admin for demo
  if (userRoles.length === 0) return true; 

  // 3. Get Permissions
  const rolePermissions = storage.get('ROLE_PERMISSIONS') || [];
  const permissions = storage.get('PERMISSOES') || [];

  // 4. Check
  const hasAccess = userRoles.some(ur => {
    const rp = rolePermissions.filter(p => p.role_id === ur.role_id);
    return rp.some(p => {
      const permDef = permissions.find(def => def.id === p.permission_id);
      return permDef && (permDef.codigo === 'admin.full_access' || permDef.codigo === permissionCode);
    });
  });

  return hasAccess;
};

export const logAudit = (action, entity, entityId, details = {}) => {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    usuario_id: CURRENT_USER_ID,
    acao: action,
    tabela_afetada: entity,
    registro_id: entityId,
    dados_antes: details.before ? JSON.stringify(details.before) : null,
    dados_depois: details.after ? JSON.stringify(details.after) : null,
    data_hora: new Date().toISOString(),
    ip: '127.0.0.1',
    details: details.message || ''
  };

  const logs = storage.get('LOGS_AUDITORIA') || [];
  storage.set('LOGS_AUDITORIA', [logEntry, ...logs]);
};

// Alias for backward compatibility
export const logF5Audit = logAudit;