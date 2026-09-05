import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronLeft, ChevronRight, Download, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function UltimosRelatorios({ data = [] }) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'disponível' || s === 'concluído') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Disponível</Badge>;
    if (s === 'gerando' || s === 'pendente') return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Gerando</Badge>;
    if (s === 'erro') return <Badge className="bg-red-100 text-red-800 border-red-200">Erro</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <BarChart3 className="w-4 h-4 text-emerald-500" /> Últimos Relatórios e Importações
        </CardTitle>
        <Badge variant="outline" className="bg-white">{data.length} registros</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
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
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum relatório encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-700">{row.tipo}</TableCell>
                    <TableCell className="text-slate-600 truncate max-w-[200px]">{row.descricao}</TableCell>
                    <TableCell className="text-slate-600">
                      {row.data_geracao ? format(new Date(row.data_geracao), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">{row.periodo}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600" title="Baixar">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600" title="Excluir">
                        <Trash2 className="w-4 h-4" />
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