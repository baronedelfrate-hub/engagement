import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  BarChart2, 
  Edit,
  Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/PageHeader';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MATURITY_LEVELS } from './f1Data';

const HistoricoF1 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const data = JSON.parse(localStorage.getItem('f5_diagnosticos') || '{}');
      const list = Object.entries(data).map(([id, item]) => ({
        id,
        ...item
      })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setDiagnostics(list);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    
    const data = JSON.parse(localStorage.getItem('f5_diagnosticos') || '{}');
    delete data[deleteId];
    localStorage.setItem('f5_diagnosticos', JSON.stringify(data));
    loadHistory();
    setDeleteId(null);
    toast({ title: "Excluído", description: "Diagnóstico removido com sucesso." });
  };

  const filtered = diagnostics.filter(d => {
    const companyName = d.data?.razao_social || d.companyName || '';
    const cnpj = d.data?.cnpj || '';
    return companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           cnpj.includes(searchTerm);
  });

  const getMaturityConfig = (label) => {
    return MATURITY_LEVELS.find(l => l.label === label) || MATURITY_LEVELS[0];
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      <Helmet><title>Histórico de Diagnósticos F1</title></Helmet>

      <PageHeader
        title="Histórico de Diagnósticos"
        description="Gerencie todas as avaliações F1 realizadas"
        icon={History}
        action={
          <Button onClick={() => navigate('/metodologia-f5/diagnostico-f1')} className="bg-[#FF7A00] hover:bg-orange-600 text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Diagnóstico
          </Button>
        }
      />

      <div className="grid gap-6 mt-6">
        <Card className="border-t-4 border-[#FF7A00]">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <CardTitle>Diagnósticos Realizados</CardTitle>
                    <CardDescription>Lista de avaliações em andamento e finalizadas</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar empresa ou CNPJ..." 
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhum diagnóstico encontrado.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Maturidade</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((item) => {
                            const companyName = item.data?.razao_social || item.companyName || 'Sem nome';
                            const cnpj = item.data?.cnpj || 'Sem CNPJ';
                            const maturityConfig = getMaturityConfig(item.maturity);
                            const isFinished = item.finished || item.percentage > 0;
                            
                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        <div>{companyName}</div>
                                        <div className="text-xs text-slate-400">{cnpj}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={isFinished ? 'default' : 'secondary'} className={isFinished ? 'bg-green-600' : 'bg-slate-200 text-slate-600'}>
                                            {isFinished ? 'Finalizado' : 'Rascunho'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isFinished ? (
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${maturityConfig.bgColor} ${maturityConfig.color}`}>
                                                {item.maturity || 'N/A'}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {item.percentage > 0 ? <span className="font-bold text-slate-700">{item.percentage}%</span> : '-'}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(item.updatedAt).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {isFinished ? (
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/metodologia-f5/relatorio-f1/${item.id}`)} title="Ver Relatório">
                                                    <BarChart2 className="h-4 w-4 text-[#FF7A00]" />
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/metodologia-f5/diagnostico-f1/${item.id}`)} title="Continuar Edição">
                                                    <Edit className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O diagnóstico será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoricoF1;