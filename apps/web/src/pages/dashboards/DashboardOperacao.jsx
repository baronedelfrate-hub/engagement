import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/storage';

function DashboardOperacao() {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const cards = storage.get('KANBAN_CARDS');
    
    const statusCounts = {
        'A Fazer': 0,
        'Em Execução': 0,
        'Aguardando': 0,
        'Concluído': 0
    };

    cards.forEach(card => {
        if (statusCounts[card.status] !== undefined) {
            statusCounts[card.status]++;
        }
    });

    const data = Object.keys(statusCounts).map(key => ({
        name: key,
        Quantidade: statusCounts[key]
    }));

    setChartData(data);
  }, []);

  return (
    <>
      <Helmet>
        <title>Dashboard Operação - ERP Platform</title>
      </Helmet>

      <PageHeader title="Dashboard Operacional" description="Visão geral das tarefas e projetos" />

      <Card className="min-h-[400px]">
        <CardHeader><CardTitle>Distribuição de Tarefas por Status</CardTitle></CardHeader>
        <CardContent>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="Quantidade" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>
    </>
  );
}

export default DashboardOperacao;