import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useF5 } from '@/contexts/F5Context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { ChevronRight, ChevronLeft, Save, Flag, TrendingUp, DollarSign, Target, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const STEPS = [
  { id: 'direcionadores', title: 'Direcionadores Estratégicos', icon: Flag, description: 'Defina a Missão, Visão e Valores.' },
  { id: 'metas', title: 'Metas Globais', icon: Target, description: 'Estabeleça objetivos claros (OKRs).' },
  { id: 'orcamento', title: 'Orçamento Base Zero', icon: DollarSign, description: 'Planejamento orçamentário anual.' },
  { id: 'cenarios', title: 'Planejamento de Cenários', icon: TrendingUp, description: 'Cenários Otimista, Realista e Pessimista.' },
  { id: 'review', title: 'Revisão e Plano Final', icon: CheckCircle2, description: 'Consolidação do plano estratégico.' }
];

const F4Planning = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePhaseStatus } = useF5();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1
    missao: '', visao: '', valores: '',
    // Step 2
    metas_principais: '', prazo_metas: '',
    // Step 3
    orcamento_total: '', principais_investimentos: '',
    // Step 4
    cenario_otimista: '', cenario_pessimista: '',
    // Meta fields
    status: 'em_andamento'
  });

  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = () => {
    setLoading(true);
    try {
      // 1. Check Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const currentPhase = phases.find(p => p.project_id === projectId && p.name === 'F4');
      if (currentPhase?.status === 'concluido') {
        setIsFinished(true);
      }

      // 2. Load Plan Data (Stored in f4_data for simplicity or f4_direcionadores for compatibility)
      const allData = JSON.parse(localStorage.getItem('f4_data') || '[]');
      const projectData = allData.find(d => d.project_id === projectId);
      
      if (projectData) {
        setFormData(prev => ({ ...prev, ...projectData }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStep = async (moveNext = false) => {
    setLoading(true);
    try {
      // Save full data to local storage
      const allData = JSON.parse(localStorage.getItem('f4_data') || '[]');
      const existingIndex = allData.findIndex(d => d.project_id === projectId);
      
      const payload = { ...formData, project_id: projectId, updated_at: new Date().toISOString() };

      if (existingIndex >= 0) {
        allData[existingIndex] = payload;
      } else {
        allData.push(payload);
      }
      localStorage.setItem('f4_data', JSON.stringify(allData));

      toast({ title: "Salvo com sucesso" });

      if (moveNext) {
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
          window.scrollTo(0,0);
        } else {
          await finishPhase();
        }
      }

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const finishPhase = async () => {
    try {
      // 1. Generate Report
      const reports = JSON.parse(localStorage.getItem('f4_reports') || '[]');
      const reportPayload = {
        id: crypto.randomUUID(),
        project_id: projectId,
        content: formData,
        generated_at: new Date().toISOString()
      };
      localStorage.setItem('f4_reports', JSON.stringify([...reports, reportPayload]));

      // 2. Update Phase Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const updatedPhases = phases.map(p => 
        (p.project_id === projectId && p.name === 'F4') 
          ? { ...p, status: 'concluido', progress: 100, updated_at: new Date().toISOString() } 
          : p
      );
      localStorage.setItem('f5_phases', JSON.stringify(updatedPhases));
      
      // 3. Update Context
      await updatePhaseStatus(projectId, 'F4', 'concluido');
      
      setIsFinished(true);
      toast({ title: "Fase F4 Concluída!", description: "Planejamento estratégico finalizado.", className: "bg-green-600 text-white" });
      setTimeout(() => navigate(`/metodologia-f5/projetos/${projectId}`), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const renderStepContent = () => {
    switch(currentStep) {
      case 0: return (
        <div className="space-y-4">
          <div className="grid gap-2"><Label>Missão</Label><Textarea value={formData.missao} onChange={e => setFormData({...formData, missao: e.target.value})} placeholder="Qual o propósito da empresa?" /></div>
          <div className="grid gap-2"><Label>Visão</Label><Textarea value={formData.visao} onChange={e => setFormData({...formData, visao: e.target.value})} placeholder="Onde querem chegar em 5 anos?" /></div>
          <div className="grid gap-2"><Label>Valores</Label><Textarea value={formData.valores} onChange={e => setFormData({...formData, valores: e.target.value})} placeholder="Princípios inegociáveis..." /></div>
        </div>
      );
      case 1: return (
        <div className="space-y-4">
          <div className="grid gap-2"><Label>Metas Principais (OKRs)</Label><Textarea value={formData.metas_principais} onChange={e => setFormData({...formData, metas_principais: e.target.value})} className="h-32" placeholder="- Aumentar faturamento em 30%..." /></div>
          <div className="grid gap-2"><Label>Prazo de Execução</Label><Input value={formData.prazo_metas} onChange={e => setFormData({...formData, prazo_metas: e.target.value})} placeholder="Ex: Dezembro 2025" /></div>
        </div>
      );
      case 2: return (
        <div className="space-y-4">
          <div className="grid gap-2"><Label>Orçamento Total Estimado (R$)</Label><Input type="number" value={formData.orcamento_total} onChange={e => setFormData({...formData, orcamento_total: e.target.value})} /></div>
          <div className="grid gap-2"><Label>Principais Investimentos (CAPEX)</Label><Textarea value={formData.principais_investimentos} onChange={e => setFormData({...formData, principais_investimentos: e.target.value})} placeholder="Equipamentos, Software, Expansão..." /></div>
        </div>
      );
      case 3: return (
        <div className="space-y-4">
          <div className="grid gap-2"><Label>Cenário Otimista</Label><Textarea value={formData.cenario_otimista} onChange={e => setFormData({...formData, cenario_otimista: e.target.value})} placeholder="Se tudo der certo..." /></div>
          <div className="grid gap-2"><Label>Cenário Pessimista (Riscos)</Label><Textarea value={formData.cenario_pessimista} onChange={e => setFormData({...formData, cenario_pessimista: e.target.value})} placeholder="Se houver crise ou perda de clientes..." /></div>
        </div>
      );
      case 4: return (
        <div className="space-y-6 text-sm">
          <div className="bg-slate-50 p-4 rounded border">
            <h4 className="font-bold text-lg mb-2 text-slate-800">Resumo do Planejamento</h4>
            <div className="grid grid-cols-2 gap-4">
              <div><strong>Missão:</strong> {formData.missao || '-'}</div>
              <div><strong>Visão:</strong> {formData.visao || '-'}</div>
              <div className="col-span-2"><strong>Metas:</strong> {formData.metas_principais || '-'}</div>
              <div><strong>Orçamento:</strong> R$ {formData.orcamento_total || '0'}</div>
            </div>
          </div>
          <p className="text-center text-slate-500">Ao clicar em "Concluir Fase", um relatório executivo será gerado e a fase será travada.</p>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Helmet><title>F4 - Planejamento Estratégico</title></Helmet>
      
      <PageHeader 
        title="F4 - Planejamento Estratégico" 
        description="Definição de metas, orçamento e visão de futuro."
        showBack={true}
        backPath={`/metodologia-f5/projetos/${projectId}`}
      />

      <div className="max-w-4xl mx-auto mt-6 px-4">
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Passo {currentStep + 1} de {STEPS.length}</span>
            <span>{progress}% Concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-2">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className={`p-3 rounded-lg flex items-center gap-3 text-sm ${idx === currentStep ? 'bg-blue-100 text-blue-700 font-bold' : idx < currentStep ? 'bg-green-50 text-green-700' : 'text-slate-400'}`}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{s.title}</span>
                </div>
              );
            })}
          </div>

          <Card className="md:col-span-3 min-h-[400px] flex flex-col">
            <CardHeader>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
              <CardDescription>{STEPS[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isFinished ? (
                <div className="h-full flex flex-col items-center justify-center text-green-600">
                  <CheckCircle2 className="h-16 w-16 mb-4" />
                  <h3 className="text-2xl font-bold">Planejamento Concluído</h3>
                  <p className="text-slate-500 mt-2">Esta fase foi finalizada e arquivada.</p>
                </div>
              ) : renderStepContent()}
            </CardContent>
            {!isFinished && (
              <CardFooter className="flex justify-between border-t p-6 bg-slate-50 rounded-b-xl">
                <Button variant="ghost" onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))} disabled={currentStep === 0 || loading}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSaveStep(false)} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" /> Salvar
                  </Button>
                  <Button onClick={() => handleSaveStep(true)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {currentStep === STEPS.length - 1 ? 'Concluir Fase' : 'Próximo'} 
                    {currentStep !== STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default F4Planning;