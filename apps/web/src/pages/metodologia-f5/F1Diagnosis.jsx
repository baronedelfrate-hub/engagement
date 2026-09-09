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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ClipboardList, Users, CheckSquare, FileText, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const F1Diagnosis = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePhaseStatus } = useF5();

  const [activeTab, setActiveTab] = useState('interview');
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Form States
  const [interviewData, setInterviewData] = useState({
    interviewee: '',
    role: '',
    date: new Date().toISOString().split('T')[0],
    main_pain_points: '',
    goals: '',
    culture_notes: ''
  });

  const [checklistData, setChecklistData] = useState({
    financial_clarity: 'medium',
    process_documentation: 'low',
    team_alignment: 'medium',
    technology_usage: 'low',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = () => {
    setLoading(true);
    try {
      // 1. Check Phase Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const currentPhase = phases.find(p => p.project_id === projectId && p.name === 'F1');
      
      if (currentPhase?.status === 'concluido') {
        setIsFinished(true);
      }

      // 2. Load Interview Data
      const interviews = JSON.parse(localStorage.getItem('f1_interviews') || '[]');
      const savedInterview = interviews.find(i => i.project_id === projectId);
      if (savedInterview) {
        setInterviewData(savedInterview);
      }

      // 3. Load Checklist Data
      const checklists = JSON.parse(localStorage.getItem('f1_checklists') || '[]');
      const savedChecklist = checklists.find(c => c.project_id === projectId);
      if (savedChecklist) {
        setChecklistData(savedChecklist);
      }

    } catch (error) {
      console.error("Error loading F1 data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInterview = () => {
    setLoading(true);
    try {
      const interviews = JSON.parse(localStorage.getItem('f1_interviews') || '[]');
      const existingIndex = interviews.findIndex(i => i.project_id === projectId);
      
      const payload = { ...interviewData, project_id: projectId, updated_at: new Date().toISOString() };
      
      if (existingIndex >= 0) {
        interviews[existingIndex] = payload;
      } else {
        interviews.push(payload);
      }
      
      localStorage.setItem('f1_interviews', JSON.stringify(interviews));
      toast({ title: "Entrevista Salva" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChecklist = () => {
    setLoading(true);
    try {
      const checklists = JSON.parse(localStorage.getItem('f1_checklists') || '[]');
      const existingIndex = checklists.findIndex(c => c.project_id === projectId);

      const payload = { ...checklistData, project_id: projectId, updated_at: new Date().toISOString() };

      if (existingIndex >= 0) {
        checklists[existingIndex] = payload;
      } else {
        checklists.push(payload);
      }

      localStorage.setItem('f1_checklists', JSON.stringify(checklists));
      toast({ title: "Checklist Salvo" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPhase = async () => {
    if (!interviewData.interviewee || !checklistData.financial_clarity) {
      toast({ title: "Atenção", description: "Preencha a entrevista e o checklist antes de concluir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Generate Report
      const reports = JSON.parse(localStorage.getItem('f1_reports') || '[]');
      const reportPayload = {
        id: crypto.randomUUID(),
        project_id: projectId,
        content: { interview: interviewData, checklist: checklistData },
        generated_at: new Date().toISOString()
      };
      reports.push(reportPayload);
      localStorage.setItem('f1_reports', JSON.stringify(reports));

      // 2. Update Phase Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const updatedPhases = phases.map(p => 
        (p.project_id === projectId && p.name === 'F1') 
          ? { ...p, status: 'concluido', progress: 100, updated_at: new Date().toISOString() } 
          : p
      );
      localStorage.setItem('f5_phases', JSON.stringify(updatedPhases));

      // 3. Update Context
      await updatePhaseStatus(projectId, 'F1', 'concluido');
      
      setIsFinished(true);
      toast({ title: "Fase F1 Concluída!", description: "Diagnóstico finalizado. Fase F2 desbloqueada.", className: "bg-green-600 text-white" });
      
      // Navigate to project detail after short delay
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
      <Helmet><title>F1 - Diagnóstico 360°</title></Helmet>
      
      <PageHeader 
        title="F1 - Diagnóstico 360°" 
        description="Levantamento inicial de dores, objetivos e maturidade da gestão."
        showBack={true}
        backPath={`/metodologia-f5/projetos/${projectId}`}
        action={!isFinished && (
          <Button onClick={handleFinishPhase} className="bg-green-600 hover:bg-green-700 text-white gap-2">
            <CheckCircle2 className="h-4 w-4" /> Concluir Diagnóstico
          </Button>
        )}
      />

      {isFinished && (
        <div className="max-w-5xl mx-auto px-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="font-bold">Fase Concluída</p>
              <p className="text-sm">O diagnóstico foi finalizado e o relatório gerado. Edições estão bloqueadas.</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto mt-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="interview" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300">
              <Users className="h-4 w-4 mr-2" /> Entrevista Inicial
            </TabsTrigger>
            <TabsTrigger value="checklist" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 dark:data-[state=active]:bg-emerald-950/40 dark:data-[state=active]:text-emerald-300">
              <CheckSquare className="h-4 w-4 mr-2" /> Checklist de Maturidade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interview">
            <Card>
              <CardHeader>
                <CardTitle>Entrevista de Alinhamento</CardTitle>
                <CardDescription>Registre os pontos chave da conversa com os sócios/diretores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entrevistado</Label>
                    <Input value={interviewData.interviewee} onChange={e => setInterviewData({...interviewData, interviewee: e.target.value})} disabled={isFinished} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo/Papel</Label>
                    <Input value={interviewData.role} onChange={e => setInterviewData({...interviewData, role: e.target.value})} disabled={isFinished} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Principais Dores / Problemas Atuais</Label>
                  <Textarea className="min-h-[100px]" value={interviewData.main_pain_points} onChange={e => setInterviewData({...interviewData, main_pain_points: e.target.value})} placeholder="Ex: Falta de clareza no fluxo de caixa, equipe desmotivada..." disabled={isFinished} />
                </div>

                <div className="space-y-2">
                  <Label>Objetivos de Curto Prazo (3-6 meses)</Label>
                  <Textarea className="min-h-[100px]" value={interviewData.goals} onChange={e => setInterviewData({...interviewData, goals: e.target.value})} placeholder="Ex: Organizar o contas a pagar, definir pro labore..." disabled={isFinished} />
                </div>

                <div className="space-y-2">
                  <Label>Notas sobre Cultura Organizacional</Label>
                  <Textarea value={interviewData.culture_notes} onChange={e => setInterviewData({...interviewData, culture_notes: e.target.value})} placeholder="Perfil de liderança, comunicação interna..." disabled={isFinished} />
                </div>

                {!isFinished && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveInterview} disabled={loading}>Salvar Entrevista</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Checklist de Maturidade de Gestão</CardTitle>
                <CardDescription>Avalie o nível atual dos processos internos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Clareza Financeira</Label>
                    <Select value={checklistData.financial_clarity} onValueChange={v => setChecklistData({...checklistData, financial_clarity: v})} disabled={isFinished}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa (Sem controles)</SelectItem>
                        <SelectItem value="medium">Média (Planilhas básicas)</SelectItem>
                        <SelectItem value="high">Alta (ERP integrado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Documentação de Processos</Label>
                    <Select value={checklistData.process_documentation} onValueChange={v => setChecklistData({...checklistData, process_documentation: v})} disabled={isFinished}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Inexistente</SelectItem>
                        <SelectItem value="medium">Parcial / Informal</SelectItem>
                        <SelectItem value="high">Procedimentos Padronizados (POPs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Alinhamento da Equipe</Label>
                    <Select value={checklistData.team_alignment} onValueChange={v => setChecklistData({...checklistData, team_alignment: v})} disabled={isFinished}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Conflituoso / Disperso</SelectItem>
                        <SelectItem value="medium">Funcional</SelectItem>
                        <SelectItem value="high">Alta Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Uso de Tecnologia</Label>
                    <Select value={checklistData.technology_usage} onValueChange={v => setChecklistData({...checklistData, technology_usage: v})} disabled={isFinished}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Apenas E-mail/WhatsApp</SelectItem>
                        <SelectItem value="medium">Ferramentas básicas</SelectItem>
                        <SelectItem value="high">Tech Stack completa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações Gerais do Consultor</Label>
                  <Textarea className="min-h-[120px]" value={checklistData.notes} onChange={e => setChecklistData({...checklistData, notes: e.target.value})} disabled={isFinished} />
                </div>

                {!isFinished && (
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveChecklist} disabled={loading}>Salvar Checklist</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default F1Diagnosis;