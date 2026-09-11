import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

export default function UltimosDocumentosEnviados({ data = [] }) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const navigate = useNavigate();
  const { toast } = useToast();

  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s === 'enviado' || s === 'concluído') return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">Enviado</Badge>;
    if (s === 'pendente') return <Badge className="bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">Pendente</Badge>;
    if (s === 'erro') return <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">Erro</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const handleDownload = (row) => {
    if (!row.arquivo_url) {
      toast({ title: "Sem arquivo", description: "Este documento não tem arquivo anexado.", variant: "destructive" });
      return;
    }
    window.open(row.arquivo_url, '_blank');
  };

  return (
    <Card className="shadow-sm border-border bg-background">
      <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
          <Send className="w-4 h-4 text-blue-500" /> Últimos Documentos Enviados
        </CardTitle>
        <Badge variant="outline" className="bg-background">{data.length} registros</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Número / Descrição</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum documento enviado recentemente.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted transition-colors">
                    <TableCell className="font-medium text-foreground">{row.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">{row.numero || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.data_envio ? format(new Date(row.data_envio), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.destinatario || 'Contabilidade'}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="Visualizar" onClick={() => navigate(`/contabilidade/documentos/${row.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" title="Baixar" onClick={() => handleDownload(row)}>
                        <Download className="w-4 h-4" />
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
