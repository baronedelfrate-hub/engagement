import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const F5Context = createContext();

export const useF5 = () => {
  const context = useContext(F5Context);
  if (!context) throw new Error('useF5 must be used within a F5Provider');
  return context;
};

export const F5Provider = ({ children }) => {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Projects ---

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const local = JSON.parse(localStorage.getItem('f5_projects_local') || '[]');
      setProjects(local);
    } catch (error) {
      console.warn('Fetching projects error:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async (projectData) => {
    try {
      // LocalStorage Only
      const newProj = { id: crypto.randomUUID(), ...projectData, status: 'active', created_at: new Date().toISOString() };
      const localProjs = JSON.parse(localStorage.getItem('f5_projects_local') || '[]');
      localStorage.setItem('f5_projects_local', JSON.stringify([newProj, ...localProjs]));
      
      // Init phases locally
      const phaseTemplates = [
        { id: crypto.randomUUID(), project_id: newProj.id, name: 'F1', description: 'Diagnóstico 360°', status: 'nao_iniciado', progress: 0 },
        { id: crypto.randomUUID(), project_id: newProj.id, name: 'F2', description: 'Estruturação', status: 'nao_iniciado', progress: 0 },
        { id: crypto.randomUUID(), project_id: newProj.id, name: 'F3', description: 'Implementação', status: 'nao_iniciado', progress: 0 },
        { id: crypto.randomUUID(), project_id: newProj.id, name: 'F4', description: 'Planejamento Estratégico', status: 'nao_iniciado', progress: 0 },
        { id: crypto.randomUUID(), project_id: newProj.id, name: 'F5', description: 'Governança e Sustentabilidade', status: 'nao_iniciado', progress: 0 },
      ];
      
      // We store phases in f5_phases (previously was mixed but let's standardize to f5_phases for local phases)
      const localPhases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      localStorage.setItem('f5_phases', JSON.stringify([...localPhases, ...phaseTemplates]));
      
      fetchProjects();
      toast({ title: 'Sucesso', description: 'Projeto criado localmente.' });
      return newProj;
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao criar projeto", variant: "destructive" });
    }
  };

  // --- Phases & Flow Control ---

  const fetchPhases = useCallback(async (projectId) => {
    if (!projectId) return;
    setLoading(true);
    try {
      // Local Only
      const localPhases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const filtered = localPhases.filter(p => p.project_id === projectId).sort((a,b) => a.name.localeCompare(b.name));
      setPhases(filtered);
    } catch (error) {
      console.warn('Fetching phases error:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPhaseSequentialFlow = async (projectId, targetPhaseName) => {
    // Define predecessor map
    const predecessors = {
      'F1': null,
      'F2': 'F1',
      'F3': 'F2',
      'F4': 'F3',
      'F5': 'F4'
    };

    const prevPhaseName = predecessors[targetPhaseName];
    if (!prevPhaseName) return { allowed: true }; // F1 is always allowed to start

    try {
      // Local check
      const localPhases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const prev = localPhases.find(p => p.project_id === projectId && p.name === prevPhaseName);
      
      if (prev && prev.status === 'concluido') return { allowed: true };
      return { allowed: false, message: `A fase anterior (${prevPhaseName}) deve estar concluída.` };
    } catch (err) {
      return { allowed: false, message: "Erro ao verificar sequência." };
    }
  };

  const updatePhaseStatus = async (projectId, phaseName, newStatus) => {
    try {
      // Check sequence first if starting
      if (newStatus === 'em_andamento') {
        const check = await checkPhaseSequentialFlow(projectId, phaseName);
        if (!check.allowed) {
          toast({ variant: "destructive", title: "Bloqueado", description: check.message });
          return false;
        }
      }

      const localPhases = JSON.parse(localStorage.getItem('f5_phases') || '[]');
      const updated = localPhases.map(p => 
        (p.project_id === projectId && p.name === phaseName) 
          ? { ...p, status: newStatus, updated_at: new Date().toISOString() } 
          : p
      );
      
      localStorage.setItem('f5_phases', JSON.stringify(updated));
      
      // Update context state if currently viewing this project
      const updatedPhase = updated.find(p => p.project_id === projectId && p.name === phaseName);
      if (updatedPhase) {
        setPhases(prev => prev.map(p => p.id === updatedPhase.id ? updatedPhase : p));
      }
      
      return true;

    } catch (error) {
      console.warn("Update failed:", error.message);
      return false;
    }
  };

  return (
    <F5Context.Provider value={{
      projects,
      phases,
      currentProject,
      loading,
      setCurrentProject,
      fetchProjects,
      createProject,
      fetchPhases,
      updatePhaseStatus,
      checkPhaseSequentialFlow
    }}>
      {children}
    </F5Context.Provider>
  );
};