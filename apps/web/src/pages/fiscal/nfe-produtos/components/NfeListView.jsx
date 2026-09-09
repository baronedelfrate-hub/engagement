import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Copy, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../utils/nfeFormatting';

export default function NfeListView({ data, loading }) {
  const navigate = useNavigate();

  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-24">Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Integrações</TableHead>
              <TableHead className="text-right w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  Nenhuma NF-e encontrada.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/80 transition-colors group"
                  onClick={() => navigate(`/fiscal/nfe-produtos/${item.id}`)}
                >
                  <TableCell className="font-medium text-foreground">
                    {item.numero || 'S/N'}{item.serie ? `-${item.serie}` : ''}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground truncate max-w-[200px]" title={item.clientes?.nome}>
                      {item.clientes?.nome || 'N/I'}
                    </div>
                    {item.pedidos_venda && <div className="text-[10px] text-muted-foreground">Ped: {item.pedidos_venda.numero}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.data_emissao)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-normal text-[10px] ${getStatusColor(item.status)}`}>
                      {item.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.integrado_financeiro && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900" title="Financeiro Integrado">FIN</span>}
                      {item.integrado_contabil && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900" title="Contabilidade Integrada">CONT</span>}
                    </div>
                  </TableCell>

                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => navigate(`/fiscal/nfe-produtos/${item.id}`)} title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(item.status === 'Em digitação' || item.status === 'Rejeitada') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={() => navigate(`/fiscal/nfe-produtos/${item.id}/editar`)} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {/* Duplicate placeholder logic */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Duplicar">
                        <Copy className="w-4 h-4" />
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