import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GitMerge, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useConciliacoesContabeis } from '@/hooks/useConciliacoesContabeis';

export default function ConciliacoesContabeisList() {
  const navigate = useNavigate();
  const { loading, fetchConciliacoes, deleteConciliacao } = useConciliacoesContabeis();
  const [data, setData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = useCallback(async () => {
    const result = await fetchConciliacoes({ status: statusFilter });
    setData(result);
  }, [fetchConciliacoes, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conciliação?')) return;
    const success = await deleteConciliacao(id);
    if (success) loadData();
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === 'concluída' || s === 'concluido') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">Concluída</Badge>;
    if (s === 'pendente') return <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">Pendente</Badge>;
    return <Badge variant="outline">{status || '-'}</Badge>;
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <Helmet><title>Conciliações Contábeis | ERP Platform</title></Helmet>

      <PageHeader
        title="Conciliações Contábeis"
        description="Controle de conciliações bancárias, fiscais e demais tipos usadas no fechamento contábil."
        breadcrumbs={[{ label: 'Contabilidade', href: '/contabilidade/dashboard' }, { label: 'Conciliações' }]}
        action={
          <Button onClick={() => navigate('/contabilidade/conciliacoes/novo')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Nova Conciliação
          </Button>
        }
      />

      <div className="w-48">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Concluída">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-background border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <GitMerge className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhuma conciliação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted transition-colors">
                    <TableCell className="font-medium text-foreground">{row.tipo || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.empresa?.nome_fantasia || row.empresa?.razao_social || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.data_criacao ? format(new Date(row.data_criacao), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.responsavel?.nome || '-'}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/contabilidade/conciliacoes/${row.id}`)} title="Editar">
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Excluir">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
