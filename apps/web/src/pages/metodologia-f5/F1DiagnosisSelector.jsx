import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useF5 } from '@/contexts/F5Context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, FolderSearch, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const F1DiagnosisSelector = () => {
  const navigate = useNavigate();
  const { projects, currentProject, fetchProjects, setCurrentProject } = useF5();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // If a project is already selected in context (e.g. from Dashboard click), redirect immediately
  useEffect(() => {
    if (currentProject && currentProject.id) {
      navigate(`/metodologia-f5/diagnostico-f1/${currentProject.id}`, { replace: true });
    }
  }, [currentProject, navigate]);

  const handleSelectProject = (project) => {
    setCurrentProject(project);
    navigate(`/metodologia-f5/diagnostico-f1/${project.id}`);
  };

  return (
    <div className="container mx-auto max-w-5xl animate-fade-in">
      <Helmet>
        <title>Diagnóstico F1 | Selecionar Projeto</title>
      </Helmet>
      
      <PageHeader
        title="Diagnóstico F1"
        description="Selecione um projeto para acessar ou realizar o Diagnóstico F1."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:border-primary/50 transition-all cursor-pointer hover:shadow-md group"
              onClick={() => handleSelectProject(project)}
            >
              <CardHeader>
                <CardTitle className="group-hover:text-primary transition-colors">{project.name}</CardTitle>
                <CardDescription>{project.client}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <span className="block">Status: <span className="capitalize text-foreground font-medium">{project.status}</span></span>
                  <span className="block mt-1">Progresso: <span className="font-medium">{project.progress || 0}%</span></span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                  Acessar Diagnóstico <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-muted/20 border border-dashed rounded-lg text-center">
            <FolderSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mt-2 mb-6">Crie um projeto no Dashboard para iniciar o diagnóstico.</p>
            <Button onClick={() => navigate('/metodologia-f5/dashboard')}>
              Ir para Dashboard
            </Button>
          </div>
        )}
      </div>

      {!currentProject && projects.length > 0 && (
         <div className="mt-8 p-4 bg-blue-50/10 border border-blue-500/20 rounded-lg flex items-start gap-3 text-blue-400">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
               <p className="font-medium">Nenhum projeto selecionado</p>
               <p className="opacity-90">Selecione um projeto acima para visualizar os dados específicos do Diagnóstico F1.</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default F1DiagnosisSelector;