import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { manifestacaoNFService } from '../services/manifestacaoNFService';
import { MANIFESTACAO_OPTIONS } from '../utils/manifestacaoNFUtils';
import { useToast } from '@/components/ui/use-toast';

export function ModalManifestar({ isOpen, onClose, nota, onSuccess }) {
  const [status, setStatus] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleManifestar = async () => {
    if (!status) return;
    if ((status === 'Desconhecimento' || status === 'Não realizada') && !justificativa) {
      toast({ title: 'Atenção', description: 'Justificativa é obrigatória para este status.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await manifestacaoNFService.manifestar(nota.id, status, justificativa);
      toast({ title: 'Sucesso', description: `Manifestação registrada como ${status}.` });
      onSuccess();
      onClose();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manifestar Nota Fiscal</DialogTitle>
          <DialogDescription>
            Nota: {nota?.numero || ''} | Fornecedor: {nota?.fornecedores?.nome || nota?.fornecedor_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Manifestação</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {MANIFESTACAO_OPTIONS.filter(o => o !== 'Pendente').map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(status === 'Desconhecimento' || status === 'Não realizada') && (
            <div className="space-y-2">
              <Label>Justificativa (Obrigatória)</Label>
              <Textarea 
                value={justificativa} 
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Informe o motivo..."
                className="text-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleManifestar} disabled={loading || !status} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ActionButtons({ nota, loadData, toast, navigate }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [showManifestar, setShowManifestar] = useState(false);

  const safeCall = async (actionId, actionFn, successMsg) => {
    setLoadingAction(actionId);
    try {
      await actionFn();
      toast({ title: 'Sucesso', description: successMsg });
      loadData();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingAction(null);
    }
  };

  const onImportar = () => safeCall('importar', 
    () => manifestacaoNFService.importarParaEntrada(nota), 
    'Nota importada com sucesso. Acesse o módulo de Entrada de NF para conferência.'
  );

  const onGerarCP = () => safeCall('gerarCP', 
    () => manifestacaoNFService.gerarContasPagar(nota), 
    'Conta a pagar gerada.'
  );

  const onContabilidade = () => safeCall('contabil', 
    () => manifestacaoNFService.enviarContabilidade(nota), 
    'Enviado à contabilidade.'
  );

  const onConsultar = () => safeCall('consultar',
    () => manifestacaoNFService.consultarSefaz([nota.id]),
    'Consulta realizada.'
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {nota.situacao_consulta !== 'XML Disponível' && (
           <Button variant="outline" size="sm" onClick={onConsultar} disabled={loadingAction}>
             {loadingAction === 'consultar' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
             Consultar SEFAZ
           </Button>
        )}
        
        {nota.status_manifestacao !== 'Confirmação' && nota.status_manifestacao !== 'Desconhecimento' && (
          <Button size="sm" onClick={() => setShowManifestar(true)} disabled={loadingAction} className="bg-blue-600 hover:bg-blue-700 text-white">
            Manifestar
          </Button>
        )}

        {nota.situacao_consulta === 'XML Disponível' && !nota.importado_entrada && nota.status_manifestacao !== 'Desconhecimento' && (
          <Button size="sm" variant="secondary" onClick={onImportar} disabled={loadingAction}>
            {loadingAction === 'importar' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Importar Entrada
          </Button>
        )}

        {!nota.integrado_financeiro && nota.status_manifestacao === 'Confirmação' && (
           <Button size="sm" variant="outline" onClick={onGerarCP} disabled={loadingAction} className="text-emerald-600 border-emerald-200">
             {loadingAction === 'gerarCP' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
             Gerar C. Pagar
           </Button>
        )}

        {!nota.integrado_contabil && nota.status_manifestacao === 'Confirmação' && (
           <Button size="sm" variant="outline" onClick={onContabilidade} disabled={loadingAction} className="text-indigo-600 border-indigo-200">
             {loadingAction === 'contabil' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
             Contabilidade
           </Button>
        )}
      </div>

      <ModalManifestar 
        isOpen={showManifestar} 
        onClose={() => setShowManifestar(false)} 
        nota={nota}
        onSuccess={loadData}
      />
    </>
  );
}