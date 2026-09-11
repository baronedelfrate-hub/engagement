import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function PendenciasDoMes({ data = [] }) {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'pendente') return <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">Pendente</Badge>;
    if (s === 'em andamento') return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">Em andamento</Badge>;
    if (s === 'erro') return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">Erro</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card className="shadow-sm border-border bg-background">
      <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <AlertCircle className="w-4 h-4 text-orange-500" /> Pendências do Mês
        </CardTitle>
        <Badge variant="outline" className="bg-background">{data.length} registros</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[150px]">Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Responsável</TableHead>
                <TableHead className="text-right w-[100px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma pendência encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted transition-colors">
                    <TableCell className="font-medium text-foreground">{row.tipo}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">{row.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.data ? format(new Date(row.data), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.responsavel}</TableCell>
                    <TableCell className="text-right">
                      {row.tipo === 'Lançamento Contábil' ? (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30" onClick={() => navigate(`/contabilidade/lancamentos/${row.id}/editar`)}>
                          Resolver
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30" onClick={() => navigate(`/contabilidade/conciliacoes/${row.id}`)}>
                          Resolver
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