import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { erpServices } from '@/lib/erpServices';
import {
  CheckSquare,
  Target,
  CheckCircle2,
  Upload,
  FileText,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const StatusCard = ({ title, value, total, percent, plain, color, icon: Icon }) => {
  const progress = plain ? (value > 0 ? 100 : 0) : total !== undefined ? (total > 0 ? (value / total) * 100 : 0) : percent || 0;

  return (
    <Card className="border-none shadow-sm bg-background text-foreground">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
            <div className="flex items-baseline gap-1">
               {plain ? (
                 <span className="text-3xl font-bold text-foreground">{value}</span>
               ) : total !== undefined ? (
                 <>
                   <span className="text-3xl font-bold text-foreground">{value}</span>
                   <span className="text-lg text-muted-foreground font-medium">/ {total}</span>
                 </>
               ) : (
                 <span className="text-3xl font-bold text-blue-600">{value}%</span>
               )}
            </div>
          </div>
          <div className={cn("p-2 rounded-lg", color === 'blue' ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" : color === 'green' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400")}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
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
  const [projectName, setProjectName] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [entregaveis, setEntregaveis] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const stageRes = await erpServices.f5Etapas.read(id);
    if (!stageRes.success) {
      toast({ title: "Erro", description: "Etapa não encontrada", variant: "destructive" });
      setLoading(false);
      return;
    }
    setStage(stageRes.data);

    const [projetoRes, checklistsRes, entregaveisRes] = await Promise.all([
      stageRes.data.projeto_id ? erpServices.f5Projetos.read(stageRes.data.projeto_id) : Promise.resolve({ success: false }),
      erpServices.f5Checklists.list({ limit: 100, filters: { etapa_id: id } }),
      erpServices.f5Entregaveis.list({ limit: 50, filters: { etapa_id: id } })
    ]);

    if (projetoRes.success) {
      setProjectName(projetoRes.data.nome);
      const kpisRes = await erpServices.f5Kpis.list({ limit: 50, filters: { projeto_id: projetoRes.data.id } });
      if (kpisRes.success) setKpis(kpisRes.data);
    }

    if (checklistsRes.success) setChecklists(checklistsRes.data);
    if (entregaveisRes.success) setEntregaveis(entregaveisRes.data);

    setLoading(false);
  }, [id, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleChecklist = async (checklistItem) => {
    const novoConcluido = !checklistItem.concluido;
    const res = await erpServices.f5Checklists.update(checklistItem.id, {
      concluido: novoConcluido,
      data_conclusao: novoConcluido ? new Date().toISOString() : null
    });
    if (res.success) {
      setChecklists(prev => prev.map(c => c.id === checklistItem.id ? res.data : c));
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
  };

  const handleUpload = async () => {
    const title = window.prompt("Nome do entregável:");
    if (!title) return;
    const res = await erpServices.f5Entregaveis.create({
      etapa_id: id,
      nome: title,
      status: 'Planejado',
      data_entrega: new Date().toISOString().slice(0, 10)
    });
    if (res.success) {
      setEntregaveis(prev => [res.data, ...prev]);
      toast({ title: "Entregável criado", description: "Registro salvo com sucesso." });
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
  };

  const handleDeleteEntregavel = async (entregavelId) => {
    if (!window.confirm('Excluir este entregável?')) return;
    const res = await erpServices.f5Entregaveis.delete(entregavelId);
    if (res.success) {
      setEntregaveis(prev => prev.filter(e => e.id !== entregavelId));
    } else {
      toast({ title: "Erro", description: res.error, variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!stage) return <div className="p-8 text-muted-foreground">Etapa não encontrada.</div>;

  const completedCount = checklists.filter(c => c.concluido).length;
  const percentualConclusao = checklists.length > 0 ? Math.round((completedCount / checklists.length) * 100) : 0;

  return (
    <>
      <Helmet><title>{stage.nome} - Detalhe</title></Helmet>

      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/metodologia-f5/etapas')}
          className="mb-4 text-muted-foreground hover:text-foreground pl-0 hover:bg-transparent"
        >
          ← Voltar para Etapas
        </Button>
        <div className="flex items-center gap-3 mb-2">
            {stage.numero && <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">ETAPA {stage.numero}</span>}
            {projectName && <span className="text-muted-foreground text-sm">{projectName}</span>}
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{stage.nome}</h1>
        <p className="text-muted-foreground text-lg max-w-3xl">{stage.descricao}</p>
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
            title="Entregáveis"
            value={entregaveis.length}
            plain
            color="green"
            icon={Target}
          />
          <StatusCard
            title="Conclusão da Etapa"
            value={percentualConclusao}
            percent={percentualConclusao}
            color="indigo"
            icon={CheckCircle2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <CheckSquare className="h-5 w-5 text-blue-400" />
              <h2>Checklist de Atividades</h2>
            </div>

            <div className="space-y-3">
              {checklists.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum item de checklist cadastrado para esta etapa.</p>
              )}
              {checklists.map(item => (
                <motion.div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg transition-all duration-200 group border",
                    item.concluido
                      ? "bg-muted border-border opacity-75"
                      : "bg-background border-border shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <div className="pt-1">
                    <Checkbox
                      checked={!!item.concluido}
                      onCheckedChange={() => toggleChecklist(item)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-5 w-5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className={cn("text-base font-medium cursor-pointer select-none block", item.concluido ? "text-muted-foreground line-through" : "text-foreground")}>
                      {item.item}
                    </label>
                    {item.descricao && <p className="text-sm text-muted-foreground mt-1">{item.descricao}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <FileText className="h-5 w-5 text-blue-400" />
              <h2>Entregáveis</h2>
            </div>

            <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
              <div
                onClick={handleUpload}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted transition-colors cursor-pointer group mb-6"
              >
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/30 dark:group-hover:text-blue-400 transition-colors text-muted-foreground">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">Registrar novo entregável</p>
                <Button variant="outline" size="sm">Adicionar</Button>
              </div>

              <div className="space-y-3">
                {entregaveis.map(del => (
                  <div key={del.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
                    <div className="h-10 w-10 bg-background rounded-lg flex items-center justify-center border border-border text-blue-600 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{del.nome}</p>
                      <p className="text-xs text-muted-foreground">{del.status}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteEntregavel(del.id)}>
                       <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {kpis.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-foreground mb-4">Indicadores de Performance (KPIs do Projeto)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kpis.map(kpi => (
                <Card key={kpi.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-muted-foreground text-sm">{kpi.nome}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">{kpi.valor_atual ?? '-'}</span>
                      <span className="text-sm text-muted-foreground">{kpi.unidade} / Meta: {kpi.valor_meta ?? '-'} {kpi.unidade}</span>
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
