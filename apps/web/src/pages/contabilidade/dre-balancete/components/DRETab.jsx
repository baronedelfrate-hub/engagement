import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDREBalancete } from '@/contexts/DREBalanceteContext';
import { formatCurrency, formatPercentage, calculateVariation } from '@/lib/dreBalanceteUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DRETab() {
  const { dreData, filters, empresas } = useDREBalancete();

  const selectedEmpresa = empresas.find(e => e.id === filters.empresa_id);
  const empresaName = selectedEmpresa ? (selectedEmpresa.nome_fantasia || selectedEmpresa.razao_social) : 'Todas as Empresas';

  const formatMonth = (str) => {
    if (!str) return '-';
    try {
      const [year, month] = str.split('-');
      return format(new Date(year, parseInt(month) - 1), 'MMMM yyyy', { locale: ptBR }).toUpperCase();
    } catch {
      return str;
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100 text-center py-6">
        <CardTitle className="text-2xl font-bold text-slate-800">Demonstração do Resultado do Exercício (DRE)</CardTitle>
        <p className="text-slate-600 font-medium mt-1">{empresaName}</p>
        <p className="text-sm text-slate-500">Período: {formatMonth(filters.competencia)} {filters.comparacao && `vs ${formatMonth(filters.comparacao)}`}</p>
        <p className="text-xs text-slate-400 mt-2">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="w-[50%] font-bold text-slate-700">Descrição</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Valor (R$)</TableHead>
                {filters.comparacao && <TableHead className="text-right font-bold text-slate-700">Anterior (R$)</TableHead>}
                {filters.mostrarVariacao && filters.comparacao && <TableHead className="text-right font-bold text-slate-700">Variação (R$)</TableHead>}
                {filters.mostrarPercentual && <TableHead className="text-right font-bold text-slate-700">Variação (%)</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dreData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">Nenhum dado de DRE encontrado para esta competência.</TableCell>
                </TableRow>
              ) : (
                dreData.filter(item => filters.mostrarDetalhes || item.level === 0).map((row, idx) => {
                  const { amount, percentage } = calculateVariation(row.valor_atual, row.valor_anterior);
                  
                  // Row styling based on type
                  let rowClass = "border-b border-slate-100 ";
                  let textClass = "text-slate-700 ";
                  let indentClass = "";

                  if (row.level === 1) {
                    indentClass = "pl-8 text-sm";
                    textClass = "text-slate-600";
                  }

                  if (row.isHeader) {
                    rowClass += "bg-slate-50 font-semibold";
                    textClass = "text-slate-800";
                  }

                  if (row.isTotal) {
                    rowClass += "bg-blue-50/50 font-bold border-t-2 border-blue-100";
                    textClass = "text-blue-800";
                  }

                  if (row.isGrandTotal) {
                    rowClass += "bg-emerald-50 font-bold border-t-2 border-emerald-200";
                    textClass = row.valor_atual >= 0 ? "text-emerald-700 text-lg" : "text-red-600 text-lg";
                  }

                  return (
                    <TableRow key={idx} className={`hover:bg-slate-50 transition-colors ${rowClass}`}>
                      <TableCell className={`${indentClass} ${textClass}`}>
                        {row.label || row.descricao}
                      </TableCell>
                      <TableCell className={`text-right ${textClass}`}>
                        {formatCurrency(row.valor_atual)}
                      </TableCell>
                      
                      {filters.comparacao && (
                        <TableCell className="text-right text-slate-500">
                          {formatCurrency(row.valor_anterior)}
                        </TableCell>
                      )}
                      
                      {filters.mostrarVariacao && filters.comparacao && (
                        <TableCell className={`text-right ${amount > 0 ? 'text-emerald-600' : amount < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {amount > 0 ? '+' : ''}{formatCurrency(amount)}
                        </TableCell>
                      )}
                      
                      {filters.mostrarPercentual && (
                        <TableCell className={`text-right ${percentage > 0 ? 'text-emerald-600' : percentage < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {percentage > 0 ? '+' : ''}{formatPercentage(percentage)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}