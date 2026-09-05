import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
  FolderKanban, 
  LayoutDashboard, 
  Settings, 
  Users, 
  Plus, 
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useF5 } from '@/contexts/F5Context';

const F5Dashboard = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects, createProject, loading, setCurrentProject } = useF5();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = () => {
    const newProject = {
      name: `Novo Projeto ${new Date().toLocaleDateString()}`,
      client: 'Cliente Novo',
      status: 'active',
      progress: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // +90 days
    };
    createProject(newProject);
  };

  const handleProjectClick = (project) => {
    if (!project || !project.id) return;

    // Set as current project in context to enable quick navigation from sidebar
    setCurrentProject(project);

    // Navigate to details
    navigate(`/metodologia-f5/projetos/${project.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <Helmet>
        <title>Dashboard F5 | Metodologia</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metodologia F5</h1>
          <p className="text-muted-foreground mt-1">
            Gestão estratégica de projetos e consultoria.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/metodologia-f5/relatorios')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Relatórios
          </Button>
          <Button onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter(p => p.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Em execução</p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fases Concluídas</CardTitle>
            <Settings className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Neste mês</p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipe Alocada</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Consultores ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Média de entregas</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="group cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-slate-950/40 border-slate-800"
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {project.name}
                </CardTitle>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {project.status === 'active' ? 'Em Andamento' : project.status}
                </Badge>
              </div>
              <CardDescription>{project.client}</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span>{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Início</span>
                    <span className="font-medium">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Previsão</span>
                    <span className="font-medium">
                       {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3 border-t border-slate-800/50 flex justify-between items-center text-sm text-muted-foreground">
              <span className="font-mono text-xs opacity-50 truncate max-w-[150px]" title={project.id}>ID: {project.id}</span>
              <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary" />
            </CardFooter>
          </Card>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-slate-900/20 rounded-lg border border-dashed border-slate-800">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm mt-2 max-w-sm mx-auto">
              Comece criando um novo projeto para gerenciar as fases da metodologia F5.
            </p>
            <Button className="mt-6" onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default F5Dashboard;