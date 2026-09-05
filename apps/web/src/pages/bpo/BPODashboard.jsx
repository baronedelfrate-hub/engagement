import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBPODate, getPhaseLabel } from '@/lib/bpoUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DataTable from '@/components/DataTable';
import { Users, LayoutDashboard } from 'lucide-react';

const BPODashboard = () => {
  const [stats, setStats] = useState({ total: 0, phases: {} });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Clients joined with current phases
      // This query assumes we want to show the current phase. 
      // For simplicity in this schema, 'fase_atual' isn't explicitly stored on client, so we infer or just show client list.
      // But let's fetch clients and their phases to compute stats.
      
      const { data: allClients } = await supabase
        .from('bpo_clientes')
        .select(`
            *, 
            cliente:clientes(nome), 
            responsavel:users(nome)
        `);

      // Mock calculation of "Current Phase" based on Logic: Earliest non-completed phase or B5
      // This requires fetching phases status. 
      // For dashboard performance, usually a view or denormalized field is better.
      // We will fetch all phases and process in JS for this constrained environment.
      
      const { data: allPhases } = await supabase.from('bpo_fases').select('*');
      
      const clientPhaseMap = {};
      const phaseCounts = { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0 };

      allClients?.forEach(cli => {
        const phases = allPhases?.filter(p => p.bpo_cliente_id === cli.id).sort((a, b) => a.fase.localeCompare(b.fase));
        const current = phases?.find(p => p.status !== 'Concluído') || phases?.[phases.length - 1]; // First pending or last
        
        const phaseName = current?.fase || 'B1';
        clientPhaseMap[cli.id] = phaseName;
        if(phaseCounts[phaseName] !== undefined) phaseCounts[phaseName]++;
      });

      setClients(allClients?.map(c => ({
        ...c,
        fase_atual: clientPhaseMap[c.id]
      })) || []);

      setStats({
        total: allClients?.length || 0,
        phases: phaseCounts
      });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData = Object.entries(stats.phases).map(([name, value]) => ({ name, value }));
  const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  const columns = [
    { header: 'Cliente', accessorKey: 'cliente.nome' },
    { header: 'Fase Atual', accessorKey: 'fase_atual', cell: ({row}) => getPhaseLabel(row.fase_atual) },
    { header: 'Responsável', accessorKey: 'responsavel.nome' },
    { header: 'Status', accessorKey: 'status_bpo' },
    { header: 'Início', accessorKey: 'data_inicio', cell: ({row}) => formatBPODate(row.data_inicio) },
  ];

  return (
    <div className="p-8 space-y-6">
      <Helmet><title>Dashboard BPO - ERP Platform</title></Helmet>
      
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Dashboard BPO E5</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Ativos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        {Object.entries(stats.phases).map(([phase, count], idx) => (
           <Card key={phase}>
             <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{phase}</CardTitle></CardHeader>
             <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
           </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Distribuição por Fase</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Controle Operacional</CardTitle></CardHeader>
            <CardContent>
                <DataTable 
                    data={clients}
                    columns={columns}
                    loading={loading}
                    pagination={{ limit: 5 }}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BPODashboard;