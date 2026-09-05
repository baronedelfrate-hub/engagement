import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';

const ConciliacaoBancariaTable = ({ data = [], loading, selectedId, onSelect }) => {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-[500px]">
        <SkeletonLoader className="h-10 w-full mb-4 opacity-10" />
        <SkeletonLoader className="h-16 w-full mb-2 opacity-10" />
        <SkeletonLoader className="h-16 w-full mb-2 opacity-10" />
      </div>
    );
  }

  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg h-[600px] flex flex-col">
      <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          Baixas do Sistema
          <Badge variant="secondary" className="bg-slate-700">{safeData.length}</Badge>
        </h3>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-900 sticky top-0 z-10 shadow-sm">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-12 text-center"></TableHead>
              <TableHead className="text-slate-400 text-xs uppercase w-24">Data</TableHead>
              <TableHead className="text-slate-400 text-xs uppercase">Descrição</TableHead>
              <TableHead className="text-slate-400 text-xs uppercase text-right">Valor</TableHead>
              <TableHead className="text-slate-400 text-xs uppercase text-center w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeData.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={5} className="text-center text-slate-500 py-8">Nenhuma baixa encontrada</TableCell>
              </TableRow>
            ) : safeData.map((row) => {
              const isConciliado = row?.status_conciliacao === 'Conciliado';
              const isSelected = selectedId === row?.id;
              
              const dateVal = row?.data_baixa ? new Date(row.data_baixa).toLocaleDateString('pt-BR') : '-';
              const valorVal = typeof row?.valor === 'number' ? row.valor : 0;
              
              return (
                <TableRow 
                  key={row?.id || Math.random().toString()} 
                  className={`border-slate-800/50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-900/20' : 'hover:bg-slate-800/30'}`}
                  onClick={() => onSelect(isSelected ? null : row)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={(checked) => onSelect(checked ? row : null)}
                        disabled={isConciliado}
                        className="border-slate-600 data-[state=checked]:bg-blue-600"
                    />
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm whitespace-nowrap">
                    {dateVal}
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-200 text-sm truncate max-w-[180px]" title={row?.entidadeNome || ''}>
                      {row?.entidadeNome || 'S/N'}
                    </div>
                    <div className="text-slate-500 text-xs truncate">
                      {row?.bancoNome || ''}
                    </div>
                  </TableCell>
                  <TableCell className={`text-right font-medium whitespace-nowrap text-sm ${valorVal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {valorVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    {isConciliado ? (
                       <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" title="Conciliado" />
                    ) : (
                       <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" title="Pendente" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ConciliacaoBancariaTable;