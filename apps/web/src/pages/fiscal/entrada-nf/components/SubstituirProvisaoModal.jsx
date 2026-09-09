import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '../../utils/entradaNFUtils';
import { entradaNFService } from '../../services/entradaNFService';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SubstituirProvisaoModal({ isOpen, onClose, nota, onSuccess }) {
  const [provisoes, setProvisoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && nota) {
      loadProvisoes();
    } else {
      setProvisoes([]);
      setSelectedId(null);
    }
  }, [isOpen, nota]);

  const loadProvisoes = async () => {
    setLoading(true);
    try {
      const data = await entradaNFService.findMatchingProvisoes(
        nota.fornecedor_id,
        nota.valor_total,
        nota.data_emissao
      );
      setProvisoes(data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as provisões.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await entradaNFService.replaceProvisao(selectedId, nota);
      toast({ title: "Sucesso", description: "Provisão substituída e vinculada com sucesso." });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao substituir provisão.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Substituir Provisão</DialogTitle>
          <DialogDescription>
            Selecione uma provisão existente no Contas a Pagar para vincular a esta Nota Fiscal.
            O valor da provisão será atualizado para {formatCurrency(nota?.valor_total)}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : provisoes.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground bg-muted rounded-md">
              Nenhuma provisão correspondente encontrada (valor similar e mesmo fornecedor).
            </div>
          ) : (
            <div className="border rounded-md max-h-[300px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted sticky top-0">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provisoes.map((prov) => (
                    <TableRow 
                      key={prov.id} 
                      className={`cursor-pointer ${selectedId === prov.id ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                      onClick={() => setSelectedId(prov.id)}
                    >
                      <TableCell>
                        <input 
                          type="radio" 
                          checked={selectedId === prov.id} 
                          onChange={() => setSelectedId(prov.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </TableCell>
                      <TableCell>{formatDate(prov.data_vencimento)}</TableCell>
                      <TableCell className="truncate max-w-[200px]">{prov.observacoes || 'Provisão'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(prov.valor_original)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedId || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirmar Substituição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}