import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';

const FormularioEntradaManualModal = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorLog, setErrorLog] = useState(null);

  const [formData, setFormData] = useState({
    numero: '',
    serie: '',
    data_emissao: new Date().toISOString().split('T')[0],
    fornecedor_id: '',
    valor_total: '',
    itens: []
  });

  const [newItem, setNewItem] = useState({ descricao: '', quantidade: 1, valor_unitario: 0, codigo: '' });

  useEffect(() => {
    if (isOpen) {
      supabase.from('fornecedores').select('id, nome, fantasia').eq('ativo', true).order('nome')
        .then(({ data }) => setFornecedores(data || []));
      setFormData({
        numero: '',
        serie: '',
        data_emissao: new Date().toISOString().split('T')[0],
        fornecedor_id: '',
        valor_total: '',
        itens: []
      });
      setErrorLog(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    if (!newItem.descricao || newItem.valor_unitario <= 0) {
      toast({ title: "Erro", description: "Preencha descrição e valor unitário válido.", variant: "destructive" });
      return;
    }
    const itemTotal = parseFloat(newItem.quantidade) * parseFloat(newItem.valor_unitario);
    const item = { ...newItem, valor_total: itemTotal, id: Date.now().toString() };

    setFormData(prev => {
        const newItens = [...prev.itens, item];
        const newTotal = newItens.reduce((acc, i) => acc + i.valor_total, 0);
        return { ...prev, itens: newItens, valor_total: newTotal.toString() };
    });
    setNewItem({ descricao: '', quantidade: 1, valor_unitario: 0, codigo: '' });
  };

  const handleRemoveItem = (id) => {
    setFormData(prev => {
        const newItens = prev.itens.filter(i => i.id !== id);
        const newTotal = newItens.reduce((acc, i) => acc + i.valor_total, 0);
        return { ...prev, itens: newItens, valor_total: newTotal.toString() };
    });
  };

  const handleSubmit = async () => {
    if (!formData.numero || !formData.fornecedor_id || !formData.data_emissao) {
      toast({ title: "Campos Obrigatórios", description: "Preencha Número, Data e Fornecedor.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setErrorLog(null);

    try {
        const { data: nota, error: notaError } = await insertWithCompanyId('notas_fiscais_entrada', {
            numero_nfe: formData.numero,
            serie: formData.serie,
            fornecedor_id: formData.fornecedor_id,
            data_emissao: formData.data_emissao,
            valor_total: parseFloat(formData.valor_total || 0),
            status: 'Pendente',
            tipo_nota: 'DANFE',
            origem: 'MANUAL',
        }, { chain: (q) => q.select().single() });
        if (notaError) throw notaError;

        if (formData.itens.length > 0) {
            const { error: itensError } = await insertWithCompanyId('notas_fiscais_itens', formData.itens.map(item => ({
                nfe_id: nota.id,
                codigo: item.codigo,
                descricao: item.descricao,
                quantidade: parseFloat(item.quantidade),
                preco_unitario: parseFloat(item.valor_unitario),
                valor_total: item.valor_total,
            })));
            if (itensError) throw itensError;
        }

        toast({
            title: "Nota Registrada",
            description: `Nota ${nota.numero_nfe} adicionada ao quadro para conferência.`,
            className: "bg-green-600 text-white"
        });
        onSuccess();
        onClose();
    } catch (err) {
        setErrorLog("Erro de Banco de Dados: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Entrada Manual de Nota Fiscal</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Fornecedor *</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(val) => setFormData(prev => ({ ...prev, fornecedor_id: val }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.fantasia || f.nome}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Número *</Label>
                    <Input name="numero" value={formData.numero} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label>Série</Label>
                    <Input name="serie" value={formData.serie} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label>Emissão *</Label>
                    <Input type="date" name="data_emissao" value={formData.data_emissao} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                    <Label>Valor Total (R$) *</Label>
                    <Input type="number" name="valor_total" value={formData.valor_total} onChange={handleInputChange} readOnly />
                </div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-muted/10 space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-muted-foreground">Itens da Nota</h4>
                </div>

                <div className="grid grid-cols-12 gap-2 items-end">
                     <div className="col-span-5">
                        <Label className="text-xs">Descrição</Label>
                        <Input className="h-8 text-xs" value={newItem.descricao} onChange={(e) => setNewItem({...newItem, descricao: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                        <Label className="text-xs">Qtd</Label>
                        <Input type="number" className="h-8 text-xs" value={newItem.quantidade} onChange={(e) => setNewItem({...newItem, quantidade: e.target.value})} />
                     </div>
                     <div className="col-span-3">
                        <Label className="text-xs">Vlr. Unit.</Label>
                        <Input type="number" className="h-8 text-xs" value={newItem.valor_unitario} onChange={(e) => setNewItem({...newItem, valor_unitario: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                        <Button size="sm" onClick={handleAddItem} className="w-full h-8" variant="secondary">
                            <Plus className="h-3 w-3 mr-1" /> Add
                        </Button>
                     </div>
                </div>

                {formData.itens.length > 0 && (
                    <div className="bg-card rounded border border-border p-2 text-xs">
                         {formData.itens.map(item => (
                            <div key={item.id} className="flex justify-between py-1 border-b border-border last:border-0 text-foreground">
                                <span>{item.quantidade}x {item.descricao}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono">R$ {item.valor_total.toFixed(2)}</span>
                                    <Trash2 className="h-3 w-3 text-destructive cursor-pointer" onClick={() => handleRemoveItem(item.id)} />
                                </div>
                            </div>
                         ))}
                    </div>
                )}
            </div>

            {errorLog && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 flex gap-2 items-start dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                        <strong>Falha ao Salvar:</strong>
                        <p>{errorLog}</p>
                    </div>
                </div>
            )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isProcessing} className="bg-blue-600 text-white hover:bg-blue-700">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Registrar Nota e Integrar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormularioEntradaManualModal;
