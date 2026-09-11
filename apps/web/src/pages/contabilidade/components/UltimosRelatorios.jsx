import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { apuracaoImpostosService } from '@/lib/apuracaoImpostosService';
import { useToast } from '@/components/ui/use-toast';

export default function UltimosRelatorios({ data = [], onRefresh }) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const navigate = useNavigate();
  const { toast } = useToast();

  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'disponível' || s === 'concluído') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">Disponível</Badge>;
    if (s === 'gerando' || s === 'pendente') return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">Gerando</Badge>;
    if (s === 'erro') return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">Erro</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const handleView = (row) => {
    if (row.origem === 'apuracao') navigate(`/fiscal/apuracao-impostos/${row.id}`);
    else navigate('/contabilidade/dre-balancete');
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Excluir esta ${row.tipo}?`)) return;
    try {
      await apuracaoImpostosService.deleteApuracao(row.id);
      toast({ title: "Excluído", description: "Registro removido." });
      onRefresh?.();
    } catch (error) {
      toast({ title: "Erro", description: error.message || "Não foi possível excluir.", variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-sm border-border bg-background">
      <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <BarChart3 className="w-4 h-4 text-emerald-500" /> Últimos Relatórios e Importações
        </CardTitle>
        <Badge variant="outline" className="bg-background">{data.length} registros</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data de Geração</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum relatório encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted transition-colors">
                    <TableCell className="font-medium text-foreground">{row.tipo}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{row.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.data_geracao ? format(new Date(row.data_geracao), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.periodo}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="Visualizar" onClick={() => handleView(row)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {row.origem === 'apuracao' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" title="Excluir" onClick={() => handleDelete(row)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 p-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
