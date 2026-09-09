import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { storage } from '@/lib/storage';

function RecebimentoModal({ isOpen, onClose, pedido, onSave }) {
  const [itemsState, setItemsState] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [servicos, setServicos] = useState([]);

  useEffect(() => {
    setProdutos(storage.get('PRODUTOS') || []);
    setServicos(storage.get('SERVICOS') || []);

    if (pedido && pedido.itens) {
      setItemsState(pedido.itens.map(item => ({
        ...item,
        receberAgora: Math.max(0, item.quantidade - (item.quantidadeRecebida || 0)), // Don't allow negative
        divergencia: false,
        justificativa: ''
      })));
    }
  }, [pedido, isOpen]);

  const getItemName = (itemId, type) => {
    if (type === 'produto') {
      const product = produtos.find(p => p.id === itemId);
      return product ? product.nome : itemId;
    } else if (type === 'servico') {
      const service = servicos.find(s => s.id === itemId);
      return service ? service.nome : itemId;
    }
    return itemId;
  };

  const handleChange = (index, field, value) => {
    const newItems = [...itemsState];
    if (field === 'receberAgora') {
        newItems[index][field] = parseFloat(value);
    } else {
        newItems[index][field] = value;
    }
    setItemsState(newItems);
  };

  const handleSave = () => {
    onSave(itemsState);
    onClose();
  };

  if (!pedido) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Recebimento de Mercadoria - Pedido {pedido.numeroPedido}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900">
            <p>Confirme as quantidades recebidas. Isso irá gerar uma entrada automática no estoque.</p>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-24">Qtd Pedida</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-24">Já Recebido</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-28">Receber Agora</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground w-16">Diverg.?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itemsState.map((item, index) => (
                  <React.Fragment key={item.id || index}>
                    <tr className="bg-background">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                           {getItemName(item.itemId, item.tipo)}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{item.tipo}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{item.quantidade}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.quantidadeRecebida || 0}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          max={item.quantidade - (item.quantidadeRecebida || 0)}
                          value={item.receberAgora}
                          onChange={(e) => handleChange(index, 'receberAgora', e.target.value)}
                          className="h-8 w-24 bg-background border-border text-foreground"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.divergencia}
                          onChange={(e) => handleChange(index, 'divergencia', e.target.checked)}
                          className="rounded border-border text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                    {item.divergencia && (
                      <tr className="bg-yellow-50/50 dark:bg-yellow-950/20">
                        <td colSpan="5" className="px-4 py-3 pb-4">
                          <div className="flex gap-3 items-start">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-2" />
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs text-yellow-700 dark:text-yellow-400">Justificativa da Divergência</Label>
                              <Textarea
                                value={item.justificativa}
                                onChange={(e) => handleChange(index, 'justificativa', e.target.value)}
                                placeholder="Descreva o problema (ex: avaria, preço diferente, produto incorreto)..."
                                className="h-16 text-xs bg-background border-border text-foreground"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RecebimentoModal;