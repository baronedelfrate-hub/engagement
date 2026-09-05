import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useCRM } from '@/contexts/CRMContext';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, DollarSign, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CRMDashboard = () => {
  const { clientes, propostas, loading } = useCRM();

  const stats = useMemo(() => {
    if (!propostas) return { totalValor: 0, ganhas: 0 };
    return {
      totalValor: propostas.reduce((acc, curr) => acc + (Number(curr.valor_total) || 0), 0),
      ganhas: propostas.filter(p => p.status === 'GANHA').length
    };
  }, [propostas]);

  const propostasPorStatus = useMemo(() => {
    const counts = {};
    propostas.forEach(p => {
      const status = p.status || 'LEAD';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [propostas]);

  const valorPorEtapa = useMemo(() => {
    const values = {};
    propostas.forEach(p => {
      const status = p.status || 'LEAD';
      values[status] = (values[status] || 0) + (Number(p.valor_total) || 0);
    });
    return Object.keys(values).map(key => ({ name: key, valor: values[key] }));
  }, [propostas]);

  if (loading) {
    return <div className="p-6"><Skeleton className="h-10 w-1/3 mb-6" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <>
      <Helmet><title>CRM Dashboard | ERP</title></Helmet>
      <PageHeader title="CRM Dashboard" description="Visão geral de vendas e pipeline" icon={Activity} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{clientes.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Propostas</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{propostas.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Valor em Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValor)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Propostas Ganhas</CardTitle>
            <Activity className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.ganhas}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle>Propostas por Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={propostasPorStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" label>
                  {propostasPorStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-slate-200">
          <CardHeader>
            <CardTitle>Valor por Etapa (R$)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valorPorEtapa}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} />
                <YAxis tickFormatter={(val) => `R$ ${val/1000}k`} tick={{fontSize: 10}} />
                <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CRMDashboard;