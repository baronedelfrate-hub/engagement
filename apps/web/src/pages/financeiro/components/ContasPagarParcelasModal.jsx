import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const ContasPagarParcelasModal = ({ isOpen, onClose, grupoId }) => {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && grupoId) {
      loadParcelas();
    }
  }, [isOpen, grupoId]);

  const loadParcelas = async () => {
    setLoading(true);
    try {
      // Query main table contas_pagar instead of separate table
      const { data, error } = await supabase
        .from('contas_pagar')
        .select('*')
        .eq('parcela_grupo_id', grupoId)
        .order('parcela_atual', { ascending: true });

      if (error) throw error;
      setParcelas(data || []);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as parcelas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
        const { error } = await supabase
            .from('contas_pagar')
            .update({ status: 'Pago', valor_pago: parcelas.find(p => p.id === id)?.valor_original })
            .eq('id', id);
        
        if (error) throw error;
        
        toast({ title: "Sucesso", description: "Parcela marcada como paga." });
        loadParcelas();
    } catch (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const totalOriginal = parcelas.reduce((acc, p) => acc + (parseFloat(p.valor_original) || 0), 0);
  const totalPago = parcelas
    .filter(p => p.status === 'Pago')
    .reduce((acc, p) => acc + (parseFloat(p.valor_original) || 0), 0);
  
  const progress = totalOriginal > 0 ? (totalPago / totalOriginal) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Detalhamento do Parcelamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
            ) : parcelas.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">Nenhuma parcela encontrada para este grupo.</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-muted p-3 rounded-lg border border-border">
                            <span className="text-xs text-muted-foreground block uppercase">Total do Parcelamento</span>
                            <span className="text-lg font-bold text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOriginal)}
                            </span>
                            <span className="text-xs text-muted-foreground block mt-1">{parcelas.length} parcelas</span>
                        </div>
                        <div className="bg-muted p-3 rounded-lg border border-border">
                            <span className="text-xs text-muted-foreground block uppercase">Total Quitado</span>
                            <span className="text-lg font-bold text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPago)}
                            </span>
                            <div className="w-full bg-background h-1.5 mt-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-background text-muted-foreground text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left">Parc.</th>
                                    <th className="px-4 py-3 text-left">Vencimento</th>
                                    <th className="px-4 py-3 text-left">Valor</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {parcelas.map((p) => (
                                    <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-muted-foreground">{p.parcela_atual}/{p.numero_parcelas}</td>
                                        <td className="px-4 py-3">{new Date(p.data_vencimento).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 font-medium">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_original)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={
                                                p.status === 'Pago' 
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            }>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <Button 
                                                size="sm" variant="ghost" 
                                                onClick={() => { onClose(); navigate(`/financeiro/contas-pagar/${p.id}`); }}
                                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                title="Ver Detalhes"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                            {p.status !== 'Pago' && (
                                                <Button 
                                                    size="sm" variant="ghost" 
                                                    onClick={() => handleMarkAsPaid(p.id)}
                                                    className="h-7 text-xs hover:bg-emerald-900/20 hover:text-emerald-400"
                                                >
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Pagar
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContasPagarParcelasModal;