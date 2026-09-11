import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCobranca } from '@/hooks/useCobranca';
import { formatCurrency, PHASES, calculatePhaseByDueDate } from '@/lib/cobrancaService';
import { Loader2, History, Save, CheckCircle2, Trash2, Calendar, Phone, Mail, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateUtils';

const CobrancaCardModal = ({ isOpen, onClose, card, onSuccess }) => {
  const { updateCobranca, addCobrancaHistorico, deleteCobranca } = useCobranca();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    observacoes: '',
  });

  const [phaseInfo, setPhaseInfo] = useState(null);

  useEffect(() => {
    if (card) {
      setFormData({
        status: card.status || 'ativo',
        observacoes: card.observacoes || '',
      });
      setPhaseInfo(calculatePhaseByDueDate(card.data_vencimento));
    }
  }, [card]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedFields = {};
      
      if (formData.status !== card.status) {
        updatedFields.status = formData.status;
        await addCobrancaHistorico(card.id, `Status alterado de ${card.status} para ${formData.status}`, null);
      }
      if (formData.observacoes !== card.observacoes) {
        updatedFields.observacoes = formData.observacoes;
        await addCobrancaHistorico(card.id, 'Observações atualizadas', null);
      }

      if (Object.keys(updatedFields).length > 0) {
        await updateCobranca(card.id, updatedFields);
        onSuccess();
      } else {
        toast({ title: 'Info', description: 'Nenhuma alteração para salvar.', variant: 'default' });
      }
      onClose();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao salvar alterações: ' + e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir esta cobrança? Esta ação é irreversível.')) {
      setLoading(true);
      try {
        await deleteCobranca(card.id);
        onSuccess();
        onClose();
      } catch (e) {
        console.error(e);
        toast({ title: 'Erro', description: 'Falha ao excluir cobrança: ' + e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResolve = async () => {
    setLoading(true);
    try {
      await updateCobranca(card.id, { status: 'resolvido' });
      await addCobrancaHistorico(card.id, 'Marcado como RESOLVIDO', null);
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao marcar como resolvido: ' + e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!card || !phaseInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">{card.cliente?.nome}</span>
            <div className="flex gap-2">
                <Badge variant="outline" className="border-border text-muted-foreground font-normal">
                    Automático
                </Badge>
                <Badge className={`${PHASES[phaseInfo.fase]?.color} text-white border-0`}>
                {PHASES[phaseInfo.fase]?.label}
                </Badge>
            </div>
          </DialogTitle>
          <div className="text-sm text-muted-foreground flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Vencimento: {formatDateOnly(card.data_vencimento)}</span>
              <span className="font-bold text-lg text-emerald-400">{formatCurrency(card.valor)}</span>
            </div>
            <div className="flex items-center gap-4">
              {card.cliente?.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {card.cliente.telefone}</span>}
              {card.cliente?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {card.cliente.email}</span>}
            </div>
          </div>
        </DialogHeader>

        <div className="bg-background p-3 rounded-md border border-border text-sm space-y-1 mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Status do Prazo:</span>
                <span className={`${phaseInfo.dias_ate_vencimento < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {phaseInfo.dias_ate_vencimento < 0 
                        ? `${Math.abs(phaseInfo.dias_ate_vencimento)} dias de atraso` 
                        : `${phaseInfo.dias_ate_vencimento} dias até o vencimento`}
                </span>
                <span className="text-muted-foreground">({phaseInfo.status_label})</span>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
                Vencimento: {formatDateOnly(card.data_vencimento)} | Hoje: {new Date().toLocaleDateString()}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Edit Form */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Save className="w-4 h-4 text-blue-400" /> Detalhes da Cobrança
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="ativo">Ativo (Em andamento)</SelectItem>
                  <SelectItem value="resolvido">Resolvido (Pago/Negociado)</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações / Anotações</Label>
              <Textarea 
                id="observacoes"
                className="bg-background border-border min-h-[120px]"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Registre aqui o contato com o cliente..."
              />
            </div>
            
            <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                    * A fase é calculada automaticamente pelo sistema com base na data de vencimento e não pode ser alterada manualmente.
                </p>
            </div>
          </div>

          {/* Right Column: Timeline */}
          <div className="space-y-4 border-l border-border pl-6">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" /> Histórico de Ações
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {card.historico && card.historico.length > 0 ? (
                card.historico.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map((hist) => (
                  <div key={hist.id} className="relative pl-4 border-l-2 border-border pb-2">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-muted-foreground"></div>
                    <p className="text-sm text-muted-foreground">{hist.acao}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(hist.created_at), { addSuffix: true, locale: ptBR })} • {hist.usuario?.nome || 'Sistema'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhum histórico registrado.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-between items-center w-full">
           <Button variant="destructive" size="sm" onClick={handleDelete} className="mr-auto" disabled={loading}>
             <Trash2 className="w-4 h-4 mr-2" /> Excluir
           </Button>

           <div className="flex gap-2">
             <Button variant="ghost" onClick={onClose} className="border-border text-muted-foreground hover:text-foreground hover:bg-muted" disabled={loading}>
               Cancelar
             </Button>
             {formData.status !== 'resolvido' && (
                <Button variant="secondary" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleResolve} disabled={loading}>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar Resolvido
                </Button>
             )}
             <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
               {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar Alterações
             </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobrancaCardModal;