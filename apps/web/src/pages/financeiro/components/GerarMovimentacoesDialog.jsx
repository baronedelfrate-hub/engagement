import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { carregarBaseGeracao, gerarMovimentacoes } from '@/services/extratoAsaasService';
import { planejarTitulos } from '@/lib/extratoTitulos';

const GerarMovimentacoesDialog = ({ open, onOpenChange, companyId, userId, onGerado }) => {
  const { toast } = useToast();
  const [base, setBase] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [incluirTarifas, setIncluirTarifas] = useState(false);
  const [incluirSocios, setIncluirSocios] = useState(false);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoading(true);
    setBase(null);
    carregarBaseGeracao(companyId)
      .then(setBase)
      .catch((e) => toast({ title: 'Erro', description: e.message || 'Não foi possível ler o extrato.', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [open, companyId]);

  const plano = useMemo(
    () => (base ? planejarTitulos(base.pendentes, { clientes: base.clientes, fornecedores: base.fornecedores, categoriasPorId: base.categoriasPorId, incluirTarifas, incluirSocios }) : null),
    [base, incluirTarifas, incluirSocios]
  );
  const aPagar = plano?.titulos.filter((t) => t.tipo === 'pagar') || [];
  const aReceber = plano?.titulos.filter((t) => t.tipo === 'receber') || [];

  const gerar = async () => {
    setGerando(true);
    try {
      const r = await gerarMovimentacoes({ companyId, titulos: plano.titulos, userId });
      toast({ title: 'Movimentações geradas', description: `${r.aReceber} a receber e ${r.aPagar} a pagar, com baixa e conciliação.` });
      onOpenChange(false);
      if (onGerado) onGerado();
    } catch (e) {
      toast({ title: 'Erro ao gerar', description: `${e.message || 'Tente novamente.'} Pode rodar de novo: o que já foi criado não é duplicado.`, variant: 'destructive' });
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar movimentações financeiras</DialogTitle>
          <DialogDescription>Cria o título a pagar/receber de cada lançamento classificado do extrato, dá a baixa na data do extrato e já deixa conciliado.</DialogDescription>
        </DialogHeader>

        {loading || !plano ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">A receber</div><div className="text-xl font-semibold text-emerald-600">{aReceber.length}</div></div>
              <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">A pagar</div><div className="text-xl font-semibold text-red-600">{aPagar.length}</div></div>
              <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Já geradas</div><div className="text-xl font-semibold">{base.totalClassificados - base.pendentes.length}</div></div>
            </div>

            <div className="space-y-2 rounded-md border border-border p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={incluirTarifas} onChange={(e) => setIncluirTarifas(e.target.checked)} />
                <span>Incluir tarifas do banco (boleto, mensageria, NFS-e, WhatsApp…){!incluirTarifas && <> — <strong>{plano.fora.tarifas}</strong> ficam só no extrato</>}. São lançamentos de centavos; sem eles a lista fica enxuta.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={incluirSocios} onChange={(e) => setIncluirSocios(e.target.checked)} />
                <span>Incluir movimentações de sócios (retiradas) como contas a pagar{!incluirSocios && <> — <strong>{plano.fora.socios}</strong> ficam só no extrato</>}.</span>
              </label>
            </div>

            <p className="text-muted-foreground">
              {plano.fora.semCategoria > 0 && <>{plano.fora.semCategoria} lançamentos ainda <strong>sem categoria</strong> não entram; classifique e gere de novo depois. </>}
              {aReceber.filter((t) => t.cliente).length}/{aReceber.length} recebimentos ligados ao cliente cadastrado, {aPagar.filter((t) => t.fornecedor).length}/{aPagar.length} pagamentos ao fornecedor. O restante vai sem vínculo, com a descrição do extrato nas observações.
            </p>
            {plano.semCadastro.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Favorecidos sem cadastro ({plano.semCadastro.length})</summary>
                <ul className="mt-1 list-disc pl-5 max-h-40 overflow-y-auto">{plano.semCadastro.map(([nome, qtd]) => <li key={nome}>{nome} ({qtd})</li>)}</ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={gerando}>Cancelar</Button>
          <Button onClick={gerar} disabled={gerando || loading || !plano || plano.titulos.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
            {gerando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gerar {plano?.titulos.length || 0} movimentações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GerarMovimentacoesDialog;
