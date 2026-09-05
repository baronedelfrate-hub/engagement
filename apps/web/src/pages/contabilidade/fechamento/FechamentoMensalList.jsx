import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Eye, Edit, Trash2, Plus, CalendarCheck, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useFechamentoMensal } from '@/hooks/useFechamentoMensal';
import { getStatusColor, calculateProgress, formatCompetencia, formatDate } from '@/lib/fechamentoUtils';
import { useContabilidade } from '@/contexts/ContabilidadeContext';

export default function FechamentoMensalList() {
  const navigate = useNavigate();
  const { fetchClosings, deleteClosing, loading } = useFechamentoMensal();
  const { empresas } = useContabilidade();
  
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmpresa, setFilterEmpresa] = useState('all');

  const loadData = async () => {
    const filters = {};
    if (filterEmpresa !== 'all') filters.empresa_id = filterEmpresa;
    if (filterStatus !== 'all') filters.status = filterStatus;
    
    const result = await fetchClosings(filters);
    setData(result);
  };

  useEffect(() => {
    loadData();
  }, [filterEmpresa, filterStatus]); // eslint-disable-line

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este fechamento? Todas as etapas e histórico serão perdidos.')) {
      const success = await deleteClosing(id);
      if (success) loadData();
    }
  };

  const filteredData = data.filter(item => 
    search === '' || 
    item.empresa?.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    item.responsavel?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    item.competencia?.includes(search)
  );

  // Summary logic
  const total = data.length;
  const concluidos = data.filter(d => d.status === 'Concluído').length;
  const emAndamento = data.filter(d => d.status === 'Em andamento').length;
  const aguardando = data.filter(d => d.status === 'Aguardando contabilidade').length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
      <Helmet><title>Fechamento Mensal | ERP Platform</title></Helmet>

      <PageHeader 
        title="Fechamento Mensal" 
        description="Gerenciamento de fechamentos contábeis mensais por empresa"
        breadcrumbs={[{ label: 'Contabilidade', href: '/contabilidade/dashboard' }, { label: 'Fechamento Mensal' }]}
        actions={
          <Button onClick={() => navigate('/contabilidade/fechamento/novo')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Fechamento
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-lg text-slate-600"><CalendarCheck className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-slate-500">Total</p><h3 className="text-2xl font-bold text-slate-800">{total}</h3></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><CheckCircle2 className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-slate-500">Concluídos</p><h3 className="text-2xl font-bold text-slate-800">{concluidos}</h3></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600"><Clock className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-slate-500">Em Andamento</p><h3 className="text-2xl font-bold text-slate-800">{emAndamento}</h3></div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><AlertCircle className="w-6 h-6" /></div>
            <div><p className="text-sm font-medium text-slate-500">Aguardando Contab.</p><h3 className="text-2xl font-bold text-slate-800">{aguardando}</h3></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="text-lg font-semibold text-slate-800">Lista de Fechamentos</CardTitle>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Input 
              placeholder="Buscar..." 
              value={search} onChange={(e) => setSearch(e.target.value)} 
              className="w-full md:w-48 bg-white h-9" 
            />
            <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
              <SelectTrigger className="w-full md:w-48 bg-white h-9"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40 bg-white h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="Em aberto">Em aberto</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Aguardando contabilidade">Aguardando contabilidade</SelectItem>
                <SelectItem value="Concluído">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    Nenhum fechamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-800">{item.empresa?.nome_fantasia || 'N/A'}</TableCell>
                    <TableCell>{formatCompetencia(item.competencia)}</TableCell>
                    <TableCell><Badge className={getStatusColor(item.status)}>{item.status}</Badge></TableCell>
                    <TableCell className="w-[150px]">
                      <div className="flex items-center gap-2">
                        <Progress value={item.progresso || 0} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-slate-500 w-8">{item.progresso || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{item.responsavel?.nome || '-'}</TableCell>
                    <TableCell>{formatDate(item.data_abertura)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/contabilidade/fechamento/${item.id}`)} title="Ver Detalhes">
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/contabilidade/fechamento/${item.id}/editar`)} title="Editar">
                          <Edit className="w-4 h-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}