import React from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function HistoricosPadraoTab() {
  const { data, deleteItem } = useParametrosContabeis();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Histórico
        </Button>
      </div>
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.historicos.map(h => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">{h.codigo}</TableCell>
                <TableCell>{h.descricao}</TableCell>
                <TableCell>{h.tipo}</TableCell>
                <TableCell>
                  <Badge variant={h.ativa ? 'default' : 'secondary'}>{h.ativa ? 'Ativa' : 'Inativa'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem('pc_historicos', h.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}