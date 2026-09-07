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
    <Card className="border-border shadow-sm overflow-hidden">
      <CardHeader className="bg-muted border-b border-border text-center py-6">
        <CardTitle className="text-2xl font-bold text-foreground">Demonstração do Resultado do Exercício (DRE)</CardTitle>
        <p className="text-muted-foreground font-medium mt-1">{empresaName}</p>
        <p className="text-sm text-muted-foreground">Período: {formatMonth(filters.competencia)} {filters.comparacao && `vs ${formatMonth(filters.comparacao)}`}</p>
        <p className="text-xs text-muted-foreground mt-2">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[50%] font-bold text-foreground">Descrição</TableHead>
                <TableHead className="text-right font-bold text-foreground">Valor (R$)</TableHead>
                {filters.comparacao && <TableHead className="text-right font-bold text-foreground">Anterior (R$)</TableHead>}
                {filters.mostrarVariacao && filters.comparacao && <TableHead className="text-right font-bold text-foreground">Variação (R$)</TableHead>}
                {filters.mostrarPercentual && <TableHead className="text-right font-bold text-foreground">Variação (%)</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dreData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum dado de DRE encontrado para esta competência.</TableCell>
                </TableRow>
              ) : (
                dreData.filter(item => filters.mostrarDetalhes || item.level === 0).map((row, idx) => {
                  const { amount, percentage } = calculateVariation(row.valor_atual, row.valor_anterior);
                  
                  // Row styling based on type
                  let rowClass = "border-b border-border ";
                  let textClass = "text-foreground ";
                  let indentClass = "";

                  if (row.level === 1) {
                    indentClass = "pl-8 text-sm";
                    textClass = "text-muted-foreground";
                  }

                  if (row.isHeader) {
                    rowClass += "bg-muted font-semibold";
                    textClass = "text-foreground";
                  }

                  if (row.isTotal) {
                    rowClass += "bg-blue-50/50 dark:bg-blue-950/20 font-bold border-t-2 border-blue-100 dark:border-blue-900";
                    textClass = "text-blue-800 dark:text-blue-400";
                  }

                  if (row.isGrandTotal) {
                    rowClass += "bg-emerald-50 dark:bg-emerald-950/30 font-bold border-t-2 border-emerald-200 dark:border-emerald-800";
                    textClass = row.valor_atual >= 0 ? "text-emerald-700 dark:text-emerald-400 text-lg" : "text-red-600 dark:text-red-400 text-lg";
                  }

                  return (
                    <TableRow key={idx} className={`hover:bg-muted transition-colors ${rowClass}`}>
                      <TableCell className={`${indentClass} ${textClass}`}>
                        {row.label || row.descricao}
                      </TableCell>
                      <TableCell className={`text-right ${textClass}`}>
                        {formatCurrency(row.valor_atual)}
                      </TableCell>
                      
                      {filters.comparacao && (
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.valor_anterior)}
                        </TableCell>
                      )}
                      
                      {filters.mostrarVariacao && filters.comparacao && (
                        <TableCell className={`text-right ${amount > 0 ? 'text-emerald-600' : amount < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {amount > 0 ? '+' : ''}{formatCurrency(amount)}
                        </TableCell>
                      )}
                      
                      {filters.mostrarPercentual && (
                        <TableCell className={`text-right ${percentage > 0 ? 'text-emerald-600' : percentage < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
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