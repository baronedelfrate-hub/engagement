import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCobranca } from '@/hooks/useCobranca';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Plus } from 'lucide-react';
import { formatCurrency, getPhaseSequence, PHASES } from '@/lib/cobrancaService';
import { useToast } from '@/components/ui/use-toast';
import { formatDateOnly } from '@/lib/dateUtils';

const CobrancaAddCardModal = ({ isOpen, onClose, onSuccess }) => {
  const { createCobranca } = useCobranca();
  const { clientes, loading: loadingDropdowns } = useFinanceiroDropdowns();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [contasReceber, setContasReceber] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  
  const [formData, setFormData] = useState({
    cliente_id: '',
    contas_receber_id: '',
    valor: '',
    data_vencimento: '',
    fase: 'd-3',
    observacoes: '',
    status: 'ativo'
  });

  // Fetch unpaid receivables when client changes
  useEffect(() => {
    const fetchReceivables = async () => {
      if (!selectedCliente) {
        setContasReceber([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('contas_receber')
        .select('id, numero, valor_original, data_vencimento')
        .eq('cliente_id', selectedCliente)
        .neq('status', 'Pago')
        .order('data_vencimento', { ascending: true });
        
      if (error) {
        console.error('Error fetching receivables:', error);
        toast({ title: 'Erro', description: 'Falha ao carregar títulos a receber.', variant: 'destructive' });
      }
      setContasReceber(data || []);
    };
    
    fetchReceivables();
  }, [selectedCliente, toast]);

  const handleClienteChange = (clienteId) => {
    setSelectedCliente(clienteId);
    setFormData(prev => ({ ...prev, cliente_id: clienteId, contas_receber_id: '', valor: '', data_vencimento: '' }));
  };

  const handleContaChange = (contaId) => {
    const conta = contasReceber.find(c => c.id === contaId);
    if (conta) {
      setFormData(prev => ({
        ...prev,
        contas_receber_id: contaId,
        valor: conta.valor_original,
        data_vencimento: conta.data_vencimento
      }));
    } else {
       setFormData(prev => ({
        ...prev,
        contas_receber_id: '',
        valor: '',
        data_vencimento: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.cliente_id || !formData.valor || !formData.data_vencimento) {
      toast({ title: 'Erro', description: 'Por favor, preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    const newCobranca = await createCobranca(formData);
    setLoading(false);
    if (newCobranca) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Select id="cliente" value={selectedCliente} onValueChange={handleClienteChange} disabled={loadingDropdowns}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione o cliente..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] bg-background border-border text-foreground">
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
             <Label htmlFor="contas_receber">Título em Aberto (Contas a Receber)</Label>
             <Select id="contas_receber" value={formData.contas_receber_id} onValueChange={handleContaChange} disabled={!selectedCliente || contasReceber.length === 0}>
               <SelectTrigger className="bg-background border-border">
                 <SelectValue placeholder={contasReceber.length === 0 && selectedCliente ? "Nenhum título pendente" : "Selecione o título..."} />
               </SelectTrigger>
               <SelectContent className="bg-background border-border text-foreground">
                 {contasReceber.map(c => (
                   <SelectItem key={c.id} value={c.id}>
                     {c.numero} - {formatCurrency(c.valor_original)} (Venc: {formatDateOnly(c.data_vencimento)})
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)*</Label>
              <Input 
                id="valor"
                value={formData.valor}
                onChange={e => setFormData({...formData, valor: e.target.value})}
                className="bg-background border-border"
                type="number"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_vencimento">Data Vencimento *</Label>
              <Input 
                id="data_vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fase">Fase Inicial</Label>
            <Select id="fase" value={formData.fase} onValueChange={v => setFormData({...formData, fase: v})}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border text-foreground">
                {getPhaseSequence().map(p => (
                   <SelectItem key={p} value={p}>{PHASES[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Iniciais</Label>
            <Textarea 
              id="observacoes"
              value={formData.observacoes}
              onChange={e => setFormData({...formData, observacoes: e.target.value})}
              className="bg-background border-border"
              placeholder="Detalhes iniciais..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Criar Cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobrancaAddCardModal;