import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, FileText, BarChart2, ShieldAlert, Calendar, User, CheckSquare } from 'lucide-react';
import { storage } from '@/lib/storage';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PermissionGate from '@/components/PermissionGate';
import { F5_PERMISSIONS, logF5Audit } from '@/lib/permissions';
import { useToast } from '@/components/ui/use-toast';

function F5Relatorios() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const allProjects = storage.get('f5_projetos');
    setProjects(allProjects);
    if (allProjects.length > 0) {
        setSelectedProject(allProjects[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadReportData(selectedProject);
    }
  }, [selectedProject]);

  const loadReportData = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    const stages = storage.get('f5_etapas').filter(s => s.projeto_id === projectId);
    const kpis = storage.get('f5_kpis').filter(k => stages.map(s => s.id).includes(k.etapa_id));
    const checklists = storage.get('f5_checklists').filter(c => stages.map(s => s.id).includes(c.etapa_id));
    const deliverables = storage.get('f5_deliverables')?.filter(d => stages.map(s => s.id).includes(d.stage_id)) || [];
    
    setReportData({
      project,
      stages,
      kpis,
      checklists,
      deliverables
    });
  };

  const generateExecutivePDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 41, 59); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Relatório Executivo F5', 15, 20);
    doc.setFontSize(12);
    doc.text(`Projeto: ${reportData.project.nome}`, 15, 30);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 150, 30);

    // Project Summary
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(14);
    doc.text('Resumo Geral', 15, 50);
    doc.setFontSize(10);
    doc.text(`Status: ${reportData.project.status}`, 15, 60);
    doc.text(`Progresso Total: ${reportData.project.percentual_conclusao}%`, 15, 66);
    doc.text(`Responsável: ${reportData.project.responsavel_id}`, 15, 72);

    // KPIs Table
    doc.setFontSize(14);
    doc.text('Principais Indicadores (KPIs)', 15, 85);
    
    const kpiRows = reportData.kpis.map(k => [
        k.nome_kpi, 
        `${k.valor_atual}`, 
        `${k.meta}`, 
        k.tendencia
    ]);

    doc.autoTable({
        startY: 90,
        head: [['Indicador', 'Valor Atual', 'Meta', 'Tendência']],
        body: kpiRows,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
    });

    // Stages Progress
    let finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Progresso por Etapa', 15, finalY);

    const stageRows = reportData.stages.map(s => [
        s.nome,
        `${s.percentual_conclusao}%`,
        s.status,
        new Date(s.data_fim).toLocaleDateString()
    ]);

    doc.autoTable({
        startY: finalY + 5,
        head: [['Etapa', 'Conclusão', 'Status', 'Previsão']],
        body: stageRows,
        theme: 'striped'
    });

    doc.save(`F5_Executivo_${reportData.project.nome}.pdf`);
    logF5Audit('EXPORT', 'PROJECT', reportData.project.id, { message: 'Generated Executive PDF Report' });
    toast({ title: "Sucesso", description: "Relatório Executivo gerado." });
  };

  const generateDetailedPDF = () => {
      if (!reportData) return;
      const doc = new jsPDF();
      
      // Header
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Relatório Detalhado F5', 15, 20);
      doc.setFontSize(10);
      doc.text(`${reportData.project.nome}`, 15, 30);
      
      let yPos = 50;

      reportData.stages.forEach((stage, index) => {
          if (yPos > 250) { doc.addPage(); yPos = 20; }
          
          doc.setTextColor(33, 33, 33);
          doc.setFontSize(14);
          doc.text(`${stage.nome} (${stage.percentual_conclusao}%)`, 15, yPos);
          
          const stageChecklists = reportData.checklists.filter(c => c.etapa_id === stage.id);
          
          const rows = stageChecklists.map(c => [
              c.descricao,
              c.status,
              c.responsavel_id || '-',
              c.observacoes || '-'
          ]);

          doc.autoTable({
              startY: yPos + 5,
              head: [['Atividade', 'Status', 'Resp.', 'Obs']],
              body: rows,
              theme: 'plain',
              styles: { fontSize: 8 },
              columnStyles: { 0: { cellWidth: 80 } }
          });
          
          yPos = doc.lastAutoTable.finalY + 15;
      });

      doc.save(`F5_Detalhado_${reportData.project.nome}.pdf`);
      logF5Audit('EXPORT', 'PROJECT', reportData.project.id, { message: 'Generated Detailed PDF Report' });
      toast({ title: "Sucesso", description: "Relatório Detalhado gerado." });
  };

  const generateAuditCSV = () => {
    if (!reportData) return;
    
    // Mock Audit Log Data specifically for this report
    const auditLogs = storage.get('LOGS_AUDITORIA').filter(l => l.registro_id === reportData.project.id || l.tabela_afetada === 'PROJECT');
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data/Hora,Usuario,Acao,Entidade,Detalhes\n";
    
    auditLogs.forEach(log => {
        const row = `${log.data_hora},${log.usuario_id},${log.acao},${log.tabela_afetada},"${log.details || ''}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `F5_Auditoria_${reportData.project.nome}.csv`);
    document.body.appendChild(link);
    link.click();
    
    logF5Audit('EXPORT', 'PROJECT', reportData.project.id, { message: 'Exported Audit CSV' });
    toast({ title: "Sucesso", description: "CSV de Auditoria exportado." });
  };

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
                    className="bg-slate-900 text-white border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <TabsList className="grid w-full grid-cols-3 bg-slate-800 p-1">
                <TabsTrigger value="executive" className="data-[state=active]:bg-blue-600 text-slate-300"><BarChart2 className="mr-2 h-4 w-4"/> Executivo</TabsTrigger>
                <TabsTrigger value="detailed" className="data-[state=active]:bg-emerald-600 text-slate-300"><FileText className="mr-2 h-4 w-4"/> Detalhado</TabsTrigger>
                <TabsTrigger value="audit" className="data-[state=active]:bg-amber-600 text-slate-300"><ShieldAlert className="mr-2 h-4 w-4"/> Auditoria Técnica</TabsTrigger>
            </TabsList>

            {reportData ? (
                <>
                {/* EXECUTIVE REPORT */}
                <TabsContent value="executive">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Card className="md:col-span-2">
                            <CardHeader><CardTitle>Visão Geral do Projeto</CardTitle></CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={reportData.stages}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="nome" tick={{fontSize: 10}} />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="percentual_conclusao" name="Conclusão (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Status Global</CardTitle></CardHeader>
                            <CardContent className="flex flex-col items-center justify-center">
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Concluído', value: reportData.project.percentual_conclusao },
                                                    { name: 'Pendente', value: 100 - reportData.project.percentual_conclusao }
                                                ]}
                                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                            >
                                                <Cell fill="#10b981" />
                                                <Cell fill="#e2e8f0" />
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="text-center mt-4">
                                    <p className="text-3xl font-bold text-slate-800">{reportData.project.percentual_conclusao}%</p>
                                    <p className="text-sm text-slate-500">Conclusão Total</p>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {reportData.kpis.map(k => (
                                    <div key={k.id} className="p-4 border rounded-lg bg-slate-50">
                                        <div className="text-sm text-slate-500">{k.nome_kpi}</div>
                                        <div className="text-2xl font-bold text-slate-800 mt-1">{k.valor_atual}</div>
                                        <div className="text-xs flex justify-between mt-2">
                                            <span>Meta: {k.meta}</span>
                                            <span className={k.tendencia === 'Alta' ? 'text-green-600' : 'text-red-600'}>{k.tendencia}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DETAILED REPORT */}
                <TabsContent value="detailed">
                    <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Detalhamento de Atividades</CardTitle>
                            <Button onClick={generateDetailedPDF} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <Download className="mr-2 h-4 w-4" /> Baixar PDF Detalhado
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {reportData.stages.map(stage => (
                                    <div key={stage.id} className="border rounded-lg overflow-hidden">
                                        <div className="bg-slate-100 p-3 font-bold text-slate-700 flex justify-between">
                                            <span>{stage.nome}</span>
                                            <span className="text-sm bg-white px-2 py-0.5 rounded border">{stage.status}</span>
                                        </div>
                                        <div className="divide-y">
                                            {reportData.checklists.filter(c => c.etapa_id === stage.id).map(chk => (
                                                <div key={chk.id} className="p-3 flex items-start gap-3 bg-white hover:bg-slate-50">
                                                    <CheckSquare className={`h-5 w-5 ${chk.status === 'Concluído' ? 'text-green-500' : 'text-slate-300'}`} />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-800">{chk.descricao}</p>
                                                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1"><User className="h-3 w-3"/> {chk.responsavel_id || 'N/A'}</span>
                                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {chk.data_conclusao || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                    <CardDescription>Registro imutável de ações no projeto</CardDescription>
                                </div>
                                <Button onClick={generateAuditCSV} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                                    <Download className="mr-2 h-4 w-4" /> Exportar CSV (Audit Log)
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-700 font-medium">
                                            <tr>
                                                <th className="p-3 text-left">Data/Hora</th>
                                                <th className="p-3 text-left">Usuário</th>
                                                <th className="p-3 text-left">Ação</th>
                                                <th className="p-3 text-left">Entidade</th>
                                                <th className="p-3 text-left">IP</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y bg-white">
                                            {/* Simulated Log Data for UI */}
                                            <tr>
                                                <td className="p-3 text-slate-600">{new Date().toLocaleString()}</td>
                                                <td className="p-3">ADM001</td>
                                                <td className="p-3"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">VIEW</span></td>
                                                <td className="p-3">PROJECT</td>
                                                <td className="p-3 text-slate-400 text-xs">192.168.1.10</td>
                                            </tr>
                                            <tr>
                                                <td className="p-3 text-slate-600">{new Date(Date.now() - 3600000).toLocaleString()}</td>
                                                <td className="p-3">USER_02</td>
                                                <td className="p-3"><span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">UPDATE</span></td>
                                                <td className="p-3">CHECKLIST</td>
                                                <td className="p-3 text-slate-400 text-xs">10.0.0.55</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </PermissionGate>
                </TabsContent>
                </>
            ) : (
                <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800">
                    Selecione um projeto para visualizar os relatórios.
                </div>
            )}
        </Tabs>
      </PermissionGate>
    </>
  );
}

export default F5Relatorios;