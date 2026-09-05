import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { 
  CheckSquare, 
  Target, 
  CheckCircle2, 
  Upload, 
  FileText, 
  Trash2, 
  BarChart, 
  Calendar as CalendarIcon,
  Save,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Helper component for the top cards
const StatusCard = ({ title, value, total, percent, color, icon: Icon }) => {
  const progress = total > 0 ? (value / total) * 100 : percent || 0;
  
  return (
    <Card className="border-none shadow-sm bg-white text-slate-800">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
               {total !== undefined ? (
                 <>
                   <span className="text-3xl font-bold text-slate-800">{value}</span>
                   <span className="text-lg text-slate-400 font-medium">/ {total}</span>
                 </>
               ) : (
                 <span className="text-3xl font-bold text-blue-600">{value}%</span>
               )}
            </div>
          </div>
          <div className={cn("p-2 rounded-lg", color === 'blue' ? "bg-blue-50 text-blue-600" : color === 'green' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600")}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full transition-all duration-500", 
              color === 'blue' ? "bg-blue-600" : color === 'green' ? "bg-emerald-500" : "bg-indigo-600"
            )} 
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const F5EtapaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stage, setStage] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [showExtraSettings, setShowExtraSettings] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Mock deliverables
  const [deliverables, setDeliverables] = useState([]);
  const TARGET_DELIVERABLES = 3; 

  useEffect(() => {
    const allStages = JSON.parse(localStorage.getItem('f5_etapas') || '[]');
    const foundStage = allStages.find(s => s.id === id);
    
    if (!foundStage) {
      toast({ title: "Erro", description: "Etapa não encontrada", variant: "destructive" });
      return;
    }
    setStage(foundStage);

    const allProjects = JSON.parse(localStorage.getItem('f5_projetos') || '[]');
    const proj = allProjects.find(p => p.id === foundStage.projeto_id);
    if (proj) setProjectName(proj.nome);

    const allChecklists = JSON.parse(localStorage.getItem('f5_checklists') || '[]');
    setChecklists(allChecklists.filter(c => c.etapa_id === id));

    const allKpis = JSON.parse(localStorage.getItem('f5_kpis') || '[]');
    setKpis(allKpis.filter(k => k.etapa_id === id));

    // Simulated deliverables for now as they are not in seed
    setDeliverables([
      { id: 'del1', nome: 'Relatório Inicial.pdf', size: '2.4 MB', data: new Date().toISOString() }
    ]);

  }, [id]);

  const toggleChecklist = (checklistId) => {
    const allChecklists = JSON.parse(localStorage.getItem('f5_checklists') || '[]');
    const updatedAll = allChecklists.map(c => {
      if (c.id === checklistId) {
        return { ...c, status: c.status === 'Concluído' ? 'Pendente' : 'Concluído' };
      }
      return c;
    });
    localStorage.setItem('f5_checklists', JSON.stringify(updatedAll));
    setChecklists(updatedAll.filter(c => c.etapa_id === id));
    
    // Recalculate progress
    const stageChecklists = updatedAll.filter(c => c.etapa_id === id);
    const completed = stageChecklists.filter(c => c.status === 'Concluído').length;
    const newProgress = Math.round((completed / stageChecklists.length) * 100);
    
    const allStages = JSON.parse(localStorage.getItem('f5_etapas') || '[]');
    const updatedStages = allStages.map(s => s.id === id ? { ...s, percentual_conclusao: newProgress } : s);
    localStorage.setItem('f5_etapas', JSON.stringify(updatedStages));
    setStage(prev => ({ ...prev, percentual_conclusao: newProgress }));
  };

  const handleUpload = () => {
    const title = prompt("Nome do arquivo entregável:");
    if (!title) return;
    const newDel = {
      id: Date.now().toString(),
      nome: title.endsWith('.pdf') ? title : `${title}.pdf`,
      size: '1.5 MB',
      data: new Date().toISOString()
    };
    setDeliverables([...deliverables, newDel]);
    toast({ title: "Upload concluído", description: "Arquivo anexado com sucesso." });
  };

  if (!stage) return <div>Carregando...</div>;

  const completedCount = checklists.filter(c => c.status === 'Concluído').length;

  return (
    <>
      <Helmet><title>{stage.nome} - Detalhe</title></Helmet>
      
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4 text-slate-400 hover:text-white pl-0 hover:bg-transparent"
        >
          ← Voltar para Projeto
        </Button>
        <div className="flex items-center gap-3 mb-2">
            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">ETAPA {stage.ordem}</span>
            <span className="text-slate-400 text-sm">{projectName}</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{stage.nome}</h1>
        <p className="text-slate-400 text-lg max-w-3xl">{stage.descricao}</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 pb-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard 
            title="Atividades Realizadas" 
            value={completedCount} 
            total={checklists.length}
            color="blue"
            icon={CheckSquare}
          />
          <StatusCard 
            title="Entregáveis Validados" 
            value={deliverables.length} 
            total={TARGET_DELIVERABLES}
            color="green"
            icon={Target}
          />
          <StatusCard 
            title="Conclusão da Etapa" 
            value={stage.percentual_conclusao}
            percent={stage.percentual_conclusao}
            color="indigo"
            icon={CheckCircle2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-white">
              <CheckSquare className="h-5 w-5 text-blue-400" />
              <h2>Checklist de Atividades</h2>
            </div>

            <div className="space-y-3">
              {checklists.map(item => (
                <motion.div 
                  key={item.id} 
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg transition-all duration-200 group border",
                    item.status === 'Concluído' 
                      ? "bg-slate-50 border-slate-200 opacity-75" 
                      : "bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200"
                  )}
                >
                  <div className="pt-1">
                    <Checkbox 
                      checked={item.status === 'Concluído'} 
                      onCheckedChange={() => toggleChecklist(item.id)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className={cn("text-base font-medium cursor-pointer select-none block", item.status === 'Concluído' ? "text-slate-500 line-through" : "text-slate-800")}>
                      {item.descricao}
                    </label>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-white">
              <FileText className="h-5 w-5 text-blue-400" />
              <h2>Documentos & Evidências</h2>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <div 
                onClick={handleUpload}
                className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group mb-6"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors text-slate-400">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm text-slate-600 mb-2">Arraste arquivos aqui</p>
                <Button variant="outline" size="sm">Selecionar</Button>
              </div>

              <div className="space-y-3">
                {deliverables.map(del => (
                  <div key={del.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center border border-slate-200 text-blue-600 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{del.nome}</p>
                      <p className="text-xs text-slate-500">{del.size}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                       <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs Section */}
        {kpis.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-white mb-4">Indicadores de Performance (KPIs)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kpis.map(kpi => (
                <Card key={kpi.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-slate-400 text-sm">{kpi.nome_kpi}</span>
                      <span className={`text-xs px-2 py-1 rounded ${kpi.tendencia === 'Alta' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {kpi.tendencia}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{kpi.valor_atual}</span>
                      <span className="text-sm text-slate-500">/ Meta: {kpi.meta}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </motion.div>
    </>
  );
};

export default F5EtapaDetail;