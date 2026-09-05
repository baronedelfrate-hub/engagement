import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, ChevronRight, FileText } from 'lucide-react';
import { usePedidoSearch } from '@/hooks/usePedidoSearch';
import PedidoItemsDisplay from './PedidoItemsDisplay';

export default function SearchPedidoModal({ isOpen, onClose, onSelect, type = 'produto' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [totals, setTotals] = useState(null);
  
  const { searchPedidos, filterItemsByType, calculateTotals, loading } = usePedidoSearch();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    const data = await searchPedidos(searchTerm);
    setResults(data);
    setSelectedPedido(null);
  };

  const handleSelectPedido = (pedido) => {
    setSelectedPedido(pedido);
    const items = filterItemsByType(pedido.pedidos_venda_itens, type);
    setFilteredItems(items);
    setTotals(calculateTotals(items));
  };

  const handleConfirm = () => {
    if (selectedPedido) {
      onSelect(selectedPedido);
      onClose();
    }
  };

  const resetAndClose = () => {
    setSearchTerm('');
    setResults([]);
    setSelectedPedido(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar Pedido para {type === 'produto' ? 'NF-e' : 'NFS-e'}</DialogTitle>
        </DialogHeader>

        {!selectedPedido ? (
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por número do pedido (ex: PV-296684) ou nome do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading || !searchTerm.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                Buscar
              </Button>
            </div>

            <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
              {results.length === 0 && !loading && searchTerm && (
                <div className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado. Tente buscar pelo número exato ou nome do cliente.</div>
              )}
              {results.length === 0 && !loading && !searchTerm && (
                <div className="p-8 text-center text-muted-foreground">Digite um termo para buscar pedidos.</div>
              )}
              {results.map((pedido) => (
                <div 
                  key={pedido.id} 
                  className="flex items-center justify-between p-4 hover:bg-muted cursor-pointer"
                  onClick={() => handleSelectPedido(pedido)}
                >
                  <div>
                    <div className="font-medium text-blue-600 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> {pedido.numero}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{pedido.clientes?.nome || 'Cliente não identificado'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">R$ {(pedido.valor_total || 0).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(pedido.data_emissao).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground ml-4" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center bg-muted p-4 rounded-md border">
              <div>
                <h4 className="font-bold text-lg">{selectedPedido.numero}</h4>
                <p className="text-sm text-muted-foreground">{selectedPedido.clientes?.nome}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedPedido(null)}>Voltar aos Resultados</Button>
            </div>

            <PedidoItemsDisplay items={filteredItems} type={type} totals={totals} />

            <DialogFooter>
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button 
                onClick={handleConfirm} 
                disabled={filteredItems.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Carregar {type === 'produto' ? 'NF-e' : 'NFS-e'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}