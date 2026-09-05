import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Printer, ChevronLeft, ArrowRight, Building2, TrendingUp, AlertTriangle, CheckCircle2, Target, BarChart, ShieldAlert, Zap } from 'lucide-react';
import { FORM_SECTIONS } from './f1Data';

const RelatorioF1 = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const allData = JSON.parse(localStorage.getItem('f5_diagnosticos') || '{}');
    if (id && allData[id]) {
        setData(allData[id]);
    }
  }, [id]);

  if (!data) return <div className="p-10 text-center">Carregando relatório...</div>;

  const { companyName, score, maturity, data: formData } = data;

  // Helper to calculate score per section
  const calculateSectionScore = (sectionId) => {
    const section = FORM_SECTIONS.find(s => s.id === sectionId);
    if (!section) return 0;
    
    let total = 0;
    let max = 0;
    section.fields.filter(f => f.type === 'score').forEach(field => {
        max += 5;
        total += parseInt(formData[field.id] || 0);
    });
    
    return max > 0 ? Math.round((total / max) * 100) : 0;
  };

  const sectionScores = {
      estrutura: calculateSectionScore('estrutura'),
      faturamento: calculateSectionScore('faturamento'),
      fluxos: calculateSectionScore('fluxos'),
      controles: calculateSectionScore('controles'),
      ferramentas: calculateSectionScore('ferramentas'),
      indicadores: calculateSectionScore('indicadores'),
  };
  
  // Derived/Mocked dimensions to match the requested 11 dimensions visual
  // Since we only have 6 score sections, we map or duplicate for visual completeness as requested
  const dimensions = [
      { label: 'Estrutura Organizacional', value: sectionScores.estrutura, icon: Building2 },
      { label: 'Faturamento', value: sectionScores.faturamento, icon: Zap },
      { label: 'Fluxos Financeiros', value: sectionScores.fluxos, icon: TrendingUp },
      { label: 'Controles Internos', value: sectionScores.controles, icon: ShieldAlert },
      { label: 'Ferramentas', value: sectionScores.ferramentas, icon: BarChart },
      { label: 'Indicadores', value: sectionScores.indicadores, icon: Target },
      // Derived dimensions
      { label: 'Gestão de Riscos', value: Math.round((sectionScores.controles + sectionScores.fluxos) / 2), icon: AlertTriangle },
      { label: 'Pontos Críticos', value: Math.round(100 - score), icon: AlertTriangle }, // Inverse of score for criticality
      { label: 'Auto-Avaliação', value: score, icon: CheckCircle2 }, // Overall score
      { label: 'Cultura de Dados', value: sectionScores.indicadores, icon: BarChart },
      { label: 'Compliance', value: sectionScores.controles, icon: ShieldAlert }
  ];

  const getRiskLevel = (val) => {
      if (val < 40) return { label: 'ALTO', color: 'bg-red-100 text-red-700' };
      if (val < 70) return { label: 'MÉDIO', color: 'bg-yellow-100 text-yellow-700' };
      return { label: 'BAIXO', color: 'bg-green-100 text-green-700' };
  };

  const risks = [
      { title: 'FISCAL', score: sectionScores.controles },
      { title: 'FINANCEIRO', score: sectionScores.fluxos },
      { title: 'OPERACIONAL', score: sectionScores.ferramentas },
      { title: 'ESTRATÉGICO', score: sectionScores.indicadores },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 print:bg-white">
      <Helmet><title>Relatório F1 - {companyName}</title></Helmet>

      {/* Top Bar (No Print) */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center print:hidden sticky top-0 z-50 shadow-sm">
         <Button variant="ghost" onClick={() => navigate('/metodologia-f5/historico-f1')} className="gap-2 text-slate-600">
            <ChevronLeft className="h-4 w-4" /> Voltar
         </Button>
         <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button onClick={() => navigate('/f5-metodologia')} className="gap-2 bg-[#FF7A00] hover:bg-orange-600 text-white border-none">
                Ir para Fase 2: Estruturação <ArrowRight className="h-4 w-4" />
            </Button>
         </div>
      </div>

      <div className="max-w-[1100px] mx-auto bg-white shadow-2xl my-8 print:shadow-none print:my-0 print:w-full">
         
         {/* HEADER */}
         <header className="bg-[#0F172A] text-white p-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
             <div className="relative z-10 flex justify-between items-start">
                 <div>
                     <h1 className="text-4xl font-bold mb-2 tracking-tight">Diagnóstico Empresarial F1</h1>
                     <div className="flex gap-4 text-slate-400 text-sm mt-4">
                         <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {companyName}</span>
                         <span>|</span>
                         <span>{new Date(data.updatedAt).toLocaleDateString()}</span>
                         <span>|</span>
                         <span>ID: {id.split('-')[0].toUpperCase()}</span>
                     </div>
                 </div>
                 <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-4 min-w-[200px] text-center">
                     <span className="text-[10px] uppercase tracking-widest text-slate-400 block mb-1">Maturidade Geral</span>
                     <span className={`text-4xl font-bold ${score >= 50 ? 'text-[#FF7A00]' : 'text-red-500'}`}>{score}%</span>
                 </div>
             </div>
         </header>

         <main className="p-12 space-y-16">
             
             {/* 1. IDENTIFICAÇÃO */}
             <section>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
                     1. Identificação da Empresa
                 </h3>
                 <div className="grid grid-cols-4 gap-8">
                     <div>
                         <span className="text-xs text-slate-500 uppercase block mb-1">Razão Social</span>
                         <span className="font-semibold text-slate-900">{formData.razao_social || companyName}</span>
                     </div>
                     <div>
                         <span className="text-xs text-slate-500 uppercase block mb-1">CNPJ</span>
                         <span className="font-semibold text-slate-900">{formData.cnpj || '-'}</span>
                     </div>
                     <div>
                         <span className="text-xs text-slate-500 uppercase block mb-1">Segmento</span>
                         <span className="font-semibold text-slate-900">{formData.cnae || '-'}</span>
                     </div>
                     <div>
                         <span className="text-xs text-slate-500 uppercase block mb-1">Porte</span>
                         <span className="font-semibold text-slate-900">{formData.funcionarios ? `${formData.funcionarios} Colab.` : '-'}</span>
                     </div>
                 </div>
             </section>

             {/* 2. MATURIDADE */}
             <section className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                 <div className="flex flex-col md:flex-row gap-12 items-center">
                     {/* Donut Chart */}
                     <div className="relative w-48 h-48 shrink-0">
                         <svg className="w-full h-full transform -rotate-90">
                             <circle cx="96" cy="96" r="80" stroke="#E2E8F0" strokeWidth="16" fill="transparent" />
                             <circle cx="96" cy="96" r="80" stroke={score >= 50 ? '#FF7A00' : '#EF4444'} strokeWidth="16" fill="transparent" 
                                     strokeDasharray={502} 
                                     strokeDashoffset={502 - (502 * score) / 100} 
                                     className="transition-all duration-1000 ease-out"
                             />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                             <span className={`text-5xl font-bold ${score >= 50 ? 'text-[#FF7A00]' : 'text-red-600'}`}>{score}%</span>
                             <span className="text-xs text-slate-400 uppercase mt-1">Score</span>
                         </div>
                     </div>

                     {/* Description */}
                     <div className="flex-1">
                         <h4 className="text-2xl font-bold mb-2 text-slate-900">
                             Nível: <span className={score >= 50 ? 'text-[#FF7A00]' : 'text-red-600'}>{maturity}</span>
                         </h4>
                         <p className="text-slate-600 mb-6 leading-relaxed">
                             {score < 40 ? 
                                 "A empresa corre sérios riscos de continuidade. A gestão é baseada no 'feeling' e há mistura patrimonial. É urgente a profissionalização dos controles básicos." :
                                 score < 70 ?
                                 "A empresa possui controles básicos, mas a gestão ainda é reativa. É necessário estruturar processos e implementar análise de indicadores para crescimento sustentável." :
                                 "A empresa apresenta boa estrutura de gestão e governança. O foco agora deve ser em otimização, estratégia de longo prazo e inovação."
                             }
                         </p>
                         
                         <div className="grid grid-cols-3 gap-4">
                             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                                 <span className="block text-2xl font-bold text-green-600">0</span>
                                 <span className="text-[10px] uppercase text-slate-400 font-bold">Fortes</span>
                             </div>
                             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                                 <span className="block text-2xl font-bold text-yellow-600">2</span>
                                 <span className="text-[10px] uppercase text-slate-400 font-bold">Atenção</span>
                             </div>
                             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                                 <span className="block text-2xl font-bold text-red-600">1</span>
                                 <span className="text-[10px] uppercase text-slate-400 font-bold">Críticos</span>
                             </div>
                         </div>
                     </div>
                 </div>
             </section>

             {/* 3. PERFORMANCE POR ÁREA */}
             <section>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-8 border-b border-slate-200 pb-2">
                     3. Performance por Área (11 Dimensões)
                 </h3>
                 <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                     {dimensions.map((dim, idx) => (
                         <div key={idx} className="group">
                             <div className="flex justify-between text-sm mb-2 font-medium text-slate-700">
                                 <div className="flex items-center gap-2">
                                     <dim.icon className="h-4 w-4 text-slate-400" />
                                     {dim.label}
                                 </div>
                                 <span className={dim.value < 50 ? 'text-red-500' : 'text-[#FF7A00]'}>{dim.value}%</span>
                             </div>
                             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div 
                                     className={`h-full rounded-full transition-all duration-1000 ${dim.value < 50 ? 'bg-red-500' : 'bg-[#FF7A00]'}`} 
                                     style={{ width: `${dim.value}%` }}
                                 ></div>
                             </div>
                         </div>
                     ))}
                 </div>
             </section>
         </main>

         {/* 4. RECOMENDAÇÕES */}
         <section className="bg-[#0F172A] text-white p-12">
             <div className="flex items-center gap-3 mb-8">
                 <div className="p-2 bg-[#FF7A00] rounded-lg text-white">
                     <Target className="h-6 w-6" />
                 </div>
                 <h3 className="text-xl font-bold">Recomendações Metodologia F5</h3>
             </div>
             
             <div className="grid grid-cols-2 gap-6">
                 <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
                     <h4 className="text-[#FF7A00] font-bold mb-2 uppercase text-sm">F2 - Reestruturação</h4>
                     <p className="text-slate-300 text-sm mb-4 min-h-[40px]">Saneamento de dados, BPO Financeiro e organização de processos básicos.</p>
                     <ul className="text-xs text-slate-400 space-y-2">
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Organizar Contas a Pagar/Receber</li>
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Conciliação Bancária Diária</li>
                     </ul>
                 </div>

                 <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
                     <h4 className="text-[#FF7A00] font-bold mb-2 uppercase text-sm">F3 - Controladoria</h4>
                     <p className="text-slate-300 text-sm mb-4 min-h-[40px]">Implantação de DRE, Fluxo de Caixa e análise de indicadores.</p>
                     <ul className="text-xs text-slate-400 space-y-2">
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Implantar DRE Gerencial</li>
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Definir Centro de Custos</li>
                     </ul>
                 </div>

                 <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
                     <h4 className="text-[#FF7A00] font-bold mb-2 uppercase text-sm">F4 - Planejamento</h4>
                     <p className="text-slate-300 text-sm mb-4 min-h-[40px]">Orçamento Base Zero (OBZ), Forecast e planejamento estratégico.</p>
                     <ul className="text-xs text-slate-400 space-y-2">
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Orçamento Anual (Budget)</li>
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Gestão de Metas (OKRs)</li>
                     </ul>
                 </div>

                 <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
                     <h4 className="text-[#FF7A00] font-bold mb-2 uppercase text-sm">F5 - Estratégia & M&A</h4>
                     <p className="text-slate-300 text-sm mb-4 min-h-[40px]">Governança corporativa, Valuation e preparação para fusões/aquisições.</p>
                     <ul className="text-xs text-slate-400 space-y-2">
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Conselho Consultivo</li>
                         <li className="flex gap-2"><ArrowRight className="h-3 w-3 mt-0.5 text-[#FF7A00]" /> Auditoria Externa</li>
                     </ul>
                 </div>
             </div>
         </section>

         <div className="p-12 pb-24">
             {/* 5. MATRIZ DE RISCOS */}
             <section>
                 <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-8 border-b border-slate-200 pb-2">
                     5. Matriz de Riscos
                 </h3>
                 <div className="grid grid-cols-4 gap-6">
                     {risks.map((risk, idx) => {
                         const level = getRiskLevel(risk.score);
                         return (
                             <div key={idx} className="border border-slate-200 rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{risk.title}</h4>
                                 <div className={`inline-block px-4 py-1 rounded text-sm font-bold ${level.color}`}>
                                     {level.label}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             </section>
         </div>

         {/* FOOTER */}
         <footer className="bg-[#0F172A] text-slate-500 py-8 px-12 text-center text-xs border-t border-slate-800">
             <div className="flex justify-between items-center">
                 <span>© 2025 Engagement Consulting - Metodologia F5</span>
                 <span className="uppercase tracking-widest opacity-50">Confidencial</span>
             </div>
         </footer>

      </div>
    </div>
  );
};

export default RelatorioF1;