import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, History } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateOnly } from '@/lib/dateUtils';

const RHControlePontoPage = () => {
  const { toast } = useToast();
  const [pontos, setPontos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // In a real app, filter by the logged-in user's employee ID, or fetch all if admin.
    const { data } = await supabase
      .from('rh_controle_ponto')
      .select('*, funcionario:rh_funcionarios(nome_completo)')
      .order('data_registro', { ascending: false })
      .limit(50);
    
    if (data) setPontos(data);
    setLoading(false);
  };

  const handleBaterPonto = async () => {
    toast({ title: "Bater Ponto", description: "🚧 Registro de ponto em desenvolvimento. Requer vínculo com sistema biométrico ou login de funcionário.", variant: "default" });
  };

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Controle de Ponto - RH</title></Helmet>
      <PageHeader title="Controle de Ponto" description="Gestão de jornada e registros de entrada/saída" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-center">Registro Rápido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="text-4xl font-mono tracking-wider font-bold text-primary">
              {currentTime.toLocaleTimeString()}
            </div>
            <p className="text-sm text-muted-foreground">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <Button size="lg" className="w-full mt-4 h-16 text-lg" onClick={handleBaterPonto}>
              <Clock className="mr-2 h-6 w-6" /> Bater Ponto
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Últimos Registros (Geral)</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
                ) : pontos.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro hoje.</TableCell></TableRow>
                ) : (
                  pontos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDateOnly(p.data_registro)}</TableCell>
                      <TableCell>{p.funcionario?.nome_completo || 'Sistema'}</TableCell>
                      <TableCell>{p.hora_entrada ? new Date(p.hora_entrada).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>{p.hora_saida ? new Date(p.hora_saida).toLocaleTimeString() : '-'}</TableCell>
                      <TableCell>{p.total_horas || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RHControlePontoPage;