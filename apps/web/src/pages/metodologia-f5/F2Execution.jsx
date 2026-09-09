import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useF5 } from '@/contexts/F5Context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ListTodo, CalendarClock, Trash2, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const F2Execution = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePhaseStatus } = useF5();

  const [activeTab, setActiveTab] = useState('actions');
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Data States
  const [actions, setActions] = useState([]);
  const [routines, setRoutines] = useState([]);

  // Form inputs
  const [newAction, setNewAction] = useState('');
  const [newRoutine, setNewRoutine] = useState({ title: '', frequency: 'Diário' });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = () => {
    setLoading(true);
    try {
      // 1. Check Phase Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const currentPhase = phases.find(p => p.project_id === projectId && p.name === 'F2');
      if (currentPhase?.status === 'concluido') {
        setIsFinished(true);
      }

      // 2. Load Actions
      const allActions = JSON.parse(localStorage.getItem('f2_actions') || '[]');
      const projectActions = allActions.filter(a => a.project_id === projectId);
      setActions(projectActions);

      // 3. Load Routines
      const allRoutines = JSON.parse(localStorage.getItem('f2_routines') || '[]');
      const projectRoutines = allRoutines.filter(r => r.project_id === projectId);
      setRoutines(projectRoutines);

    } catch (error) {
      console.error("Error loading F2 data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAction = () => {
    if (!newAction.trim()) return;
    
    const newActionItem = {
      id: crypto.randomUUID(),
      project_id: projectId,
      title: newAction,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const allActions = JSON.parse(localStorage.getItem('f2_actions') || '[]');
    const updatedActions = [...allActions, newActionItem];
    localStorage.setItem('f2_actions', JSON.stringify(updatedActions));
    
    setActions(prev => [...prev, newActionItem]);
    setNewAction('');
    toast({ title: "Ação adicionada" });
  };

  const handleToggleAction = (id) => {
    const allActions = JSON.parse(localStorage.getItem('f2_actions') || '[]');
    const updatedActions = allActions.map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === 'done' ? 'pending' : 'done' };
      }
      return a;
    });
    localStorage.setItem('f2_actions', JSON.stringify(updatedActions));
    
    // Update local state
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'done' ? 'pending' : 'done' } : a));
  };

  const handleDeleteAction = (id) => {
    const allActions = JSON.parse(localStorage.getItem('f2_actions') || '[]');
    const updatedActions = allActions.filter(a => a.id !== id);
    localStorage.setItem('f2_actions', JSON.stringify(updatedActions));
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const handleAddRoutine = () => {
    if (!newRoutine.title.trim()) return;

    const newRoutineItem = {
      id: crypto.randomUUID(),
      project_id: projectId,
      title: newRoutine.title,
      frequency: newRoutine.frequency,
      created_at: new Date().toISOString()
    };

    const allRoutines = JSON.parse(localStorage.getItem('f2_routines') || '[]');
    const updatedRoutines = [...allRoutines, newRoutineItem];
    localStorage.setItem('f2_routines', JSON.stringify(updatedRoutines));

    setRoutines(prev => [...prev, newRoutineItem]);
    setNewRoutine({ title: '', frequency: 'Diário' });
    toast({ title: "Rotina definida" });
  };

  const handleDeleteRoutine = (id) => {
    const allRoutines = JSON.parse(localStorage.getItem('f2_routines') || '[]');
    const updatedRoutines = allRoutines.filter(r => r.id !== id);
    localStorage.setItem('f2_routines', JSON.stringify(updatedRoutines));
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const handleFinishPhase = async () => {
    if (actions.length === 0 || routines.length === 0) {
      toast({ title: "Atenção", description: "Defina ações e rotinas antes de concluir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Update Phase Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const updatedPhases = phases.map(p => 
        (p.project_id === projectId && p.name === 'F2') 
          ? { ...p, status: 'concluido', progress: 100, updated_at: new Date().toISOString() } 
          : p
      );
      localStorage.setItem('f5_phases', JSON.stringify(updatedPhases));

      // 2. Update Context
      await updatePhaseStatus(projectId, 'F2', 'concluido');

      setIsFinished(true);
      toast({ title: "Fase F2 Concluída!", description: "Estruturação finalizada. Fase F3 desbloqueada.", className: "bg-green-600 text-white" });
      setTimeout(() => navigate(`/metodologia-f5/projetos/${projectId}`), 1500);

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao concluir fase.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/50 pb-20">
      <Helmet><title>F2 - Execução e Rotinas</title></Helmet>
      
      <PageHeader 
        title="F2 - Estruturação e Execução" 
        description="Definição de planos de ação imediata e rotinas de gestão."
        showBack={true}
        backPath={`/metodologia-f5/projetos/${projectId}`}
        action={!isFinished && (
          <Button onClick={handleFinishPhase} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <CheckCircle2 className="h-4 w-4" /> Concluir Fase
          </Button>
        )}
      />

      {isFinished && (
        <div className="max-w-5xl mx-auto px-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="font-bold">Fase Concluída</p>
              <p className="text-sm">As ações e rotinas foram estruturadas. Edições bloqueadas.</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto mt-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="actions" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 dark:data-[state=active]:bg-orange-950/40 dark:data-[state=active]:text-orange-300">
              <ListTodo className="h-4 w-4 mr-2" /> Plano de Ação
            </TabsTrigger>
            <TabsTrigger value="routines" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 dark:data-[state=active]:bg-purple-950/40 dark:data-[state=active]:text-purple-300">
              <CalendarClock className="h-4 w-4 mr-2" /> Rotinas de Gestão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Ações Imediatas</CardTitle>
                <CardDescription>O que precisa ser feito para resolver as dores identificadas na F1.</CardDescription>
              </CardHeader>
              <CardContent>
                {!isFinished && (
                  <div className="flex gap-2 mb-6">
                    <Input 
                      placeholder="Nova ação..." 
                      value={newAction} 
                      onChange={(e) => setNewAction(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                    />
                    <Button onClick={handleAddAction}><Plus className="h-4 w-4" /></Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  {actions.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma ação registrada.</p>}
                  {actions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={action.status === 'done'} 
                          onChange={() => !isFinished && handleToggleAction(action.id)} 
                          disabled={isFinished}
                          className="h-4 w-4 rounded border-border text-green-600 focus:ring-green-500"
                        />
                        <span className={action.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}>
                          {action.title}
                        </span>
                      </div>
                      {!isFinished && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAction(action.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routines">
            <Card>
              <CardHeader>
                <CardTitle>Rituais e Rotinas</CardTitle>
                <CardDescription>Defina a periodicidade das reuniões e acompanhamentos.</CardDescription>
              </CardHeader>
              <CardContent>
                {!isFinished && (
                  <div className="flex gap-2 mb-6 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Nome da Rotina</Label>
                      <Input 
                        placeholder="Ex: Reunião Comercial" 
                        value={newRoutine.title} 
                        onChange={(e) => setNewRoutine({...newRoutine, title: e.target.value})} 
                      />
                    </div>
                    <div className="w-40 space-y-2">
                      <Label>Frequência</Label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newRoutine.frequency} 
                        onChange={(e) => setNewRoutine({...newRoutine, frequency: e.target.value})}
                      >
                        <option value="Diário">Diário</option>
                        <option value="Semanal">Semanal</option>
                        <option value="Quinzenal">Quinzenal</option>
                        <option value="Mensal">Mensal</option>
                      </select>
                    </div>
                    <Button onClick={handleAddRoutine}><Plus className="h-4 w-4" /></Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {routines.length === 0 && <div className="col-span-2 text-center text-muted-foreground py-8">Nenhuma rotina definida.</div>}
                   {routines.map((routine) => (
                     <div key={routine.id} className="border p-4 rounded-lg bg-background flex justify-between items-center">
                       <div>
                         <p className="font-bold text-foreground">{routine.title}</p>
                         <Badge variant="outline" className="mt-1">{routine.frequency}</Badge>
                       </div>
                       {!isFinished && (
                         <Button variant="ghost" size="sm" onClick={() => handleDeleteRoutine(routine.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                         </Button>
                       )}
                     </div>
                   ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default F2Execution;