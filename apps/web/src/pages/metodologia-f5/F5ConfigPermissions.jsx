import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { storage } from '@/lib/storage';
import { F5_PERMISSIONS, logF5Audit } from '@/lib/permissions';
import { useToast } from '@/components/ui/use-toast';
import PermissionGate from '@/components/PermissionGate';
import { Shield } from 'lucide-react';

function F5ConfigPermissions() {
    const { toast } = useToast();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);

    useEffect(() => {
        setRoles(storage.get('ROLES'));
        setPermissions(storage.get('PERMISSOES'));
        setRolePermissions(storage.get('ROLE_PERMISSIONS'));
    }, []);

    const f5PermissionsList = Object.values(F5_PERMISSIONS);

    const handlePermissionToggle = (roleId, permCode) => {
        // Find permission ID from code
        const permDef = permissions.find(p => p.codigo === permCode);
        if (!permDef) return;

        const existingEntry = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permDef.id);

        let updatedRolePerms;
        if (existingEntry) {
            // Remove
            updatedRolePerms = rolePermissions.filter(rp => rp.id !== existingEntry.id);
        } else {
            // Add
            const newEntry = {
                id: `rp_${Date.now()}_${Math.random()}`,
                role_id: roleId,
                permission_id: permDef.id,
                tipo: 'Allow'
            };
            updatedRolePerms = [...rolePermissions, newEntry];
        }

        setRolePermissions(updatedRolePerms);
        storage.set('ROLE_PERMISSIONS', updatedRolePerms);
        
        logF5Audit('UPDATE', 'PERMISSIONS', roleId, { 
            message: `Toggled permission ${permCode} for role ${roleId}` 
        });
        
        toast({ title: "Permissões Atualizadas" });
    };

    const isChecked = (roleId, permCode) => {
        const permDef = permissions.find(p => p.codigo === permCode);
        if (!permDef) return false;
        return rolePermissions.some(rp => rp.role_id === roleId && rp.permission_id === permDef.id);
    };

    return (
        <>
            <Helmet><title>Configurar Permissões F5</title></Helmet>
            <PageHeader title="Permissões de Acesso F5" description="Gerencie quem pode ver, editar e gerenciar a metodologia." />

            <PermissionGate permission="admin.full_access" fallback>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-blue-500"/> Matriz de Permissões por Função (Role)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-3 border-b text-left bg-slate-50">Permissão</th>
                                        {roles.map(role => (
                                            <th key={role.id} className="p-3 border-b text-center bg-slate-50 w-32">{role.nome}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {f5PermissionsList.map(permCode => (
                                        <tr key={permCode} className="hover:bg-slate-50">
                                            <td className="p-3 border-b font-medium text-slate-700">
                                                {permCode}
                                                <p className="text-xs text-slate-400 font-normal">
                                                    {permCode === 'f5.view' ? 'Acesso de leitura aos projetos' : 
                                                     permCode === 'f5.edit' ? 'Editar dados e status' :
                                                     permCode === 'f5.upload' ? 'Enviar documentos' :
                                                     permCode === 'f5.kpi.manage' ? 'Configurar KPIs' :
                                                     'Gerar relatórios e auditoria'}
                                                </p>
                                            </td>
                                            {roles.map(role => (
                                                <td key={`${role.id}-${permCode}`} className="p-3 border-b text-center">
                                                    <Checkbox 
                                                        checked={isChecked(role.id, permCode)}
                                                        onCheckedChange={() => handlePermissionToggle(role.id, permCode)}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </PermissionGate>
        </>
    );
}

export default F5ConfigPermissions;