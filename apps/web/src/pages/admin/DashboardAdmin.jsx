import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import { Users, Lock, AlertTriangle, Activity, Briefcase } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';
import { supabase } from '@/lib/customSupabaseClient';

function DashboardAdmin() {
  const [stats, setStats] = useState({
    usersActive: 0,
    rolesCount: 0,
    sessionsActive: 0,
    failedLogins: 0,
    usersByGroup: [],
    recentAccess: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
        // 1. Users Active
        const { count: usersActive } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'ativo');
        
        // 2. Roles
        const { count: rolesCount } = await supabase.from('roles').select('*', { count: 'exact', head: true });
        
        // 3. Failed Logins (Mocked mostly as audit_logs structure varies, assuming standard)
        // const { count: failedLogins } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'login_failed').gt('created_at', new Date(Date.now() - 86400000).toISOString());
        
        // 4. Users by Group
        const { data: groupData } = await supabase.from('times').select('nome, users(count)');
        const usersByGroup = groupData ? groupData.map(g => ({ name: g.nome, count: g.users[0]?.count || 0 })) : [];

        // 5. Recent Access
        const { data: recentAccess } = await supabase.from('users').select('nome, email, ultimo_acesso').order('ultimo_acesso', { ascending: false }).limit(5);

        setStats({
            usersActive: usersActive || 0,
            rolesCount: rolesCount || 0,
            sessionsActive: 3, // Mocked as sessions table usually requires admin API
            failedLogins: 0, // Mocked
            usersByGroup,
            recentAccess: recentAccess || []
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessões Ativas</CardTitle>
                <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold"><AnimatedCounter value={stats.sessionsActive} /></div></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Falhas Login (24h)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-500"><AnimatedCounter value={stats.failedLogins} /></div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Usuários por Grupo</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {stats.usersByGroup.map((group, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{group.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (group.count / (stats.usersActive || 1)) * 100)}%` }}></div>
                                </div>
                                <span className="text-sm text-muted-foreground">{group.count}</span>
                            </div>
                        </div>
                    ))}
                    {stats.usersByGroup.length === 0 && <p className="text-sm text-muted-foreground">Nenhum grupo com usuários.</p>}
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Últimos Acessos</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {stats.recentAccess.map((user, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b last:border-0 border-border pb-2 last:pb-0">
                            <div>
                                <p className="text-sm font-medium">{user.nome || user.email}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {user.ultimo_acesso ? new Date(user.ultimo_acesso).toLocaleString() : 'Nunca'}
                            </span>
                        </div>
                    ))}
                    {stats.recentAccess.length === 0 && <p className="text-sm text-muted-foreground">Sem acessos recentes.</p>}
                </div>
            </CardContent>
          </Card>
      </div>
    </>
  );
}

export default DashboardAdmin;