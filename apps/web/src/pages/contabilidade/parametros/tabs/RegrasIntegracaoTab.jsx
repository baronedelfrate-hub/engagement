import React from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function RegrasIntegracaoTab() {
  const { data, deleteItem } = useParametrosContabeis();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Regra
        </Button>
      </div>
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Tipo Integração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.regras.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.modulo_origem}</TableCell>
                <TableCell>{r.modulo_destino}</TableCell>
                <TableCell>{r.tipo_integracao}</TableCell>
                <TableCell>
                  <Badge variant={r.ativa ? 'default' : 'secondary'}>{r.ativa ? 'Ativa' : 'Inativa'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem('pc_regras_integracao', r.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data.regras.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma regra configurada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}