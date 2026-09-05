import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { getPhaseColor, getPhaseLabel, formatBPODate, calculatePhaseProgress } from '@/lib/bpoUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, User } from 'lucide-react';

const BPOClienteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('bpo_clientes')
        .select(`*, cliente:clientes(nome, cnpj_cpf), responsavel:users(nome)`)
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch phases with activities count for progress
      const { data: phasesData, error: phasesError } = await supabase
        .from('bpo_fases')
        .select(`
          *,
          atividades:bpo_atividades(id, status)
        `)
        .eq('bpo_cliente_id', id)
        .order('fase');
        
      if (phasesError) throw phasesError;
      setPhases(phasesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Carregando detalhes...</div>;
  if (!client) return <div className="p-8">Cliente não encontrado.</div>;

  return (
    <div className="p-8 space-y-6">
      <Helmet>
        <title>{client.cliente?.nome} - Detalhes BPO</title>
      </Helmet>

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/bpo/clientes')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">{client.cliente?.nome}</h1>
        <Badge variant="outline" className="text-base">{client.status_bpo}</Badge>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">CNPJ</p>
            <p className="font-medium">{client.cliente?.cnpj_cpf || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/> Responsável</p>
            <p className="font-medium">{client.responsavel?.nome || 'Não definido'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3"/> Início do Contrato</p>
            <p className="font-medium">{formatBPODate(client.data_inicio)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {phases.map(phase => {
          const progress = calculatePhaseProgress(phase.atividades);
          return (
            <Card 
              key={phase.id} 
              className={`cursor-pointer hover:shadow-lg transition-all border-l-4 ${getPhaseColor(phase.fase).replace('bg-', 'border-l-')}`}
              onClick={() => navigate(`/bpo/fase/${phase.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{getPhaseLabel(phase.fase)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={phase.status === 'Concluído' ? 'success' : 'secondary'}>{phase.status}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Início: {formatBPODate(phase.data_inicio)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BPOClienteDetail;