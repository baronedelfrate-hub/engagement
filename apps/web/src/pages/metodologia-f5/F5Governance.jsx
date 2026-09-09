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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Leaf, FileCheck, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const F5Governance = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePhaseStatus } = useF5();
  
  const [activeTab, setActiveTab] = useState('governance');
  const [loading, setLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [govData, setGovData] = useState({
    board_members: '',
    policies: '',
    compliance_officer: ''
  });

  const [sustData, setSustData] = useState({
    esg_policy: false,
    carbon_neutral: false,
    social_impact: false,
    notes: ''
  });

  useEffect(() => {
    checkStatus();
    loadData();
  }, [projectId]);

  const checkStatus = () => {
    const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
    const currentPhase = phases.find(p => p.project_id === projectId && p.name === 'F5');
    if (currentPhase?.status === 'concluido') {
      setIsFinished(true);
    }
  };

  const loadData = () => {
    try {
      // 1. Governance
      const allGov = JSON.parse(localStorage.getItem('f5_governance') || '[]');
      const projectGov = allGov.find(d => d.project_id === projectId);
      if (projectGov) setGovData(projectGov);

      // 2. Sustainability
      const allSust = JSON.parse(localStorage.getItem('f5_sustentabilidade') || '[]');
      const projectSust = allSust.find(d => d.project_id === projectId);
      if (projectSust) setSustData(projectSust);

    } catch(e) { console.error(e); }
  };

  const handleSaveGov = () => {
    setLoading(true);
    try {
      const allGov = JSON.parse(localStorage.getItem('f5_governance') || '[]');
      const existingIndex = allGov.findIndex(d => d.project_id === projectId);
      const payload = { ...govData, project_id: projectId };
      
      if (existingIndex >= 0) allGov[existingIndex] = payload;
      else allGov.push(payload);
      
      localStorage.setItem('f5_governance', JSON.stringify(allGov));
      toast({ title: "Dados de Governança Salvos" });
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSust = () => {
    setLoading(true);
    try {
      const allSust = JSON.parse(localStorage.getItem('f5_sustentabilidade') || '[]');
      const existingIndex = allSust.findIndex(d => d.project_id === projectId);
      const payload = { ...sustData, project_id: projectId };

      if (existingIndex >= 0) allSust[existingIndex] = payload;
      else allSust.push(payload);

      localStorage.setItem('f5_sustentabilidade', JSON.stringify(allSust));
      toast({ title: "Dados de Sustentabilidade Salvos" });
    } catch (e) {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProject = async () => {
    if (!window.confirm("Isso finalizará todo o projeto de consultoria. Confirma?")) return;
    
    setLoading(true);
    try {
      // 1. Generate Final Report
      const reports = JSON.parse(localStorage.getItem('f5_reports') || '[]');
      const reportPayload = { 
        id: crypto.randomUUID(),
        project_id: projectId, 
        type: 'FINAL',
        content: { governance: govData, sustainability: sustData },
        generated_at: new Date().toISOString()
      };
      localStorage.setItem('f5_reports', JSON.stringify([...reports, reportPayload]));
      
      // 2. Update Phase Status F5
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const updatedPhases = phases.map(p => 
        (p.project_id === projectId && p.name === 'F5') 
          ? { ...p, status: 'concluido', progress: 100, updated_at: new Date().toISOString() } 
          : p
      );
      localStorage.setItem('f5_phases', JSON.stringify(updatedPhases));
      
      // 3. Mark Project as Completed
      const projects = JSON.parse(localStorage.getItem('f5_projects_local') || '[]');
      const updatedProjects = projects.map(p => 
        p.id === projectId 
          ? { ...p, status: 'completed', ended_at: new Date().toISOString() } 
          : p
      );
      localStorage.setItem('f5_projects_local', JSON.stringify(updatedProjects));

      // 4. Update Context
      await updatePhaseStatus(projectId, 'F5', 'concluido');
      
      setIsFinished(true);
      toast({ 
        title: "PROJETO FINALIZADO! 🏆", 
        description: "A metodologia F5 foi aplicada com sucesso.", 
        className: "bg-green-600 text-white border-none p-6" 
      });

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha na finalização.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted text-center px-4">
        <Helmet><title>F5 - Concluído</title></Helmet>
        <div className="bg-background p-12 rounded-2xl shadow-xl max-w-lg border-t-8 border-green-500">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Metodologia Completa</h1>
          <p className="text-muted-foreground mb-8">
            O projeto foi finalizado e todos os relatórios foram gerados com sucesso.
            Parabéns pela jornada de transformação!
          </p>
          <Button onClick={() => navigate('/metodologia-f5/projetos')} size="lg" className="w-full">
            Voltar aos Projetos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 pb-20">
      <Helmet><title>F5 - Governança</title></Helmet>
      
      <PageHeader 
        title="F5 - Governança e Sustentabilidade" 
        description="Consolidação final e estruturação de longo prazo."
        showBack={true}
        backPath={`/metodologia-f5/projetos/${projectId}`}
      />

      <div className="max-w-5xl mx-auto mt-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="governance" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 dark:data-[state=active]:bg-purple-950/40 dark:data-[state=active]:text-purple-300">
              <ShieldCheck className="h-4 w-4 mr-2" /> Governança
            </TabsTrigger>
            <TabsTrigger value="sustainability" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 dark:data-[state=active]:bg-emerald-950/40 dark:data-[state=active]:text-emerald-300">
              <Leaf className="h-4 w-4 mr-2" /> Sustentabilidade
            </TabsTrigger>
            <TabsTrigger value="report" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 dark:data-[state=active]:bg-blue-950/40 dark:data-[state=active]:text-blue-300">
              <FileCheck className="h-4 w-4 mr-2" /> Relatório Final
            </TabsTrigger>
          </TabsList>

          <TabsContent value="governance">
            <Card>
              <CardHeader><CardTitle>Estrutura de Governança</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Membros do Conselho / Diretoria</Label>
                  <Textarea value={govData.board_members} onChange={e => setGovData({...govData, board_members: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Políticas Internas Definidas</Label>
                  <Textarea value={govData.policies} onChange={e => setGovData({...govData, policies: e.target.value})} placeholder="Compliance, Ética, etc." />
                </div>
                <div className="grid gap-2">
                  <Label>Responsável pelo Compliance</Label>
                  <Input value={govData.compliance_officer} onChange={e => setGovData({...govData, compliance_officer: e.target.value})} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveGov} disabled={loading}>Salvar Dados</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sustainability">
            <Card>
              <CardHeader><CardTitle>Práticas ESG</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2 border p-4 rounded bg-background">
                  <Checkbox id="esg" checked={sustData.esg_policy} onCheckedChange={(c) => setSustData({...sustData, esg_policy: c})} />
                  <Label htmlFor="esg" className="font-medium">Política ESG Formalizada</Label>
                </div>
                <div className="flex items-center space-x-2 border p-4 rounded bg-background">
                  <Checkbox id="carbon" checked={sustData.carbon_neutral} onCheckedChange={(c) => setSustData({...sustData, carbon_neutral: c})} />
                  <Label htmlFor="carbon" className="font-medium">Iniciativas de Carbono Neutro</Label>
                </div>
                <div className="flex items-center space-x-2 border p-4 rounded bg-background">
                  <Checkbox id="social" checked={sustData.social_impact} onCheckedChange={(c) => setSustData({...sustData, social_impact: c})} />
                  <Label htmlFor="social" className="font-medium">Projetos de Impacto Social</Label>
                </div>
                <div className="grid gap-2">
                  <Label>Notas Adicionais</Label>
                  <Textarea value={sustData.notes} onChange={e => setSustData({...sustData, notes: e.target.value})} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSust} disabled={loading}>Salvar Dados</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report">
            <Card className="border-t-4 border-t-green-600 bg-muted">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Revisão Final do Projeto</CardTitle>
                <CardDescription className="text-center">
                  Ao confirmar, o projeto será marcado como concluído e o relatório final será gerado.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-10 space-y-6">
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-4">
                  <div className="bg-background p-4 rounded border text-center">
                    <span className="block font-bold text-muted-foreground">Governança</span>
                    <span className={govData.board_members ? "text-green-600 font-bold" : "text-red-500"}>{govData.board_members ? 'Preenchido' : 'Pendente'}</span>
                  </div>
                  <div className="bg-background p-4 rounded border text-center">
                    <span className="block font-bold text-muted-foreground">Sustentabilidade</span>
                    <span className={sustData.esg_policy || sustData.notes ? "text-green-600 font-bold" : "text-orange-500"}>Verificado</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCompleteProject} 
                  disabled={loading} 
                  size="lg" 
                  className="w-full max-w-sm bg-green-600 hover:bg-green-700 text-white h-14 text-lg shadow-lg"
                >
                  {loading ? 'Processando...' : 'Marcar Projeto como CONCLUÍDO 🚀'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default F5Governance;