import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

export default function PedidoItemsDisplay({ items, type, totals }) {
  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-muted rounded-md border border-dashed my-4">
        Nenhum item de {type} encontrado neste pedido.
      </div>
    );
  }

  return (
    <div className="space-y-4 my-4">
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Descrição</TableHead>
              {type === 'produto' && <TableHead>NCM</TableHead>}
              {type === 'produto' && <TableHead>CFOP</TableHead>}
              {type === 'servico' && <TableHead>Cód. Serv.</TableHead>}
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Val. Unit</TableHead>
              <TableHead className="text-right">Desc.</TableHead>
              <TableHead className="text-right">Acrés.</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={item.id || idx}>
                <TableCell className="font-medium text-xs">
                  {item.descricao || item.produtos?.nome || item.servicos?.nome || 'Item sem descrição'}
                </TableCell>
                {type === 'produto' && <TableCell className="text-xs">{item.ncm || item.produtos?.ncm || '-'}</TableCell>}
                {type === 'produto' && <TableCell className="text-xs">{item.cfop || item.produtos?.cfop || '-'}</TableCell>}
                {type === 'servico' && <TableCell className="text-xs">{item.servicos?.codigo_servico_lc116 || '-'}</TableCell>}
                <TableCell className="text-right text-xs">{item.quantidade}</TableCell>
                <TableCell className="text-right text-xs">R$ {(item.valor_unitario || item.preco_unitario || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs text-red-500">R$ {(item.desconto || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs text-emerald-500">R$ {(item.acrescimo || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right text-xs font-bold">R$ {(item.valor_total || 0).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-muted">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Subtotal</p>
            <p className="font-semibold">R$ {totals.subtotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Descontos</p>
            <p className="font-semibold text-red-500">R$ {totals.descontos.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Acréscimos</p>
            <p className="font-semibold text-emerald-500">R$ {totals.acrescimos.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total Geral</p>
            <p className="font-bold text-lg text-blue-600">R$ {totals.total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}