import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useCobrancaIntegrated } from '@/hooks/useCobrancaIntegrated';
import { formatCurrency } from '@/lib/cobrancaService';
import { Save, XCircle, Calendar, Phone, Mail, User, Wallet, Building2, Tag, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

const CobrancaCardModalIntegrated = ({ isOpen, onClose, card, onSuccess }) => {
  const { updateStatusCobranca, markAsRecovered } = useCobrancaIntegrated();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    observacoes_cobranca: '',
    valor_recebido: '',
    data_baixa: format(new Date(), 'yyyy-MM-dd')
  });

  const [showRecoverForm, setShowRecoverForm] = useState(false);

  useEffect(() => {
    if (card) {
      setFormData({
        observacoes_cobranca: card.observacoes_cobranca || '',
        valor_recebido: card.valor_original,
        data_baixa: format(new Date(), 'yyyy-MM-dd')
      });
    }
  }, [card]);

  const handleUpdate = async () => {
    setLoading(true);
    await updateStatusCobranca(card.id, card.status_cobranca, {
        observacoes_cobranca: formData.observacoes_cobranca
    });
    setLoading(false);
    onSuccess();
    onClose();
  };

  const handleRecover = async () => {
    setLoading(true);
    await markAsRecovered(card.id, formData.valor_recebido, formData.data_baixa);
    setLoading(false);
    onSuccess();
    onClose();
  };

  const handleCancel = async () => {
    if(confirm('Tem certeza que deseja cancelar a cobrança?')) {
        setLoading(true);
        await updateStatusCobranca(card.id, 'cancelado', { status: 'Cancelado' });
        setLoading(false);
        onSuccess();
        onClose();
    }
  };

  if (!card) return null;

  const dias = card.dias_ate_vencimento;
  const prazoColor = dias >= 3 ? 'bg-emerald-500/10 text-emerald-500' : dias >= 1 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex flex-col">
                <span className="text-xl font-bold">{card.cliente?.nome}</span>
                <span className="text-xs text-muted-foreground font-mono mt-1">Título: {card.numero}</span>
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className={`${prazoColor} border-0`}>
                    {dias < 0 ? `${Math.abs(dias)} dias atraso` : `${dias} dias prazo`}
                </Badge>
                <Badge className="bg-muted text-muted-foreground">{card.fase}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Identificação */}
            <div className="bg-background/50 p-3 rounded-lg border border-border space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><User className="w-3 h-3" /> Identificação</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="text-xs text-muted-foreground block">Banco</span>
                        <span className="text-foreground">{card.banco?.nome || '-'}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">Vencimento</span>
                        <span className="text-foreground">{new Date(card.data_vencimento).toLocaleDateString()}</span>
                    </div>
                    <div className="col-span-2">
                         <span className="text-xs text-muted-foreground block">Contato</span>
                         <div className="flex flex-col text-xs text-muted-foreground">
                             {card.cliente?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {card.cliente.email}</span>}
                             {card.cliente?.telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {card.cliente.telefone}</span>}
                         </div>
                    </div>
                </div>
            </div>

            {/* Classificação */}
            <div className="bg-background/50 p-3 rounded-lg border border-border space-y-2">
                 <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Tag className="w-3 h-3" /> Classificação</h4>
                 <div className="flex flex-wrap gap-2">
                     {card.categoria && <Badge variant="secondary" className="bg-purple-900/20 text-purple-300">{card.categoria.nome}</Badge>}
                     {card.subcategoria && <Badge variant="secondary" className="bg-purple-900/10 text-purple-200">{card.subcategoria.nome}</Badge>}
                     {card.centro_custo && <Badge variant="secondary" className="bg-muted text-muted-foreground">{card.centro_custo.nome}</Badge>}
                 </div>
            </div>

            {/* Pagamento */}
            <div className="bg-background/50 p-3 rounded-lg border border-border space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><Wallet className="w-3 h-3" /> Pagamento</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                     <div>
                        <span className="text-xs text-muted-foreground block">Valor Original</span>
                        <span className="font-bold text-foreground">{formatCurrency(card.valor_original)}</span>
                    </div>
                    {card.valor_recebido > 0 && (
                         <div>
                            <span className="text-xs text-muted-foreground block">Recebido</span>
                            <span className="font-bold text-emerald-400">{formatCurrency(card.valor_recebido)}</span>
                        </div>
                    )}
                    <div>
                         <span className="text-xs text-muted-foreground block">Tipo</span>
                         <span className="text-muted-foreground">{card.tipo_pagamento?.nome || '-'}</span>
                    </div>
                    <div>
                         <span className="text-xs text-muted-foreground block">Condição</span>
                         <span className="text-muted-foreground">{card.condicao_pagamento?.nome || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Documentação */}
            <div className="bg-background/50 p-3 rounded-lg border border-border space-y-2">
                 <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><FileText className="w-3 h-3" /> Documentação</h4>
                 <div className="grid grid-cols-2 gap-2 text-sm">
                     <div>
                        <span className="text-xs text-muted-foreground block">Tipo Doc</span>
                        <span className="text-foreground">{card.tipo_documento?.nome || '-'}</span>
                    </div>
                    <div>
                        <span className="text-xs text-muted-foreground block">Origem</span>
                        <span className="text-foreground">{card.origem?.nome || '-'}</span>
                    </div>
                 </div>
            </div>
        </div>

        <Separator className="bg-muted my-2" />

        <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-blue-400" /> Ações de Cobrança
            </h3>

            {showRecoverForm ? (
                <div className="p-4 bg-emerald-900/10 border border-emerald-900/30 rounded-lg space-y-3">
                    <h4 className="text-sm font-semibold text-emerald-400">Registrar Recuperação</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">Valor Recebido</Label>
                            <Input 
                                type="number" 
                                step="0.01"
                                value={formData.valor_recebido}
                                onChange={e => setFormData({...formData, valor_recebido: e.target.value})}
                                className="bg-background border-border h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Data Baixa</Label>
                            <Input 
                                type="date" 
                                value={formData.data_baixa}
                                onChange={e => setFormData({...formData, data_baixa: e.target.value})}
                                className="bg-background border-border h-8"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={handleRecover} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-8">Confirmar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowRecoverForm(false)} className="text-muted-foreground w-full h-8">Cancelar</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="observacoes" className="text-xs text-muted-foreground">Observações de Cobrança</Label>
                        <Textarea 
                        id="observacoes"
                        className="bg-background border-border min-h-[80px]"
                        value={formData.observacoes_cobranca}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes_cobranca: e.target.value }))}
                        disabled={card.status_cobranca === 'recuperado'}
                        placeholder="Registre aqui o andamento das negociações..."
                        />
                    </div>
                </div>
            )}
        </div>

        <DialogFooter className="mt-2 pt-4 border-t border-border flex justify-between items-center w-full">
            {card.status_cobranca !== 'recuperado' && (
                <Button variant="ghost" className="text-red-400 hover:bg-red-900/20 hover:text-red-300 h-8 text-xs" onClick={handleCancel}>
                    <XCircle className="w-3 h-3 mr-2" /> Cancelar Cobrança
                </Button>
            )}
            
            <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={onClose} className="h-8">Fechar</Button>
                
                {card.status_cobranca !== 'recuperado' && !showRecoverForm && (
                     <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => setShowRecoverForm(true)}>
                        <Wallet className="w-3 h-3 mr-2" /> Marcar Recuperado
                    </Button>
                )}
                
                {!showRecoverForm && card.status_cobranca !== 'recuperado' && (
                    <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white h-8">
                        <Save className="w-3 h-3 mr-2" /> Salvar
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CobrancaCardModalIntegrated;