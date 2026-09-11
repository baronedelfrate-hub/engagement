import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, CalendarCheck, FileCheck, DollarSign, Heart, Briefcase, BookOpen, Activity, TrendingUp, GitFork } from 'lucide-react';
import { calculateExamStatus } from '@/lib/rhUtils';
import PageHeader from '@/components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { formatDateOnly } from '@/lib/dateUtils';

const RHDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalEmployees: 0,
        activeEmployees: 0,
        examsExpiring: 0,
        nrExpiring: 0,
        feriasEsteMes: 0,
        recentHires: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            const now = new Date();
            const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const fimMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

            const { data: employees } = await supabase.from('rh_funcionarios').select('*');
            const { data: exams } = await supabase.from('rh_exames_ocupacionais').select('*');
            const { data: nrs } = await supabase.from('rh_nr_controle').select('*');
            const { count: feriasEsteMes } = await supabase
                .from('rh_ferias')
                .select('id', { count: 'exact', head: true })
                .gte('data_inicio', inicioMes)
                .lte('data_inicio', fimMes);

            const totalEmployees = employees?.length || 0;
            const activeEmployees = employees?.filter(e => e.status === 'Ativo').length || 0;
            
            const examsExpiring = exams?.filter(e => {
                const status = calculateExamStatus(e.proxima_data);
                return status === 'Vencido' || status === 'A Vencer';
            }).length || 0;

            const nrExpiring = nrs?.filter(n => {
                const status = calculateExamStatus(n.data_validade);
                return status === 'Vencido' || status === 'A Vencer';
            }).length || 0;

            const recentHires = employees?.sort((a,b) => new Date(b.data_admissao) - new Date(a.data_admissao)).slice(0, 5) || [];

            setStats({ totalEmployees, activeEmployees, examsExpiring, nrExpiring, feriasEsteMes: feriasEsteMes || 0, recentHires });
        };

        fetchStats();
    }, []);

    const QuickAccessCard = ({ title, icon: Icon, path, color = "text-primary" }) => (
        <Card className="cursor-pointer hover:shadow-md transition-all hover:bg-accent/50" onClick={() => navigate(path)}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                <div className={`p-3 rounded-full bg-background border shadow-sm`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="font-medium text-sm">{title}</h3>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 space-y-6">
            <Helmet><title>Dashboard RH</title></Helmet>
            <PageHeader title="Recursos Humanos" description="Gestão completa de capital humano" />

            {/* Quick Access Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <QuickAccessCard title="Funcionários" icon={Users} path="/rh/funcionarios" color="text-blue-500" />
                <QuickAccessCard title="Folha Pagto" icon={DollarSign} path="/rh/folha-pagamento" color="text-green-500" />
                <QuickAccessCard title="Benefícios" icon={Heart} path="/rh/beneficios" color="text-red-500" />
                <QuickAccessCard title="Medicina" icon={Activity} path="/rh/medicina-ocupacional" color="text-purple-500" />
                <QuickAccessCard title="Desempenho" icon={TrendingUp} path="/rh/desempenho" color="text-orange-500" />
                <QuickAccessCard title="Políticas" icon={BookOpen} path="/rh/politicas-manuais" color="text-indigo-500" />
                <QuickAccessCard title="Cargos" icon={Briefcase} path="/rh/descricao-cargos" color="text-muted-foreground" />
                <QuickAccessCard title="Organogramas" icon={GitFork} path="/rh/organogramas" color="text-cyan-500" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Funcionários</CardTitle><Users className="h-4 w-4 text-muted-foreground"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.totalEmployees}</div><p className="text-xs text-muted-foreground">{stats.activeEmployees} ativos</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Exames a Vencer</CardTitle><AlertTriangle className="h-4 w-4 text-orange-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-600">{stats.examsExpiring}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">NRs a Vencer</CardTitle><FileCheck className="h-4 w-4 text-yellow-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.nrExpiring}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Férias este Mês</CardTitle><CalendarCheck className="h-4 w-4 text-blue-500"/></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{stats.feriasEsteMes}</div></CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Contratações Recentes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.recentHires.map(h => (
                                <div key={h.id} className="flex items-center justify-between border-b pb-2 last:border-0" onClick={() => navigate(`/rh/funcionarios/${h.id}`)}>
                                    <div>
                                        <p className="font-medium cursor-pointer hover:underline">{h.nome_completo}</p>
                                        <p className="text-xs text-muted-foreground">{formatDateOnly(h.data_admissao)}</p>
                                    </div>
                                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded dark:bg-green-950/30 dark:text-green-400">Novo</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default RHDashboard;