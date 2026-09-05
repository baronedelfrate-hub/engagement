import React from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function CompetenciasTab() {
  const { data } = useParametrosContabeis();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aberta': return 'bg-emerald-100 text-emerald-800';
      case 'fechada': return 'bg-amber-100 text-amber-800';
      case 'bloqueada': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Competência
        </Button>
      </div>
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Abertura</TableHead>
              <TableHead>Data Fechamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.competencias.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.competencia}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                </TableCell>
                <TableCell>{c.data_abertura ? format(new Date(c.data_abertura), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>{c.data_fechamento ? format(new Date(c.data_fechamento), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">Alterar Status</Button>
                </TableCell>
              </TableRow>
            ))}
            {data.competencias.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma competência registrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}