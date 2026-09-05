import React from 'react';
import { hasPermission } from '@/lib/permissions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * Wrapper component to protect parts of the UI based on permissions.
 * @param {string} permission - The permission code required
 * @param {boolean} fallback - Whether to show an access denied message (true) or just hide (false)
 */
const PermissionGate = ({ permission, children, fallback = false }) => {
  const allowed = hasPermission(permission);

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-700 flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-bold text-sm">Acesso Restrito</p>
          <p className="text-xs">Você não tem permissão para visualizar este conteúdo ({permission}).</p>
        </div>
      </div>
    );
  }

  return null;
};

export default PermissionGate;