import React, { useState } from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function VinculacaoFinanceiroContabilTab() {
  const { data, deleteItem } = useParametrosContabeis();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Vinculação
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo de Documento</TableHead>
              <TableHead>Conta Financeira</TableHead>
              <TableHead>Conta Contábil</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.vinculacoes.map(v => (
              <TableRow key={v.id}>
                <TableCell>{v.tipo_documento}</TableCell>
                <TableCell>{v.conta_financeira}</TableCell>
                <TableCell>{data.contas.find(c => c.id === v.conta_contabil_id)?.descricao || '-'}</TableCell>
                <TableCell>{data.centrosCusto.find(c => c.id === v.centro_custo_id)?.nome || '-'}</TableCell>
                <TableCell>
                  <Badge variant={v.ativa ? 'default' : 'secondary'}>{v.ativa ? 'Ativa' : 'Inativa'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem('pc_vinculacoes', v.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {data.vinculacoes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhuma vinculação encontrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}