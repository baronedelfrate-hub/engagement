import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { F5Service } from '@/lib/f5_service';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckCircle2, 
  Lock, 
  Search, 
  Settings, 
  BarChart2, 
  PieChart, 
  ShieldCheck, 
  ArrowRight,
  Save,
} from 'lucide-react';

const PHASES = [
  { id: 1, code: 'F1', title: 'Diagnóstico', icon: Search, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 2, code: 'F2', title: 'Estruturação', icon: Settings, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 3, code: 'F3', title: 'Acompanhamento', icon: BarChart2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 4, code: 'F4', title: 'Planejamento', icon: PieChart, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 5, code: 'F5', title: 'Governança', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
];

const F5Metodologia = () => {
  const { toast } = useToast();
  const [state, setState] = useState(null);
  const [activePhase, setActivePhase] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Form Data States
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const appState = F5Service.getState();
    setState(appState);
    
    // Determine active phase: prioritize currentPhase from state
    const phaseToLoad = appState.currentPhase || 1;
    setActivePhase(phaseToLoad);
    
    // Load data for current phase
    const currentData = F5Service.getPhaseData(phaseToLoad);
    
    // Special Logic: If loading F2, verify if we can pull F1 cadastral data
    if (phaseToLoad === 2) {
        const f1Data = F5Service.getPhaseData(1);
        if (f1Data) {
            // Pre-fill F2 fields with F1 data if F2 fields are empty
            if (!currentData.empresa_nome && f1Data.razao_social) currentData.empresa_nome = f1Data.razao_social;
            if (!currentData.cnpj && f1Data.cnpj) currentData.cnpj = f1Data.cnpj;
            if (!currentData.email_contato && f1Data.email_contato) currentData.email_contato = f1Data.email_contato;
            if (!currentData.resp_financeiro && f1Data.responsavel_diagnostico) currentData.resp_financeiro = f1Data.responsavel_diagnostico;
        }
    }

    setFormData(currentData);
    
    setLoading(false);
  };

  const handleTabChange = (value) => {
    const phaseId = parseInt(value);
    
    // Strict Guard: Prevent jumping to locked phases
    if (!state.phases[phaseId].unlocked) {
      toast({
        title: "Fase Bloqueada 🔒",
        description: "Complete a fase anterior para desbloquear esta etapa.",
        variant: "destructive"
      });
      return;
    }

    setActivePhase(phaseId);
    
    // Load data specific for the tab we are switching to
    let data = F5Service.getPhaseData(phaseId);

    // AUTO-FILL LOGIC WHEN SWITCHING TABS
    if (phaseId === 2) {
        const f1Data = F5Service.getPhaseData(1);
        // Only autofill if F2 data is missing
        if (f1Data) {
            data = {
                ...data,
                empresa_nome: data.empresa_nome || f1Data.razao_social,
                cnpj: data.cnpj || f1Data.cnpj,
                email_contato: data.email_contato || f1Data.email_contato,
                resp_financeiro: data.resp_financeiro || f1Data.responsavel_diagnostico
            };
        }
    }

    setFormData(data || {});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = () => {
    F5Service.savePhaseData(activePhase, formData);
    toast({
      title: "Rascunho Salvo",
      description: "Seus dados foram armazenados localmente.",
    });
  };

  const handleCompletePhase = () => {
    // Validation Logic
    const requiredFields = getRequiredFields(activePhase);
    const missing = requiredFields.filter(f => !formData[f] || (Array.isArray(formData[f]) && formData[f].length === 0));
    
    if (missing.length > 0) {
      toast({
        title: "Campos Obrigatórios",
        description: `Preencha: ${missing.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Save current data
    F5Service.savePhaseData(activePhase, formData);
    F5Service.generateReport(activePhase);
    
    // Update global state to unlock next phase
    const newState = F5Service.completePhase(activePhase);
    setState(newState);
    
    toast({
      title: `Fase ${PHASES[activePhase-1].code} Concluída! 🎉`,
      description: "Relatório gerado e próxima fase desbloqueada.",
      className: "bg-green-600 text-white border-none"
    });

    // Auto move to next phase if available
    if (activePhase < 5) {
      setTimeout(() => {
        handleTabChange((activePhase + 1).toString());
      }, 1500);
    }
  };

  const getRequiredFields = (phase) => {
    switch(phase) {
      // F1 is handled by DiagnosticoF1.jsx primarily, but this is for F5Metodologia standalone form use
      case 1: return ['empresa_nome', 'cnpj', 'resumo_atual']; 
      // Validation for F2: ERP is mandatory. Checklist items are encouraged but not strictly blocking if at least one is done.
      case 2: return ['erp_utilizado', 'resp_financeiro']; 
      case 3: return ['kpis_principais'];
      case 4: return ['meta_anual'];
      case 5: return ['conselho_formado'];
      default: return [];
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <Helmet><title>Metodologia F5 | Execução</title></Helmet>
      
      <PageHeader 
        title="Execução da Metodologia F5" 
        description="Jornada estruturada de transformação empresarial: do Diagnóstico à Governança."
      />

      {/* Progress Overview */}
      <div className="mb-8 bg-white p-6 rounded-xl border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800">Progresso da Jornada</h3>
          <span className="text-sm text-slate-500">Fase {activePhase} de 5</span>
        </div>
        <div className="relative pt-4 pb-8">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0" />
          <div className="relative z-10 flex justify-between w-full">
            {PHASES.map((phase) => {
              const isCompleted = state.phases[phase.id].status === 'completed';
              const isCurrent = activePhase === phase.id;
              const isLocked = !state.phases[phase.id].unlocked;
              
              return (
                <div key={phase.id} className="flex flex-col items-center gap-2">
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                        isCurrent ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg ring-4 ring-blue-100' : 
                        'bg-white border-slate-200 text-slate-300'}
                    `}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : 
                     isLocked ? <Lock className="h-4 w-4" /> : 
                     <span className="font-bold">{phase.id}</span>}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? 'text-blue-600' : 'text-slate-400'}`}>
                    {phase.code}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3">
          <div className="sticky top-6 space-y-2">
            {PHASES.map((phase) => (
              <button
                key={phase.id}
                onClick={() => handleTabChange(phase.id.toString())}
                disabled={!state.phases[phase.id].unlocked}
                className={`
                  w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all
                  ${activePhase === phase.id 
                    ? `bg-white shadow-md border-l-4 ${phase.border.replace('border-', 'border-l-')} ${phase.color}` 
                    : 'hover:bg-slate-50 text-slate-500'}
                  ${!state.phases[phase.id].unlocked && 'opacity-50 cursor-not-allowed'}
                `}
              >
                <phase.icon className="h-5 w-5" />
                <div className="flex-1">
                  <span className="block text-sm font-bold">{phase.title}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-70">
                    {state.phases[phase.id].status === 'completed' ? 'Concluído' : 
                     state.phases[phase.id].status === 'in_progress' ? 'Em Andamento' : 'Bloqueado'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Content Area */}
        <div className="lg:col-span-9">
          <Tabs value={activePhase.toString()} onValueChange={(val) => handleTabChange(val)} className="w-full">
            <AnimatePresence mode="wait">
              {PHASES.map((phase) => (
                <TabsContent key={phase.id} value={phase.id.toString()}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-t-4" style={{ borderTopColor: activePhase === phase.id ? '#3b82f6' : 'transparent' }}>
                      <CardHeader className={`${phase.bg} border-b ${phase.border}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className={`mb-2 bg-white ${phase.color} ${phase.border}`}>{phase.code}</Badge>
                            <CardTitle className="text-2xl">{phase.title}</CardTitle>
                            <CardDescription>Preencha as informações para avançar na metodologia.</CardDescription>
                          </div>
                          <phase.icon className={`h-12 w-12 opacity-10 ${phase.color}`} />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-6 md:p-8 space-y-6">
                        {/* PHASE 1: DIAGNÓSTICO */}
                        {phase.id === 1 && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label>Nome da Empresa *</Label>
                                <Input 
                                  value={formData.empresa_nome || ''} 
                                  onChange={(e) => handleInputChange('empresa_nome', e.target.value)}
                                  placeholder="Razão Social" 
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>CNPJ *</Label>
                                <Input 
                                  value={formData.cnpj || ''} 
                                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                                  placeholder="00.000.000/0000-00" 
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Resumo da Situação Atual *</Label>
                              <Textarea 
                                value={formData.resumo_atual || ''} 
                                onChange={(e) => handleInputChange('resumo_atual', e.target.value)}
                                placeholder="Descreva brevemente as principais dores e desafios atuais..." 
                                className="h-32" 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Maturidade Financeira Percebida (1-10)</Label>
                              <Input 
                                type="range" min="1" max="10" 
                                value={formData.maturidade || 5}
                                onChange={(e) => handleInputChange('maturidade', e.target.value)}
                              />
                              <div className="flex justify-between text-xs text-slate-500">
                                <span>Caótica (1)</span>
                                <span>Organizada (10)</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PHASE 2: ESTRUTURAÇÃO */}
                        {phase.id === 2 && (
                          <div className="space-y-6">
                             {/* Auto-filled Info Alert */}
                             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                 <div className="p-2 bg-blue-100 rounded-full text-blue-600 mt-1">
                                     <Settings className="h-4 w-4" />
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-blue-900 text-sm">Dados Importados de F1</h4>
                                     <p className="text-xs text-blue-700 mt-1">
                                         Os dados cadastrais foram trazidos automaticamente do Diagnóstico F1 para agilizar o processo.
                                     </p>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label>Empresa (F1)</Label>
                                  <Input 
                                    value={formData.empresa_nome || ''} 
                                    readOnly 
                                    className="bg-slate-50"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>CNPJ (F1)</Label>
                                  <Input 
                                    value={formData.cnpj || ''} 
                                    readOnly 
                                    className="bg-slate-50"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Responsável (F1) *</Label>
                                  <Input 
                                    value={formData.resp_financeiro || ''} 
                                    onChange={(e) => handleInputChange('resp_financeiro', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Email Contato (F1)</Label>
                                  <Input 
                                    value={formData.email_contato || ''} 
                                    onChange={(e) => handleInputChange('email_contato', e.target.value)}
                                  />
                                </div>
                             </div>

                             <div className="border-t border-slate-100 my-4 pt-4">
                                 <h4 className="font-bold text-lg mb-4 text-slate-700">Definições da Fase 2</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <Label>ERP Utilizado *</Label>
                                      <Input 
                                        value={formData.erp_utilizado || ''} 
                                        onChange={(e) => handleInputChange('erp_utilizado', e.target.value)}
                                        placeholder="Ex: Tiny, Bling, Omie..." 
                                      />
                                    </div>
                                 </div>
                             </div>

                             <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                <Label className="block mb-2 font-bold">Checklist de Estruturação (Opcional)</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {['Plano de Contas Definido', 'Conciliação Bancária Ativa', 'Contas a Pagar Organizado', 'Contas a Receber Organizado'].map((item, i) => (
                                    <div key={i} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={`check-${i}`} 
                                        checked={formData.processos_mapeados?.includes(item)}
                                        onCheckedChange={(checked) => {
                                           const current = formData.processos_mapeados || [];
                                           const updated = checked 
                                             ? [...current, item] 
                                             : current.filter(x => x !== item);
                                           handleInputChange('processos_mapeados', updated);
                                        }}
                                      />
                                      <label htmlFor={`check-${i}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {item}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                             </div>
                          </div>
                        )}

                        {/* PHASE 3: ACOMPANHAMENTO */}
                        {phase.id === 3 && (
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <Label>Principais KPIs Definidos *</Label>
                                <Textarea 
                                  value={formData.kpis_principais || ''} 
                                  onChange={(e) => handleInputChange('kpis_principais', e.target.value)}
                                  placeholder="Liste os indicadores que serão acompanhados mensalmente..." 
                                />
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label>Data de Fechamento Mensal</Label>
                                  <Input type="number" placeholder="Dia (ex: 5)" value={formData.dia_fechamento} onChange={(e) => handleInputChange('dia_fechamento', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Frequência de Reuniões</Label>
                                  <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.freq_reuniao}
                                    onChange={(e) => handleInputChange('freq_reuniao', e.target.value)}
                                  >
                                    <option value="">Selecione...</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="quinzenal">Quinzenal</option>
                                    <option value="mensal">Mensal</option>
                                  </select>
                                </div>
                             </div>
                          </div>
                        )}

                        {/* PHASE 4: PLANEJAMENTO */}
                        {phase.id === 4 && (
                          <div className="space-y-6">
                             <div className="space-y-2">
                                <Label>Meta de Faturamento Anual (R$) *</Label>
                                <Input 
                                  type="number"
                                  value={formData.meta_anual || ''} 
                                  onChange={(e) => handleInputChange('meta_anual', e.target.value)}
                                />
                             </div>
                             <div className="space-y-2">
                                <Label>Estratégia de Crescimento</Label>
                                <Textarea 
                                  value={formData.estrategia || ''} 
                                  onChange={(e) => handleInputChange('estrategia', e.target.value)}
                                  placeholder="Descreva a estratégia macro (ex: expansão de vendas, novos produtos, M&A)..." 
                                  className="h-32"
                                />
                             </div>
                             <div className="flex items-center space-x-2 mt-4">
                                <Checkbox 
                                  id="orcamento-check"
                                  checked={formData.orcamento_aprovado}
                                  onCheckedChange={(c) => handleInputChange('orcamento_aprovado', c)}
                                />
                                <Label htmlFor="orcamento-check">Orçamento Base Zero (OBZ) Aprovado?</Label>
                             </div>
                          </div>
                        )}

                        {/* PHASE 5: GOVERNANÇA */}
                        {phase.id === 5 && (
                           <div className="space-y-6">
                              <div className="space-y-2">
                                <Label>Composição do Conselho Consultivo *</Label>
                                <Input 
                                  value={formData.conselho_formado || ''} 
                                  onChange={(e) => handleInputChange('conselho_formado', e.target.value)}
                                  placeholder="Nomes dos conselheiros..." 
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Auditoria Externa</Label>
                                <Input 
                                  value={formData.auditoria || ''} 
                                  onChange={(e) => handleInputChange('auditoria', e.target.value)}
                                  placeholder="Empresa responsável (se houver)" 
                                />
                              </div>
                              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 mt-4">
                                 <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                   <ShieldCheck className="h-4 w-4"/> Certificação F5
                                 </h4>
                                 <p className="text-sm text-purple-700">
                                   Ao concluir esta etapa, sua empresa estará elegível para receber o selo de governança Engagement Consulting.
                                 </p>
                              </div>
                           </div>
                        )}

                      </CardContent>

                      <CardFooter className="bg-slate-50 border-t flex justify-between p-6 rounded-b-xl">
                        <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
                          <Save className="h-4 w-4" /> Salvar Rascunho
                        </Button>
                        <Button 
                          onClick={handleCompletePhase} 
                          disabled={state.phases[phase.id].status === 'completed'}
                          className={`${state.phases[phase.id].status === 'completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'} text-white gap-2`}
                        >
                          {state.phases[phase.id].status === 'completed' ? (
                            <>
                               <CheckCircle2 className="h-4 w-4" /> Fase Concluída
                            </>
                          ) : (
                            <>
                               Concluir Fase & Gerar Relatório <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                </TabsContent>
              ))}
            </AnimatePresence>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default F5Metodologia;