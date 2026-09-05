import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function PendenciasDoMes({ data = [] }) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'pendente') return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Pendente</Badge>;
    if (s === 'em andamento') return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Em andamento</Badge>;
    if (s === 'erro') return <Badge className="bg-red-100 text-red-800 border-red-200">Erro</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <AlertCircle className="w-4 h-4 text-orange-500" /> Pendências do Mês
        </CardTitle>
        <Badge variant="outline" className="bg-white">{data.length} registros</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
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
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhuma pendência encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-700">{row.tipo}</TableCell>
                    <TableCell className="text-slate-600 truncate max-w-[200px]">{row.descricao}</TableCell>
                    <TableCell className="text-slate-600">
                      {row.data ? format(new Date(row.data), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-slate-600">{row.responsavel}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
                        Resolver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-2 p-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600">
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