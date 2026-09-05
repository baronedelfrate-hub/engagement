import React from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function LayoutsExportacaoTab() {
  const { data, deleteItem } = useParametrosContabeis();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Layout
        </Button>
      </div>
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.layouts.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell>{l.tipo}</TableCell>
                <TableCell>{l.formato}</TableCell>
                <TableCell>
                  <Badge variant={l.ativa ? 'default' : 'secondary'}>{l.ativa ? 'Ativo' : 'Inativo'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem('pc_layouts', l.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data.layouts.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum layout encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}