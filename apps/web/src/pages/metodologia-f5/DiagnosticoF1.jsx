import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { toast } from '@/components/ui/use-toast';
import { FORM_SECTIONS, SCORING_OPTIONS, MATURITY_LEVELS } from './f1Data';
import { F5Service } from '@/lib/f5_service';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, FileText, History, CheckCircle2, ChevronRight, AlertCircle, Printer, ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const DiagnosticoF1 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(FORM_SECTIONS[0].id);
  const [formData, setFormData] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load Initial Data
  useEffect(() => {
    loadDiagnosis();
  }, [id]);

  const loadDiagnosis = () => {
    setLoading(true);
    try {
      const allData = JSON.parse(localStorage.getItem('f5_diagnosticos') || '{}');
      if (id && allData[id]) {
        setFormData(allData[id].data || {});
        if (allData[id].finished) setShowResult(true);
      } else {
        setFormData({});
        setShowResult(false);
      }
    } catch (error) {
      console.error("Error loading diagnosis", error);
    } finally {
      setLoading(false);
    }
  };

  // Field Handlers
  const handleInputChange = (sectionId, fieldId, value) => {
    let formattedValue = value;
    
    // CNPJ Mask & Validation Logic (Simple check)
    if (fieldId === 'cnpj') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
    }
    
    // Phone Mask
    if (fieldId === 'telefone') {
        formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 15);
    }

    setFormData(prev => ({
      ...prev,
      [fieldId]: formattedValue
    }));
  };

  // Score Calculation
  const result = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;
    
    FORM_SECTIONS.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === 'score') {
          maxScore += 5;
          const val = parseInt(formData[field.id]);
          if (!isNaN(val)) {
            totalScore += val;
          }
        }
      });
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const maturity = MATURITY_LEVELS.find(l => percentage <= l.maxPercent) || MATURITY_LEVELS[MATURITY_LEVELS.length - 1];

    return { totalScore, maxScore, percentage, maturity };
  }, [formData]);

  // Actions
  const handleSave = (finished = false) => {
    if (finished && !formData.cnpj) {
      toast({ title: "Erro de Validação", description: "O CNPJ é obrigatório para finalizar.", variant: "destructive" });
      return;
    }
    
    if (finished && formData.cnpj && formData.cnpj.length < 18) {
       toast({ title: "CNPJ Inválido", description: "Verifique o formato do CNPJ.", variant: "destructive" });
       return;
    }

    const diagnosisId = id || crypto.randomUUID();
    const allData = JSON.parse(localStorage.getItem('f5_diagnosticos') || '{}');
    
    const saveData = {
      id: diagnosisId,
      data: formData,
      updatedAt: new Date().toISOString(),
      companyName: formData.razao_social || 'Nova Empresa',
      score: result.percentage,
      maturity: result.maturity.label,
      finished
    };

    allData[diagnosisId] = saveData;
    localStorage.setItem('f5_diagnosticos', JSON.stringify(allData));

    // CRITICAL: Update Global F5 State to unlock F2
    if (finished) {
        F5Service.completePhase(1);
        F5Service.savePhaseData(1, formData); // Backup to phase slot
    }
    
    // If it's a new item, redirect to the edit URL so refresh doesn't lose context
    if (!id) {
       navigate(`/metodologia-f5/diagnostico-f1/${diagnosisId}`, { replace: true });
    }

    if (finished) {
      // Redirect to report instead of just showing inline result
      toast({ 
        title: "Diagnóstico Finalizado! 🚀", 
        description: "Fase 2 desbloqueada. Redirecionando para relatório...",
        className: "bg-green-600 text-white border-none"
      });
      setTimeout(() => {
        navigate(`/metodologia-f5/relatorio-f1/${diagnosisId}`);
      }, 1000);
    } else {
      toast({ title: "Rascunho Salvo", description: "Seus dados foram salvos com sucesso." });
    }
  };

  const renderField = (field) => {
    const value = formData[field.id] || '';
    
    if (field.type === 'score') {
      return (
        <div key={field.id} className="space-y-3 pt-4 pb-6 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 p-4 rounded-lg transition-colors">
          <Label className="text-base font-semibold text-slate-800 block mb-3 leading-snug">{field.label}</Label>
          <RadioGroup 
            value={value.toString()} 
            onValueChange={(val) => handleInputChange(null, field.id, val)}
            className="flex flex-wrap gap-2"
          >
            {SCORING_OPTIONS.map(opt => (
              <div key={opt.value} className="flex-1 min-w-[100px]">
                 <RadioGroupItem value={opt.value.toString()} id={`${field.id}-${opt.value}`} className="peer sr-only" />
                 <Label 
                   htmlFor={`${field.id}-${opt.value}`}
                   className={`
                     flex flex-col items-center justify-center text-center h-full px-2 py-3 rounded-lg border-2 cursor-pointer transition-all
                     peer-data-[state=checked]:bg-[#FF7A00] peer-data-[state=checked]:text-white peer-data-[state=checked]:border-[#FF7A00]
                     peer-data-[state=checked]:shadow-md
                     hover:bg-orange-50 hover:border-orange-200 border-slate-200 text-slate-600 font-medium text-sm
                   `}
                 >
                   <span className="text-lg font-bold mb-1">{opt.value}</span>
                   <span className="text-[10px] uppercase tracking-wide">{opt.label.split('- ')[1]}</span>
                 </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.id} className={`${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
          <Label className="mb-2 block font-medium">{field.label}</Label>
          <Select value={value} onValueChange={(val) => handleInputChange(null, field.id, val)}>
            <SelectTrigger className="border-slate-300 focus:ring-[#FF7A00]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={field.id} className={`${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
        <Label htmlFor={field.id} className="mb-2 block font-medium">{field.label}</Label>
        <Input 
          id={field.id} 
          value={value} 
          onChange={(e) => handleInputChange(null, field.id, e.target.value)} 
          className="focus-visible:ring-[#FF7A00] border-slate-300"
          placeholder={field.type === 'money' ? 'R$ 0,00' : ''}
          type={field.type === 'number' ? 'number' : 'text'}
        />
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-[#FF7A00] border-t-transparent rounded-full"></div></div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-12 animate-in fade-in duration-500">
      <Helmet><title>Diagnóstico F1 | F5 Methodology</title></Helmet>
      
      <PageHeader 
        title="Diagnóstico F1 Completo" 
        description="Avaliação de Maturidade Empresarial em 11 Dimensões"
        icon={FileText}
        showBack={true}
        backPath="/metodologia-f5/historico-f1"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/metodologia-f5/historico-f1')} className="gap-2">
              <History className="h-4 w-4" /> Histórico
            </Button>
            <Button variant="secondary" onClick={() => handleSave(false)} className="gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800">
              <Save className="h-4 w-4" /> Salvar Rascunho
            </Button>
            <Button onClick={() => handleSave(true)} className="gap-2 bg-[#FF7A00] hover:bg-orange-600 text-white shadow-lg shadow-orange-200">
              Gerar Relatório <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
           <Card className="border-0 shadow-lg bg-slate-900 text-slate-100 sticky top-4 overflow-hidden">
              <CardHeader className="pb-4 bg-slate-950/50">
                 <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#FF7A00]" /> Etapas
                 </CardTitle>
                 <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Score em Tempo Real</span>
                        <span className="text-[#FF7A00] font-bold">{result.percentage}%</span>
                    </div>
                    <Progress value={result.percentage} className="h-2 bg-slate-800" indicatorClassName="bg-[#FF7A00]" />
                    <div className="text-xs text-center pt-1 text-slate-500 font-medium">
                        Nível: <span className={result.maturity.color.replace('text-', 'text-')}>{result.maturity.label}</span>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="flex flex-col">
                       {FORM_SECTIONS.map((section, idx) => {
                          const Icon = section.icon;
                          const isActive = activeSection === section.id;
                          return (
                             <button
                                key={section.id}
                                onClick={() => { setActiveSection(section.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className={`
                                   flex items-center gap-3 px-4 py-4 text-sm font-medium transition-all border-l-4 text-left group
                                   ${isActive 
                                      ? 'bg-slate-800 border-[#FF7A00] text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]' 
                                      : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                                `}
                             >
                                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border ${isActive ? 'border-[#FF7A00] text-[#FF7A00]' : 'border-slate-600 text-slate-600 group-hover:border-slate-400'}`}>
                                    {idx + 1}
                                </span>
                                {section.title.split('. ')[1]}
                             </button>
                          );
                       })}
                    </div>
                 </ScrollArea>
              </CardContent>
           </Card>
        </div>

        {/* Main Form Area */}
        <div className="lg:col-span-9 space-y-6">
           {FORM_SECTIONS.map((section) => (
             <Card 
               key={section.id} 
               id={section.id}
               className={`shadow-md border-t-4 transition-all duration-300 ${activeSection === section.id ? 'opacity-100 translate-x-0' : 'hidden translate-x-10'}`}
               style={{ borderTopColor: '#FF7A00' }}
             >
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white pb-6 border-b border-slate-100">
                   <CardTitle className="flex items-center gap-3 text-slate-800 text-2xl">
                      <div className="p-3 bg-orange-100 rounded-xl shadow-sm">
                         <section.icon className="h-8 w-8 text-[#FF7A00]" />
                      </div>
                      {section.title}
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8 bg-white">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      {section.fields.map(renderField)}
                   </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between">
                    <Button variant="ghost" disabled={section.id === FORM_SECTIONS[0].id} onClick={() => {
                        const idx = FORM_SECTIONS.findIndex(s => s.id === section.id);
                        if(idx > 0) setActiveSection(FORM_SECTIONS[idx-1].id);
                    }} className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                    </Button>
                    <Button onClick={() => {
                        const idx = FORM_SECTIONS.findIndex(s => s.id === section.id);
                        if(idx < FORM_SECTIONS.length - 1) {
                            setActiveSection(FORM_SECTIONS[idx+1].id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                        else handleSave(true);
                    }} className="bg-slate-900 text-white hover:bg-slate-800 px-8">
                        {section.id === FORM_SECTIONS[FORM_SECTIONS.length - 1].id ? 'Finalizar Diagnóstico' : 'Próximo Passo'}
                    </Button>
                </CardFooter>
             </Card>
           ))}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticoF1;