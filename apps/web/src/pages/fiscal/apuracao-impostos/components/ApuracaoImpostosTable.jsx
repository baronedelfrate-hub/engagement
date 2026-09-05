import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Loader2, FileText } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../utils/apuracaoUtils';

export default function ApuracaoImpostosTable({ data, loading, onDelete }) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Imposto</TableHead>
              <TableHead className="text-right">Base Calc.</TableHead>
              <TableHead className="text-right">Alíquota</TableHead>
              <TableHead className="text-right">Valor Apurado</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  Nenhuma apuração encontrada.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/80 transition-colors group"
                  onClick={() => navigate(`/fiscal/apuracao-impostos/${item.id}`)}
                >
                  <TableCell className="font-medium text-foreground">{item.periodo_referencia}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded text-xs">
                      {item.tipo_imposto}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(item.base_calculo)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.aliquota}%</TableCell>
                  <TableCell className="text-right font-bold text-foreground">{formatCurrency(item.valor_apurado)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.vencimento)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-normal text-[10px] ${getStatusColor(item.status)}`}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => navigate(`/fiscal/apuracao-impostos/${item.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={() => navigate(`/fiscal/apuracao-impostos/${item.id}/editar`)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => onDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}