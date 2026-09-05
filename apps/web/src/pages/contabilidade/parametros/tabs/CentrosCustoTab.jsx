import React from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export default function CentrosCustoTab() {
  const { data } = useParametrosContabeis();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Centro de Custo
        </Button>
      </div>
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.centrosCusto.map(cc => (
              <TableRow key={cc.id}>
                <TableCell className="font-medium">{cc.codigo}</TableCell>
                <TableCell>{cc.nome}</TableCell>
                <TableCell>{cc.descricao}</TableCell>
                <TableCell>
                  <Badge variant={cc.ativo ? 'default' : 'secondary'}>{cc.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {data.centrosCusto.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhum centro de custo encontrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}