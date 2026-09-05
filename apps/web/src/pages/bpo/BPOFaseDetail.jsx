import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { getPhaseLabel } from '@/lib/bpoUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Circle, Clock, Plus, Trash2, Edit } from 'lucide-react';
import BPOActivityForm from './BPOActivityForm';

const BPOFaseDetail = () => {
  const { faseId } = useParams();
  const navigate = useNavigate();
  const [fase, setFase] = useState(null);
  const [blocos, setBlocos] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [targetBlockId, setTargetBlockId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [faseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: faseData } = await supabase
        .from('bpo_fases')
        .select(`*, bpo_cliente:bpo_clientes(id, cliente:clientes(nome))`)
        .eq('id', faseId)
        .single();
      setFase(faseData);

      if (faseData.fase === 'B1') {
        const { data: blocosData } = await supabase
          .from('bpo_blocos')
          .select('*')
          .eq('bpo_fase_id', faseId)
          .order('ordem');
        setBlocos(blocosData || []);
      }

      const { data: actData } = await supabase
        .from('bpo_atividades')
        .select('*')
        .eq('bpo_fase_id', faseId)
        .order('ordem');
      setActivities(actData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateActivity = (blockId = null) => {
    setSelectedActivity(null);
    setTargetBlockId(blockId);
    setIsActivityModalOpen(true);
  };

  const handleEditActivity = (activity) => {
    setSelectedActivity(activity);
    setTargetBlockId(activity.bpo_bloco_id);
    setIsActivityModalOpen(true);
  };

  const handleDeleteActivity = async (id) => {
    if (confirm('Excluir atividade?')) {
      await supabase.from('bpo_atividades').delete().eq('id', id);
      fetchData();
    }
  };

  const handleStatusChange = async (activity, newStatus) => {
    await supabase.from('bpo_atividades').update({ status: newStatus }).eq('id', activity.id);
    // Optimistic update
    setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, status: newStatus } : a));
  };

  const ActivityItem = ({ activity }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors mb-2">
      <div className="flex items-center gap-3">
        <button onClick={() => handleStatusChange(activity, activity.status === 'Concluído' ? 'Pendente' : 'Concluído')}>
            {activity.status === 'Concluído' ? <CheckCircle2 className="text-green-500 h-5 w-5" /> : 
             activity.status === 'Em Andamento' ? <Clock className="text-blue-500 h-5 w-5" /> : 
             <Circle className="text-gray-300 h-5 w-5" />}
        </button>
        <span className={activity.status === 'Concluído' ? 'line-through text-muted-foreground' : ''}>{activity.descricao}</span>
      </div>
      <div className="flex items-center gap-2">
         <Badge variant="outline" className="text-xs">{activity.status}</Badge>
         <Button variant="ghost" size="icon" onClick={() => handleEditActivity(activity)}><Edit className="h-4 w-4" /></Button>
         <Button variant="ghost" size="icon" onClick={() => handleDeleteActivity(activity.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    </div>
  );

  if (loading || !fase) return <div className="p-8">Carregando...</div>;

  return (
    <div className="p-8 space-y-6">
      <Helmet><title>{getPhaseLabel(fase.fase)} - Detalhes</title></Helmet>

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/bpo/cliente/${fase.bpo_cliente_id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{fase.bpo_cliente?.cliente?.nome}</h1>
          <h2 className="text-lg text-muted-foreground">{getPhaseLabel(fase.fase)}</h2>
        </div>
        <div className="ml-auto">
          <Badge>{fase.status}</Badge>
        </div>
      </div>

      {fase.fase === 'B1' ? (
        <div className="space-y-6">
          {blocos.map(bloco => (
            <Card key={bloco.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{bloco.bloco}</CardTitle>
                <Button size="sm" onClick={() => handleCreateActivity(bloco.id)}><Plus className="h-4 w-4 mr-2"/> Nova Atividade</Button>
              </CardHeader>
              <CardContent>
                {activities.filter(a => a.bpo_bloco_id === bloco.id).map(act => (
                   <ActivityItem key={act.id} activity={act} />
                ))}
                {activities.filter(a => a.bpo_bloco_id === bloco.id).length === 0 && <p className="text-muted-foreground text-sm">Nenhuma atividade.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Atividades</CardTitle>
            <Button size="sm" onClick={() => handleCreateActivity()}><Plus className="h-4 w-4 mr-2"/> Nova Atividade</Button>
          </CardHeader>
          <CardContent>
            {activities.map(act => (
              <ActivityItem key={act.id} activity={act} />
            ))}
            {activities.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma atividade cadastrada.</p>}
          </CardContent>
        </Card>
      )}

      {isActivityModalOpen && (
        <BPOActivityForm 
            isOpen={isActivityModalOpen}
            onClose={() => { setIsActivityModalOpen(false); fetchData(); }}
            faseId={faseId}
            blockId={targetBlockId}
            activity={selectedActivity}
        />
      )}
    </div>
  );
};

export default BPOFaseDetail;