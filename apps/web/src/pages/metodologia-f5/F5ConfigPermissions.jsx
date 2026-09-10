import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { F5_PERMISSIONS, logF5Audit } from '@/lib/permissions';
import { useToast } from '@/components/ui/use-toast';
import PermissionGate from '@/components/PermissionGate';
import { Shield } from 'lucide-react';

function F5ConfigPermissions() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
                supabase.from('roles').select('*').order('nome', { ascending: true }),
                supabase.from('permissions').select('*'),
                supabase.from('role_permissions').select('*'),
            ]);
            if (rolesRes.error) throw rolesRes.error;
            if (permsRes.error) throw permsRes.error;
            if (rolePermsRes.error) throw rolePermsRes.error;
            setRoles(rolesRes.data || []);
            setPermissions(permsRes.data || []);
            setRolePermissions(rolePermsRes.data || []);
        } catch (error) {
            console.error('Error loading permissions data:', error);
            toast({ title: 'Erro', description: 'Não foi possível carregar as permissões.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const f5PermissionsList = Object.values(F5_PERMISSIONS);

    const ensurePermissionDef = async (permCode) => {
        const existing = permissions.find(p => p.codigo === permCode);
        if (existing) return existing;

        const { data, error } = await supabase
            .from('permissions')
            .insert({ codigo: permCode, modulo: 'F5' })
            .select()
            .single();
        if (error) throw error;
        setPermissions(prev => [...prev, data]);
        return data;
    };

    const handlePermissionToggle = async (roleId, permCode) => {
        try {
            const permDef = await ensurePermissionDef(permCode);

            const existingEntry = rolePermissions.find(rp => rp.role_id === roleId && rp.permission_id === permDef.id);

            if (existingEntry) {
                const { error } = await supabase.from('role_permissions').delete().eq('id', existingEntry.id);
                if (error) throw error;
                setRolePermissions(prev => prev.filter(rp => rp.id !== existingEntry.id));
            } else {
                const { data, error } = await supabase
                    .from('role_permissions')
                    .insert({ role_id: roleId, permission_id: permDef.id })
                    .select()
                    .single();
                if (error) throw error;
                setRolePermissions(prev => [...prev, data]);
            }

            logF5Audit('UPDATE', 'PERMISSIONS', roleId, {
                message: `Toggled permission ${permCode} for role ${roleId}`
            });

            toast({ title: "Permissões Atualizadas" });
        } catch (error) {
            console.error('Error toggling permission:', error);
            toast({ title: 'Erro', description: error.message || 'Não foi possível atualizar a permissão.', variant: 'destructive' });
        }
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
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : roles.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma função (role) cadastrada ainda. Cadastre roles em Admin &gt; Funções.</p>
                        ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-3 border-b text-left bg-muted">Permissão</th>
                                        {roles.map(role => (
                                            <th key={role.id} className="p-3 border-b text-center bg-muted w-32">{role.nome}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {f5PermissionsList.map(permCode => (
                                        <tr key={permCode} className="hover:bg-muted">
                                            <td className="p-3 border-b font-medium text-foreground">
                                                {permCode}
                                                <p className="text-xs text-muted-foreground font-normal">
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
                        )}
                    </CardContent>
                </Card>
            </PermissionGate>
        </>
    );
}

export default F5ConfigPermissions;
