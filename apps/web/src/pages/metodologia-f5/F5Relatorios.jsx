import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, FileText, BarChart2, ShieldAlert, Calendar, CheckSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PermissionGate from '@/components/PermissionGate';
import { F5_PERMISSIONS, logF5Audit } from '@/lib/permissions';
import { useToast } from '@/components/ui/use-toast';

// Progresso de uma etapa é calculado a partir dos itens de checklist concluídos
// (não existe coluna percentual_conclusao no schema real de f5_etapas/f5_projetos).
const getStageProgress = (stageId, checklists) => {
  const items = checklists.filter(c => c.etapa_id === stageId);
  if (items.length === 0) return null;
  const done = items.filter(c => c.concluido).length;
  return Math.round((done / items.length) * 100);
};

function F5Relatorios() {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [reportData, setReportData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadReportData(selectedProject);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const { data, error } = await supabase.from('f5_projetos').select('id, nome').order('nome');
    if (error) {
      console.error('[F5Relatorios] Erro ao carregar projetos:', error);
      return;
    }
    setProjects(data || []);
    if (data && data.length > 0) {
      setSelectedProject(data[0].id);
    }
  };

  const loadReportData = async (projectId) => {
    setLoading(true);
    try {
      const { data: project, error: projectError } = await supabase
        .from('f5_projetos')
        .select('*')
        .eq('id', projectId)
        .single();
      if (projectError) throw projectError;

      const { data: stages, error: stagesError } = await supabase
        .from('f5_etapas')
        .select('*')
        .eq('projeto_id', projectId)
        .order('numero');
      if (stagesError) throw stagesError;

      const { data: kpis, error: kpisError } = await supabase
        .from('f5_kpis')
        .select('*')
        .eq('projeto_id', projectId);
      if (kpisError) throw kpisError;

      const stageIds = (stages || []).map(s => s.id);
      const { data: checklists, error: checklistsError } = stageIds.length > 0
        ? await supabase.from('f5_checklists').select('*').in('etapa_id', stageIds)
        : { data: [], error: null };
      if (checklistsError) throw checklistsError;

      setReportData({
        project,
        stages: stages || [],
        kpis: kpis || [],
        checklists: checklists || [],
      });

      await loadAuditLogs(projectId);
    } catch (error) {
      console.error('[F5Relatorios] Erro ao carregar dados do relatório:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados do relatório.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (projectId) => {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tabela', 'PROJECT')
      .eq('registro_id', projectId)
      .order('created_at', { ascending: false });
    setAuditLogs(logs || []);
  };

  const generateExecutivePDF = async () => {
    if (!reportData) return;
    const doc = new jsPDF();

    doc.setFillColor(30, 41, 59); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Relatório Executivo F5', 15, 20);
    doc.setFontSize(12);
    doc.text(`Projeto: ${reportData.project.nome}`, 15, 30);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 30);

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(14);
    doc.text('Resumo Geral', 15, 50);
    doc.setFontSize(10);
    doc.text(`Status: ${reportData.project.status || '-'}`, 15, 60);
    doc.text(`Etapas: ${reportData.stages.length}`, 15, 66);

    doc.setFontSize(14);
    doc.text('Principais Indicadores (KPIs)', 15, 78);

    const kpiRows = reportData.kpis.map(k => [
      k.nome,
      `${k.valor_atual ?? '-'}`,
      `${k.valor_meta ?? '-'}`,
      k.unidade || '-'
    ]);

    doc.autoTable({
      startY: 83,
      head: [['Indicador', 'Valor Atual', 'Meta', 'Unidade']],
      body: kpiRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Progresso por Etapa', 15, finalY);

    const stageRows = reportData.stages.map(s => {
      const progress = getStageProgress(s.id, reportData.checklists);
      return [
        s.nome,
        progress === null ? 'Sem checklist' : `${progress}%`,
        s.status || '-',
        s.data_fim ? new Date(s.data_fim).toLocaleDateString() : '-'
      ];
    });

    doc.autoTable({
      startY: finalY + 5,
      head: [['Etapa', 'Progresso (Checklist)', 'Status', 'Previsão']],
      body: stageRows,
      theme: 'striped'
    });

    doc.save(`F5_Executivo_${reportData.project.nome}.pdf`);
    await logF5Audit('EXPORT', 'PROJECT', reportData.project.id, { message: 'Generated Executive PDF Report' });
    await loadAuditLogs(reportData.project.id);
    toast({ title: "Sucesso", description: "Relatório Executivo gerado." });
  };

  const generateDetailedPDF = async () => {
    if (!reportData) return;
    const doc = new jsPDF();

    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Relatório Detalhado F5', 15, 20);
    doc.setFontSize(10);
    doc.text(`${reportData.project.nome}`, 15, 30);

    let yPos = 50;

    reportData.stages.forEach((stage) => {
      if (yPos > 250) { doc.addPage(); yPos = 20; }

      const progress = getStageProgress(stage.id, reportData.checklists);
      doc.setTextColor(33, 33, 33);
      doc.setFontSize(14);
      doc.text(`${stage.nome}${progress !== null ? ` (${progress}%)` : ''}`, 15, yPos);

      const stageChecklists = reportData.checklists.filter(c => c.etapa_id === stage.id);

      const rows = stageChecklists.map(c => [
        c.item || c.descricao || '-',
        c.concluido ? 'Sim' : 'Não',
        c.data_conclusao ? new Date(c.data_conclusao).toLocaleDateString() : '-'
      ]);

      doc.autoTable({
        startY: yPos + 5,
        head: [['Atividade', 'Concluído', 'Data Conclusão']],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 100 } }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`F5_Detalhado_${reportData.project.nome}.pdf`);
    await logF5Audit('EXPORT', 'PROJECT', reportData.project.id, { message: 'Generated Detailed PDF Report' });
    await loadAuditLogs(reportData.project.id);
    toast({ title: "Sucesso", description: "Relatório Detalhado gerado." });
  };

  const generateAuditCSV = async () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data/Hora,Usuario,Acao,Entidade,Detalhes\n";

    auditLogs.forEach(log => {
      const detalhes = log.valores_novos?.message || (log.valores_novos ? JSON.stringify(log.valores_novos) : '');
      const row = `${new Date(log.created_at).toLocaleString()},${log.user_id || ''},${log.acao},${log.tabela},"${detalhes}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `F5_Auditoria_${reportData.project.nome}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    await logF5Audit('EXPORT', 'PROJECT', reportData.project.id, { message: 'Exported Audit CSV' });
    await loadAuditLogs(reportData.project.id);
    toast({ title: "Sucesso", description: "CSV de Auditoria exportado." });
  };

  const stageStatusData = reportData
    ? Object.entries(
        reportData.stages.reduce((acc, s) => {
          const key = s.status || 'Sem status';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <>
      <Helmet><title>Relatórios Avançados F5</title></Helmet>
      <PageHeader
        title="Central de Relatórios F5"
        description="Análise detalhada, auditoria e exportação de dados."
        action={
          <div className="flex gap-2">
            <select
              className="bg-background text-foreground border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        }
      />

      <PermissionGate permission={F5_PERMISSIONS.REPORT_GENERATE} fallback>
        <Tabs defaultValue="executive" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
            <TabsTrigger value="executive" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-muted-foreground"><BarChart2 className="mr-2 h-4 w-4" /> Executivo</TabsTrigger>
            <TabsTrigger value="detailed" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground"><FileText className="mr-2 h-4 w-4" /> Detalhado</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-muted-foreground"><ShieldAlert className="mr-2 h-4 w-4" /> Auditoria Técnica</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border">
              <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" /> Carregando relatório...
            </div>
          ) : reportData ? (
            <>
              {/* EXECUTIVE REPORT */}
              <TabsContent value="executive">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Progresso por Etapa (Checklist)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reportData.stages.map(s => ({ ...s, progresso: getStageProgress(s.id, reportData.checklists) || 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="progresso" name="Conclusão (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Status das Etapas</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stageStatusData}
                              cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                            >
                              {stageStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center mt-4">
                        <p className="text-lg font-bold text-foreground">{reportData.project.status || '-'}</p>
                        <p className="text-sm text-muted-foreground">Status do Projeto</p>
                      </div>
                      <Button onClick={generateExecutivePDF} className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                        <Download className="mr-2 h-4 w-4" /> Exportar PDF Executivo
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>Indicadores Chave (KPIs)</CardTitle></CardHeader>
                  <CardContent>
                    {reportData.kpis.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum KPI cadastrado para este projeto.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {reportData.kpis.map(k => (
                          <div key={k.id} className="p-4 border rounded-lg bg-muted">
                            <div className="text-sm text-muted-foreground">{k.nome}</div>
                            <div className="text-2xl font-bold text-foreground mt-1">{k.valor_atual ?? '-'} {k.unidade}</div>
                            <div className="text-xs text-muted-foreground mt-2">Meta: {k.valor_meta ?? '-'} {k.unidade}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* DETAILED REPORT */}
              <TabsContent value="detailed">
                <Card className="mb-6">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Detalhamento de Atividades</CardTitle>
                    <Button onClick={generateDetailedPDF} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                      <Download className="mr-2 h-4 w-4" /> Baixar PDF Detalhado
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {reportData.stages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada para este projeto.</p>
                    ) : (
                      <div className="space-y-6">
                        {reportData.stages.map(stage => (
                          <div key={stage.id} className="border rounded-lg overflow-hidden">
                            <div className="bg-muted p-3 font-bold text-foreground flex justify-between">
                              <span>{stage.nome}</span>
                              <span className="text-sm bg-background px-2 py-0.5 rounded border">{stage.status || '-'}</span>
                            </div>
                            <div className="divide-y">
                              {reportData.checklists.filter(c => c.etapa_id === stage.id).map(chk => (
                                <div key={chk.id} className="p-3 flex items-start gap-3 bg-background hover:bg-muted">
                                  <CheckSquare className={`h-5 w-5 ${chk.concluido ? 'text-green-500' : 'text-muted-foreground'}`} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{chk.item || chk.descricao}</p>
                                    {chk.data_conclusao && (
                                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(chk.data_conclusao).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {reportData.checklists.filter(c => c.etapa_id === stage.id).length === 0 && (
                                <p className="p-3 text-sm text-muted-foreground">Nenhum item de checklist nesta etapa.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AUDIT REPORT */}
              <TabsContent value="audit">
                <PermissionGate permission={F5_PERMISSIONS.AUDIT_VIEW} fallback>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Auditoria Técnica</CardTitle>
                        <CardDescription>Registro de ações registradas para este projeto</CardDescription>
                      </div>
                      <Button onClick={generateAuditCSV} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30">
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV (Audit Log)
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted text-foreground font-medium">
                            <tr>
                              <th className="p-3 text-left">Data/Hora</th>
                              <th className="p-3 text-left">Usuário</th>
                              <th className="p-3 text-left">Ação</th>
                              <th className="p-3 text-left">Entidade</th>
                              <th className="p-3 text-left">Detalhes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y bg-background">
                            {auditLogs.map(log => (
                              <tr key={log.id}>
                                <td className="p-3 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="p-3">{log.user_id || '-'}</td>
                                <td className="p-3"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold dark:bg-blue-950/30 dark:text-blue-400">{log.acao}</span></td>
                                <td className="p-3">{log.tabela}</td>
                                <td className="p-3 text-muted-foreground max-w-md truncate" title={log.valores_novos?.message || ''}>{log.valores_novos?.message || '-'}</td>
                              </tr>
                            ))}
                            {auditLogs.length === 0 && (
                              <tr>
                                <td colSpan="5" className="p-8 text-center text-muted-foreground">Nenhum registro de auditoria para este projeto ainda.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </PermissionGate>
              </TabsContent>
            </>
          ) : (
            <div className="p-12 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border">
              Selecione um projeto para visualizar os relatórios.
            </div>
          )}
        </Tabs>
      </PermissionGate>
    </>
  );
}

export default F5Relatorios;
