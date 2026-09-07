import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Eye, Edit, RotateCcw, Send } from 'lucide-react';
import { format } from 'date-fns';

export default function UltimosFechamentos({ data = [] }) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'fechado' || s === 'concluído') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">Fechado</Badge>;
    if (s === 'aberto' || s === 'pendente') return <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">Aberto</Badge>;
    if (s === 'em andamento') return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">Em andamento</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card className="shadow-sm border-border bg-background">
      <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <Calendar className="w-4 h-4 text-purple-500" /> Últimos Fechamentos
        </CardTitle>
        <Badge variant="outline" className="bg-background">{data.length} registros</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Data de Fechamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Docs Inclusos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum fechamento registrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted transition-colors">
                    <TableCell className="font-medium text-foreground">{row.periodo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.data_fechamento ? format(new Date(row.data_fechamento), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.responsavel}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <Badge variant="secondary" className="bg-muted text-foreground">{row.documentos || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {row.status?.toLowerCase() === 'aberto' ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-orange-600" title="Reabrir">
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600" title="Enviar Contabilidade">
                        <Send className="w-4 h-4" />
                      </Button>
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