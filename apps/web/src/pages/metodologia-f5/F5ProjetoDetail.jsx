import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  ArrowLeft, 
  ClipboardList, 
  Play, 
  LineChart, 
  CalendarDays, 
  ShieldCheck,
  Clock,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useF5 } from '@/contexts/F5Context';
import { motion } from 'framer-motion';

const F5ProjetoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use Context instead of raw storage to ensure we use the same data source as Dashboard
  const { projects, fetchProjects, loading: contextLoading } = useF5();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load project data via Context
  useEffect(() => {
    // If we have projects in context, try to find it immediately
    if (projects.length > 0) {
      findAndSetProject();
    } else {
      // Otherwise fetch and then find
      fetchProjects().then(() => {
        // We need to wait for the state update, but fetchProjects updates state. 
        // We'll rely on the [projects] dependency to trigger findAndSetProject.
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProjects]); // Run once or when fetcher changes

  // React to projects change to find the project
  useEffect(() => {
    if (!contextLoading && projects.length >= 0) {
        findAndSetProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, id, contextLoading]);


  const findAndSetProject = () => {
    console.log("[F5ProjetoDetail] Searching project list from Context:", projects);
    console.log(`[F5ProjetoDetail] Target ID: "${id}"`);

    const foundProject = projects.find(p => String(p.id) === String(id));
    
    if (foundProject) {
      console.log(`[F5ProjetoDetail] Project FOUND:`, foundProject);
      setProject(foundProject);
      setLoading(false);
    } else {
       // Only declare not found if we are sure data is loaded
       if (!contextLoading && projects.length > 0) {
         console.warn(`[F5ProjetoDetail] Project NOT found in Context list.`);
         // Don't redirect immediately to allow for potential latency or debugging
         // But set loading to false to show UI state
         setLoading(false);
       } else if (!contextLoading && projects.length === 0) {
           // Empty list, nothing to find
           setLoading(false);
       }
    }
  };

  // Phase configuration mapping
  const phases = [
    { 
      id: 'f1', 
      title: 'F1 - Diagnóstico', 
      icon: ClipboardList, 
      path: 'diagnostico', 
      description: 'Levantamento de necessidades, análise de cenário e definição de escopo.',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20'
    },
    { 
      id: 'f2', 
      title: 'F2 - Execução', 
      icon: Play, 
      path: 'f2-execucao', 
      description: 'Implementação das soluções, desenvolvimento e entregas técnicas.',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20'
    },
    { 
      id: 'f3', 
      title: 'F3 - Monitoramento', 
      icon: LineChart, 
      path: 'f3-monitoramento', 
      description: 'Acompanhamento de métricas, KPIs e performance do projeto.',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20'
    },
    { 
      id: 'f4', 
      title: 'F4 - Planejamento', 
      icon: CalendarDays, 
      path: 'f4-planejamento', 
      description: 'Estruturação de cronogramas, recursos e próximas etapas.',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20'
    },
    { 
      id: 'f5', 
      title: 'F5 - Governança', 
      icon: ShieldCheck, 
      path: 'f5-governanca', 
      description: 'Gestão de riscos, conformidade e padronização de processos.',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20'
    }
  ];

  const handleStageClick = (phasePath) => {
    if (!id) return;
    const fullPath = `/metodologia-f5/projetos/${id}/${phasePath}`;
    navigate(fullPath);
  };

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <h2 className="text-xl font-bold text-slate-100">Projeto não encontrado</h2>
            <p className="text-muted-foreground">O ID "{id}" não foi encontrado na base de dados local.</p>
            <Button onClick={() => navigate('/metodologia-f5/projetos')}>Voltar para Lista</Button>
        </div>
     );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <Helmet>
        <title>{project.name} | Metodologia F5</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-start md:space-y-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/metodologia-f5/projetos')}
            className="rounded-full hover:bg-slate-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{project.name}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {project.client} • {project.type || 'Consultoria'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" className="border-slate-700">
             <Clock className="mr-2 h-4 w-4" />
             Histórico
           </Button>
           <Button>
             Editar Projeto
           </Button>
        </div>
      </div>

      {/* Project Status Overview */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Progresso Geral</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold">{project.progress || 0}%</span>
              </div>
              <Progress value={project.progress || 0} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  {project.status === 'active' ? 'Em Andamento' : project.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Início</span>
              <div className="flex items-center gap-2 text-slate-200">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Previsão Fim</span>
              <div className="flex items-center gap-2 text-slate-200">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" /> 
          Fases do Projeto
        </h2>
        <p className="text-muted-foreground">Selecione uma fase para gerenciar detalhes, tarefas e entregáveis.</p>
      </div>

      {/* Phases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {phases.map((phase, index) => {
          const PhaseIcon = phase.icon;
          
          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <Card 
                className={`h-full cursor-pointer transition-all duration-300 hover:shadow-lg border-slate-800 bg-slate-950/50 hover:bg-slate-900 group relative overflow-hidden flex flex-col`}
                onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   handleStageClick(phase.path);
                }}
              >
                {/* Visual indicator stripe on top */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${phase.bg.replace('/10', '')}`} />

                <CardHeader className="pb-2">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${phase.bg} ${phase.color}`}>
                    <PhaseIcon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {phase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription className="line-clamp-3">
                    {phase.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="pt-0 mt-auto">
                  <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
                    <span>Ver detalhes</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default F5ProjetoDetail;