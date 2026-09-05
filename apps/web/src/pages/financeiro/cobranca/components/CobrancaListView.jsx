import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, PHASES, calculatePhaseByDueDate } from '@/lib/cobrancaService';
import { Edit } from 'lucide-react';

const CobrancaListView = ({ items, onEdit }) => {
  
  const getDueDateBadge = (date) => {
    const { dias_ate_vencimento } = calculatePhaseByDueDate(date);
    
    if (dias_ate_vencimento > 0) return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 whitespace-nowrap">No Prazo ({dias_ate_vencimento}d)</Badge>;
    if (dias_ate_vencimento === 0) return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/10 whitespace-nowrap">Vence Hoje</Badge>;
    return <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 whitespace-nowrap">{Math.abs(dias_ate_vencimento)}d Atraso</Badge>;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-950">
          <TableRow className="border-slate-800">
            <TableHead className="text-slate-400">Cliente</TableHead>
            <TableHead className="text-slate-400">Fase (Automática)</TableHead>
            <TableHead className="text-slate-400">Valor</TableHead>
            <TableHead className="text-slate-400">Vencimento</TableHead>
            <TableHead className="text-slate-400">Prazo</TableHead>
            <TableHead className="text-slate-400">Responsável</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-right text-slate-400">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell className="font-medium text-slate-200">{item.cliente?.nome}</TableCell>
                <TableCell>
                  <Badge className={`${PHASES[item.fase]?.color} text-white hover:${PHASES[item.fase]?.color}`}>
                    {PHASES[item.fase]?.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-200 font-mono">{formatCurrency(item.valor)}</TableCell>
                <TableCell className="text-slate-300">{new Date(item.data_vencimento).toLocaleDateString()}</TableCell>
                <TableCell>
                    {getDueDateBadge(item.data_vencimento)}
                </TableCell>
                <TableCell className="text-slate-300">{item.responsavel?.nome || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded border ${
                    item.status === 'ativo' ? 'bg-blue-900/20 text-blue-400 border-blue-900' :
                    item.status === 'resolvido' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {item.status.toUpperCase()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-slate-400 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CobrancaListView;