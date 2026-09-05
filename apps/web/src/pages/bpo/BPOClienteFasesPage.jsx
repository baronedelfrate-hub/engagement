import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { formatBPODate } from '@/lib/bpoUtils';

const BPOClienteFasesPage = () => {
  const { cliente_id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [bpoCliente, setBpoCliente] = useState(null);
  const [fases, setFases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [cliente_id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch BPO Client details with related Cliente info
      const { data: clientData, error: clientError } = await supabase
        .from('bpo_clientes')
        .select('*, cliente:clientes(nome)')
        .eq('id', cliente_id)
        .single();

      if (clientError) throw clientError;
      if (!clientData) throw new Error('Cliente BPO não encontrado.');

      setBpoCliente(clientData);

      // Fetch Phases
      const { data: phasesData, error: phasesError } = await supabase
        .from('bpo_fases')
        .select('*')
        .eq('bpo_cliente_id', cliente_id)
        .order('created_at', { ascending: true });

      if (phasesError) throw phasesError;
      setFases(phasesData || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as fases do cliente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Concluída': return 'success';
      case 'Em Progresso': return 'warning';
      case 'Não Iniciada': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Erro ao carregar cliente</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <Button onClick={() => navigate('/operacao/bpo-e5/clientes-bpo')}>
          Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Helmet>
        <title>Fases BPO - ERP Platform</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/operacao/bpo-e5/clientes-bpo')} className="p-2 h-auto">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Fases do BPO - {bpoCliente?.cliente?.nome || 'Cliente'}
            </h1>
            <p className="text-slate-500 text-sm">
              Visualize e gerencie as fases de implementação e operação
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fases.map((fase) => (
          <Card key={fase.id} className="shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg font-semibold text-slate-800">{fase.fase}</CardTitle>
                <Badge variant={getStatusBadge(fase.status)}>{fase.status || 'Não Iniciada'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 space-y-3">
              <div className="text-sm">
                <span className="text-slate-500 block mb-1">Período</span>
                <span className="font-medium text-slate-800">
                  {fase.data_inicio ? formatBPODate(fase.data_inicio) : '-'} até {fase.data_fim ? formatBPODate(fase.data_fim) : '-'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500 block mb-1">Responsável</span>
                {/* Simulated Responsável field as requested */}
                <span className="font-medium text-slate-800">{bpoCliente?.responsavel?.nome || 'Não atribuído'}</span>
              </div>
            </CardContent>
            <div className="p-4 border-t border-slate-100 mt-auto">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => navigate(`/operacao/bpo-e5/clientes-bpo/${cliente_id}/fases/${fase.id}/editar`)}
              >
                <Edit2 className="w-4 h-4" />
                Editar Fase
              </Button>
            </div>
          </Card>
        ))}
        {fases.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
            <p className="text-slate-500">Nenhuma fase encontrada para este cliente.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BPOClienteFasesPage;