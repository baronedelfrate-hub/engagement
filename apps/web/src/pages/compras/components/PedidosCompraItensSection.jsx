import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

const emptyItem = { produto_id: '', quantidade: 1, preco_unitario: 0, desconto: 0, valor_total: 0 };

const calcTotal = (item) => {
  const qtd = parseFloat(item.quantidade) || 0;
  const preco = parseFloat(item.preco_unitario) || 0;
  const desconto = parseFloat(item.desconto) || 0;
  return Math.max(0, qtd * preco - desconto);
};

export default function PedidosCompraItensSection({ itens, setItens, produtos }) {
  const handleAdd = () => {
    setItens([...itens, { ...emptyItem }]);
  };

  const handleRemove = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const newItens = itens.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'produto_id') {
        const produto = produtos.find(p => p.id === value);
        if (produto?.preco_custo && !item.preco_unitario) {
          updated.preco_unitario = produto.preco_custo;
        }
      }
      updated.valor_total = calcTotal(updated);
      return updated;
    });
    setItens(newItens);
  };

  const totalGeral = itens.reduce((sum, i) => sum + (parseFloat(i.valor_total) || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Itens do Pedido</CardTitle>
        <Button type="button" onClick={handleAdd} size="sm" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border rounded-md">
            <thead className="bg-muted border-b text-muted-foreground">
              <tr>
                <th className="px-3 py-2 min-w-[220px]">Produto</th>
                <th className="px-3 py-2 w-24 text-right">Qtd</th>
                <th className="px-3 py-2 w-32 text-right">Preço Unit. (R$)</th>
                <th className="px-3 py-2 w-32 text-right">Desconto (R$)</th>
                <th className="px-3 py-2 w-32 text-right">Total</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum item adicionado. O valor total do pedido pode ser digitado manualmente acima.
                  </td>
                </tr>
              ) : (
                itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <select
                        value={item.produto_id}
                        onChange={(e) => handleChange(idx, 'produto_id', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                      >
                        <option value="">Selecione...</option>
                        {produtos.map(p => (
                          <option key={p.id} value={p.id}>{p.sku ? `[${p.sku}] ` : ''}{p.nome}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" step="0.01" value={item.quantidade}
                        onChange={(e) => handleChange(idx, 'quantidade', e.target.value)}
                        className="text-right h-9" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" step="0.01" value={item.preco_unitario}
                        onChange={(e) => handleChange(idx, 'preco_unitario', e.target.value)}
                        className="text-right h-9" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min="0" step="0.01" value={item.desconto}
                        onChange={(e) => handleChange(idx, 'desconto', e.target.value)}
                        className="text-right h-9" />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      R$ {calcTotal(item).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleRemove(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {itens.length > 0 && (
              <tfoot>
                <tr className="border-t font-semibold">
                  <td colSpan="4" className="px-3 py-2 text-right text-muted-foreground">Total dos Itens</td>
                  <td className="px-3 py-2 text-right text-foreground">R$ {totalGeral.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
