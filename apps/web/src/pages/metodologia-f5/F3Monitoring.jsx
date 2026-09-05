import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useF5 } from '@/contexts/F5Context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Edit2, Trash2, CheckCircle2, TrendingUp, AlertTriangle, XCircle, FileText } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const F3Monitoring = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePhaseStatus } = useF5();

  const [kpis, setKpis] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    current_value: '',
    target_value: '',
    unit: '',
    frequency: 'Mensal'
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = () => {
    setLoading(true);
    try {
      // 1. Check Phase Status
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const currentPhase = phases.find(p => p.project_id === projectId && p.name === 'F3');
      
      if (currentPhase?.status === 'concluido') {
        setIsFinished(true);
      }

      // 2. Load KPIs
      const allKpis = JSON.parse(localStorage.getItem('f3_kpis') || '[]');
      const projectKpis = allKpis.filter(k => k.project_id === projectId);
      setKpis(projectKpis);

      // 3. Generate History (Mock)
      if (projectKpis.length > 0) {
        setHistoryData(projectKpis.map(k => ({
          name: k.title,
          Jan: k.current_value * 0.8,
          Feb: k.current_value * 0.9,
          Mar: k.current_value,
          Meta: k.target_value
        })));
      }

    } catch (error) {
      console.error("Error loading F3 data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKpi = () => {
    try {
      const payload = {
        project_id: projectId,
        ...formData,
        status: calculateStatus(formData.current_value, formData.target_value),
        updated_at: new Date().toISOString()
      };

      const allKpis = JSON.parse(localStorage.getItem('f3_kpis') || '[]');

      if (editingKpi) {
        // Update
        const updatedKpis = allKpis.map(k => k.id === editingKpi.id ? { ...k, ...payload } : k);
        localStorage.setItem('f3_kpis', JSON.stringify(updatedKpis));
        toast({ title: "KPI Atualizado" });
      } else {
        // Create
        const newKpi = { ...payload, id: crypto.randomUUID() };
        const updatedKpis = [...allKpis, newKpi];
        localStorage.setItem('f3_kpis', JSON.stringify(updatedKpis));
        toast({ title: "KPI Criado" });
      }

      setIsModalOpen(false);
      setEditingKpi(null);
      setFormData({ title: '', current_value: '', target_value: '', unit: '', frequency: 'Mensal' });
      loadData();

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao salvar KPI.", variant: "destructive" });
    }
  };

  const handleDeleteKpi = (id) => {
    if(!window.confirm("Excluir KPI?")) return;
    
    const allKpis = JSON.parse(localStorage.getItem('f3_kpis') || '[]');
    const updatedKpis = allKpis.filter(k => k.id !== id);
    localStorage.setItem('f3_kpis', JSON.stringify(updatedKpis));
    
    loadData();
    toast({ title: "Excluído" });
  };

  const handleFinishPhase = async () => {
    if (kpis.length === 0) {
      toast({ title: "Atenção", description: "Cadastre ao menos um KPI antes de concluir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Generate Report
      const reports = JSON.parse(localStorage.getItem('f3_reports') || '[]');
      const reportPayload = {
        id: crypto.randomUUID(),
        project_id: projectId,
        data: { kpis, summary: "Fase 3 concluída com sucesso." },
        generated_at: new Date().toISOString()
      };
      localStorage.setItem('f3_reports', JSON.stringify([...reports, reportPayload]));

      // 2. Update Phase
      const phases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const updatedPhases = phases.map(p => 
        (p.project_id === projectId && p.name === 'F3') 
          ? { ...p, status: 'concluido', progress: 100, updated_at: new Date().toISOString() } 
          : p
      );
      localStorage.setItem('f5_phases', JSON.stringify(updatedPhases));
      
      // 3. Update Context
      await updatePhaseStatus(projectId, 'F3', 'concluido');
      
      setIsFinished(true);
      toast({ title: "Fase F3 Concluída!", description: "Relatório gerado e fase F4 desbloqueada.", className: "bg-green-600 text-white" });
      setTimeout(() => navigate(`/metodologia-f5/projetos/${projectId}`), 1500);

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao concluir fase.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (current, target) => {
    const c = parseFloat(current);
    const t = parseFloat(target);
    if (!t) return 'off_track';
    const ratio = c / t;
    if (ratio >= 1) return 'on_track';
    if (ratio >= 0.8) return 'at_risk';
    return 'off_track';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'on_track': return <Badge className="bg-green-100 text-green-700 flex gap-1"><CheckCircle2 className="h-3 w-3"/> Na Meta</Badge>;
      case 'at_risk': return <Badge className="bg-yellow-100 text-yellow-700 flex gap-1"><AlertTriangle className="h-3 w-3"/> Atenção</Badge>;
      default: return <Badge className="bg-red-100 text-red-700 flex gap-1"><XCircle className="h-3 w-3"/> Crítico</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Helmet><title>F3 - Monitoramento | KPIs</title></Helmet>
      
      <PageHeader 
        title="F3 - Implementação e Monitoramento" 
        description="Acompanhamento de KPIs e resultados operacionais."
        showBack={true}
        backPath={`/metodologia-f5/projetos/${projectId}`}
        action={!isFinished && (
            <div className="flex gap-2">
                <Button onClick={() => { setEditingKpi(null); setFormData({}); setIsModalOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" /> Novo KPI
                </Button>
                <Button onClick={handleFinishPhase} variant="outline" className="gap-2 border-green-600 text-green-700 hover:bg-green-50">
                    <CheckCircle2 className="h-4 w-4" /> Concluir Fase
                </Button>
            </div>
        )}
      />

      {isFinished && (
        <div className="max-w-[1600px] mx-auto px-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-800">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="font-bold">Fase Concluída</p>
              <p className="text-sm">Os indicadores foram consolidados e o relatório gerado. Edições estão bloqueadas.</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto bg-white" onClick={() => navigate(`/metodologia-f5/relatorios`)}>
              <FileText className="h-4 w-4 mr-2" /> Ver Relatório
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 space-y-8">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                  <Card key={kpi.id} className="border-t-4 border-t-blue-500">
                      <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-medium text-slate-500 truncate" title={kpi.title}>{kpi.title}</p>
                              {getStatusBadge(kpi.status)}
                          </div>
                          <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-slate-800">{kpi.current_value}</span>
                              <span className="text-sm text-slate-400">{kpi.unit}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500 flex justify-between">
                              <span>Meta: {kpi.target_value}</span>
                              <span className="text-blue-600 font-medium">{kpi.frequency}</span>
                          </div>
                          {!isFinished && (
                              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                                  <button onClick={() => { setEditingKpi(kpi); setFormData(kpi); setIsModalOpen(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4"/></button>
                                  <button onClick={() => handleDeleteKpi(kpi.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                              </div>
                          )}
                      </CardContent>
                  </Card>
              ))}
              {kpis.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed text-slate-400">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Nenhum indicador cadastrado.</p>
                  </div>
              )}
          </div>

          {/* Charts */}
          {kpis.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader><CardTitle>Evolução Recente</CardTitle></CardHeader>
                      <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={historyData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="Mar" stroke="#3b82f6" name="Atual" strokeWidth={2} />
                                  <Line type="monotone" dataKey="Meta" stroke="#ef4444" strokeDasharray="5 5" />
                              </LineChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader><CardTitle>Comparativo Meta vs Realizado</CardTitle></CardHeader>
                      <CardContent className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={historyData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="Mar" fill="#3b82f6" name="Atual" radius={[4,4,0,0]} />
                                  <Bar dataKey="Meta" fill="#94a3b8" name="Meta" radius={[4,4,0,0]} />
                              </BarChart>
                          </ResponsiveContainer>
                      </CardContent>
                  </Card>
              </div>
          )}

          {/* Data Table */}
          <Card>
              <CardHeader><CardTitle>Detalhamento</CardTitle></CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Indicador</TableHead>
                              <TableHead>Unidade</TableHead>
                              <TableHead>Meta</TableHead>
                              <TableHead>Valor Atual</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Frequência</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {kpis.map((kpi) => (
                              <TableRow key={kpi.id}>
                                  <TableCell className="font-medium">{kpi.title}</TableCell>
                                  <TableCell>{kpi.unit}</TableCell>
                                  <TableCell>{kpi.target_value}</TableCell>
                                  <TableCell>{kpi.current_value}</TableCell>
                                  <TableCell>{getStatusBadge(kpi.status)}</TableCell>
                                  <TableCell>{kpi.frequency}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
              <DialogHeader><DialogTitle>{editingKpi ? 'Editar KPI' : 'Novo KPI'}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label>Nome do Indicador</Label>
                      <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Faturamento Mensal" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Valor Atual</Label>
                          <Input type="number" value={formData.current_value} onChange={e => setFormData({...formData, current_value: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                          <Label>Meta</Label>
                          <Input type="number" value={formData.target_value} onChange={e => setFormData({...formData, target_value: e.target.value})} />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Unidade</Label>
                          <Input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Ex: R$, %, un" />
                      </div>
                      <div className="space-y-2">
                          <Label>Frequência</Label>
                          <Select value={formData.frequency} onValueChange={v => setFormData({...formData, frequency: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Semanal">Semanal</SelectItem>
                                  <SelectItem value="Mensal">Mensal</SelectItem>
                                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSaveKpi}>Salvar</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default F3Monitoring;