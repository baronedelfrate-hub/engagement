import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useDREBalancete } from '@/contexts/DREBalanceteContext';
import { formatCurrency } from '@/lib/dreBalanceteUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BalanceteTab() {
  const { balanceteData, balanceteSummary, filters, empresas } = useDREBalancete();

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
    <div className="space-y-6">
      
      {/* SUMMARY BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
            <p className="text-sm font-bold text-slate-500 uppercase mb-1">Status de Validação</p>
            {balanceteSummary.balanced ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-sm px-4 py-1">BALANÇO BATIDO</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 border-red-200 text-sm px-4 py-1">DIFERENÇA ENCONTRADA</Badge>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-500 uppercase">Total Débitos</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(balanceteSummary.totalDebitos)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-500 uppercase">Total Créditos</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(balanceteSummary.totalCreditos)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-500 uppercase">Diferença</p>
            <p className={`text-xl font-bold mt-1 ${balanceteSummary.diferenca === 0 ? 'text-slate-800' : 'text-red-600'}`}>
              {formatCurrency(balanceteSummary.diferenca)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 text-center py-6">
          <CardTitle className="text-2xl font-bold text-slate-800">Balancete de Verificação</CardTitle>
          <p className="text-slate-600 font-medium mt-1">{empresaName}</p>
          <p className="text-sm text-slate-500">Período: {formatMonth(filters.competencia)}</p>
          <p className="text-xs text-slate-400 mt-2">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 w-[15%]">Código</TableHead>
                  <TableHead className="font-bold text-slate-700 w-[35%]">Descrição da Conta</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Saldo Anterior</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Débitos</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Créditos</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceteData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">Nenhum dado de Balancete encontrado para esta competência.</TableCell>
                  </TableRow>
                ) : (
                  balanceteData.map((row, idx) => (
                    <TableRow key={row.id || idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <TableCell className="font-medium text-slate-700">{row.conta?.codigo}</TableCell>
                      <TableCell className="text-slate-700">{row.conta?.nome}</TableCell>
                      <TableCell className="text-right text-slate-600">{formatCurrency(row.saldo_anterior)}</TableCell>
                      <TableCell className="text-right text-blue-700">{formatCurrency(row.debitos)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(row.creditos)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-800">{formatCurrency(row.saldo_final)}</TableCell>
                    </TableRow>
                  ))
                )}
                {/* Grand Totals Footer inside Table */}
                {balanceteData.length > 0 && (
                  <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                    <TableCell colSpan={3} className="font-bold text-slate-800 text-right uppercase">Totais Gerais:</TableCell>
                    <TableCell className="text-right font-bold text-blue-800">{formatCurrency(balanceteSummary.totalDebitos)}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-800">{formatCurrency(balanceteSummary.totalCreditos)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800">-</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}