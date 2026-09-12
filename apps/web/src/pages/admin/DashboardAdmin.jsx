import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import { Users, Lock } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';
import { supabase } from '@/lib/customSupabaseClient';
import { listarUsuarios } from '@/services/admin/usuariosService';

function DashboardAdmin() {
  const [stats, setStats] = useState({
    usersActive: 0,
    rolesCount: 0,
    recentAccess: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [usuarios, { count: rolesCount }] = await Promise.all([
        listarUsuarios(),
        supabase.from('roles').select('*', { count: 'exact', head: true })
      ]);

      const usersActive = usuarios.filter(u => !u.banned_until).length;
      const recentAccess = [...usuarios]
        .filter(u => u.last_sign_in_at)
        .sort((a, b) => new Date(b.last_sign_in_at) - new Date(a.last_sign_in_at))
        .slice(0, 5);

      setStats({
        usersActive,
        rolesCount: rolesCount || 0,
        recentAccess
      });
    } catch (error) {
      console.error("Dashboard data fetch error", error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard Admin - ERP Platform</title>
      </Helmet>

      <PageHeader title="Administração" description="Visão geral de segurança e usuários" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold"><AnimatedCounter value={stats.usersActive} /></div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Roles Definidas</CardTitle>
                <Lock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold"><AnimatedCounter value={stats.rolesCount} /></div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Últimos Acessos</CardTitle></CardHeader>
        <CardContent>
            <div className="space-y-4">
                {stats.recentAccess.map((user) => (
                    <div key={user.id} className="flex items-center justify-between border-b last:border-0 border-border pb-2 last:pb-0">
                        <div>
                            <p className="text-sm font-medium">{user.nome || user.email}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {new Date(user.last_sign_in_at).toLocaleString('pt-BR')}
                        </span>
                    </div>
                ))}
                {stats.recentAccess.length === 0 && <p className="text-sm text-muted-foreground">Sem acessos recentes.</p>}
            </div>
        </CardContent>
      </Card>
    </>
  );
}

export default DashboardAdmin;
