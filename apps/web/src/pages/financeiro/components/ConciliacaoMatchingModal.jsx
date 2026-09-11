import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Link as LinkIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDateOnly } from '@/lib/dateUtils';

const ConciliacaoMatchingModal = ({ isOpen, onClose, systemRecord, ofxRecord, onConfirm, loading }) => {
  if (!systemRecord || !ofxRecord) return null;

  const diffVal = Math.abs(systemRecord.valor - ofxRecord.valor);
  const diffDays = Math.abs(new Date(systemRecord.data_baixa) - new Date(ofxRecord.data_transacao)) / (1000 * 60 * 60 * 24);
  const isMatchWarning = diffVal > 0.01 || diffDays > 3;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl">
            <div className="p-2 rounded-full bg-blue-900/20 text-blue-500">
              <LinkIcon className="h-6 w-6" />
            </div>
            Confirmar Conciliação
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Verifique se os lançamentos selecionados correspondem à mesma transação.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
              {/* System Side */}
              <div className="bg-background rounded-xl p-4 border border-border">
                  <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 border-b border-border pb-2">Sistema (ERP)</div>
                  <div className="space-y-2">
                      <div>
                          <p className="text-xs text-muted-foreground">Data</p>
                          <p className="text-sm font-medium">{formatDateOnly(systemRecord.data_baixa)}</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Descrição</p>
                          <p className="text-sm font-medium truncate" title={systemRecord.entidadeNome}>{systemRecord.entidadeNome}</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className={`font-bold ${systemRecord.valor < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {systemRecord.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                      </div>
                  </div>
              </div>

              {/* OFX Side */}
              <div className="bg-background rounded-xl p-4 border border-border">
                  <div className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 border-b border-border pb-2">Extrato Bancário</div>
                  <div className="space-y-2">
                      <div>
                          <p className="text-xs text-muted-foreground">Data</p>
                          <p className="text-sm font-medium">{formatDateOnly(ofxRecord.data_transacao)}</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Descrição</p>
                          <p className="text-sm font-medium truncate" title={ofxRecord.descricao}>{ofxRecord.descricao}</p>
                      </div>
                      <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className={`font-bold ${ofxRecord.valor < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {ofxRecord.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                      </div>
                  </div>
              </div>
          </div>

          {isMatchWarning && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3 text-amber-400">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                      <p className="font-semibold">Atenção às divergências:</p>
                      {diffVal > 0.01 && <p>• Valores diferem em {diffVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'})}.</p>}
                      {diffDays > 3 && <p>• Datas diferem em {Math.round(diffDays)} dias.</p>}
                  </div>
              </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="hover:bg-muted text-muted-foreground">Cancelar</Button>
          <Button 
            onClick={() => onConfirm(systemRecord, ofxRecord)} 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirmar Match
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConciliacaoMatchingModal;