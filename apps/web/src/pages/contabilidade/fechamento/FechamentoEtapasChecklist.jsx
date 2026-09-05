import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { CheckCircle2, Circle, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { getStepColor, formatDate } from '@/lib/fechamentoUtils';

export default function FechamentoEtapasChecklist({ etapas, onToggleStep, readOnly }) {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, etapa: null, value: false });
  const [observacoes, setObservacoes] = useState({});

  const handleCheckboxClick = (etapa, currentValue) => {
    if (readOnly) return;
    setConfirmDialog({ open: true, etapa, value: !currentValue });
  };

  const handleConfirmToggle = () => {
    if (confirmDialog.etapa) {
      onToggleStep(confirmDialog.etapa, confirmDialog.value, observacoes[confirmDialog.etapa.id]);
    }
    setConfirmDialog({ open: false, etapa: null, value: false });
  };

  const getModuleLink = (numero) => {
    switch (numero) {
      case 1: return '/financeiro/dashboard';
      case 2: return '/financeiro/conciliacao-bancaria';
      case 3: return '/financeiro/contas-pagar';
      case 4: return '/financeiro/contas-receber';
      case 5: return '/fiscal/entrada-nf';
      case 6: return '/fiscal/nfe-produtos';
      case 7: return '/fiscal/apuracao-impostos';
      case 8: return '/contabilidade/documentos';
      case 9: return '/contabilidade/pendencias';
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {etapas.map((etapa) => {
        const stepColorClass = getStepColor(etapa.numero_etapa);
        const link = getModuleLink(etapa.numero_etapa);

        return (
          <Card key={etapa.id} className={`border-l-4 overflow-hidden transition-all duration-200 ${etapa.concluida ? 'border-l-emerald-500 bg-slate-50' : 'border-l-slate-300 hover:border-l-blue-400'}`}>
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              
              <div className="flex-shrink-0 pt-1">
                <button 
                  type="button"
                  onClick={() => handleCheckboxClick(etapa, etapa.concluida)}
                  disabled={readOnly}
                  className={`rounded-full transition-colors ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-200'}`}
                >
                  {etapa.concluida ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <Circle className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              <div className="flex-grow space-y-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`${stepColorClass} uppercase text-[10px] tracking-wider`}>
                    Passo {etapa.numero_etapa}
                  </Badge>
                  <h4 className={`font-semibold ${etapa.concluida ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {etapa.nome_etapa}
                  </h4>
                </div>
                <p className="text-sm text-slate-500">{etapa.descricao}</p>
                
                {/* Expandable Notes / Meta info */}
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500">
                  {etapa.prazo && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Prazo: {formatDate(etapa.prazo)}
                    </span>
                  )}
                  {etapa.concluida && etapa.data_conclusao && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Concluído em: {formatDate(etapa.data_conclusao)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 w-full sm:w-auto flex sm:flex-col gap-2 justify-end">
                {link && (
                  <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 text-xs" onClick={() => window.open(link, '_blank')}>
                    Acessar Módulo <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        );
      })}

      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, etapa: null, value: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Ação</DialogTitle>
            <DialogDescription>
              Você está prestes a marcar a etapa <strong>"{confirmDialog.etapa?.nome_etapa}"</strong> como {confirmDialog.value ? 'concluída' : 'pendente'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Observações (Opcional)</label>
            <Input 
              placeholder="Adicione uma nota sobre esta ação..."
              value={confirmDialog.etapa ? (observacoes[confirmDialog.etapa.id] || '') : ''}
              onChange={(e) => setObservacoes({...observacoes, [confirmDialog.etapa.id]: e.target.value})}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, etapa: null, value: false })}>Cancelar</Button>
            <Button onClick={handleConfirmToggle} className={confirmDialog.value ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-800 hover:bg-slate-900'}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}