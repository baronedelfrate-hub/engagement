import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { focusNfe } from '@/services/focusNfeService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, RefreshCw, Download, FileDown, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LancarEntradaDialog from './LancarEntradaDialog';

const brl = (v) => (v == null ? '-' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const data = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');
const MANIF = {
  ciencia: 'Ciência da operação', confirmacao: 'Confirmação da operação',
  desconhecimento: 'Desconhecimento da operação', nao_realizada: 'Operação não realizada',
};
const nomeManif = (m) => (m ? (MANIF[m] || String(m).replace(/_/g, ' ')) : 'Sem manifestação');

const baixarTexto = (conteudo, nome, tipo) => {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
};

export default function NotasRecebidasPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lancadas, setLancadas] = useState({}); // chave -> id da nota de entrada
  const [lancar, setLancar] = useState(null);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [tipo, setTipo] = useState('todas');
  const [busca, setBusca] = useState('');
  const [manif, setManif] = useState(null); // { nota, tipo }
  const [justificativa, setJustificativa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ultima, setUltima] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: lista, error }, cfg] = await Promise.all([
      supabase.from('focus_nfe_recebidas').select('*').order('data_emissao', { ascending: false }).limit(1000),
      focusNfe.getConfig().catch(() => null),
    ]);
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    setNotas(lista || []);
    const chaves = (lista || []).map((n) => n.chave);
    if (chaves.length) {
      const { data: ent } = await supabase.from('notas_entrada').select('id, chave_acesso').in('chave_acesso', chaves.slice(0, 500));
      setLancadas(Object.fromEntries((ent || []).map((e) => [e.chave_acesso, e.id])));
    }
    setUltima(cfg?.config?.ultima_sincronizacao || null);
    setLoading(false);
  }, [toast]);
  useEffect(() => { carregar(); }, [carregar]);

  const sincronizar = async () => {
    setSincronizando(true);
    // cada tipo é buscado separado: se um não estiver habilitado na Focus, o outro continua funcionando
    const resultados = [];
    for (const [tipoBusca, rotulo] of [['nfe', 'NF-e'], ['nfsen', 'NFS-e Nacional']]) {
      try { const r = await focusNfe.sincronizar(tipoBusca); resultados.push({ rotulo, ok: true, novas: r.novas }); }
      catch (e) { resultados.push({ rotulo, ok: false, erro: e.message }); }
    }
    const ok = resultados.filter((r) => r.ok); const falhas = resultados.filter((r) => !r.ok);
    if (ok.length) toast({ title: 'Sincronização concluída', description: ok.map((r) => `${r.novas} ${r.rotulo}`).join(' e ') + ' atualizadas.' });
    falhas.forEach((r) => toast({ title: `${r.rotulo}: não foi possível buscar`, description: /habilitad/i.test(r.erro) ? `${r.erro} (peça à Focus para habilitar o recebimento de ${r.rotulo} para o CNPJ da empresa.)` : r.erro, variant: 'destructive' }));
    await carregar();
    setSincronizando(false);
  };

  const enviarManifestacao = async () => {
    if (!manif) return;
    if (['nao_realizada'].includes(manif.tipo) && justificativa.trim().length < 15) {
      toast({ title: 'Justificativa obrigatória', description: 'Informe ao menos 15 caracteres.', variant: 'destructive' });
      return;
    }
    setEnviando(true);
    try {
      await focusNfe.manifestar(manif.nota.chave, manif.tipo, justificativa.trim() || undefined);
      toast({ title: 'Manifestação enviada', description: nomeManif(manif.tipo) });
      setManif(null); setJustificativa('');
      await carregar();
    } catch (e) {
      toast({ title: 'Erro na manifestação', description: e.message, variant: 'destructive' });
    }
    setEnviando(false);
  };

  const baixar = async (n, formato) => {
    try {
      const r = await focusNfe.baixar(n.tipo, n.chave, formato);
      baixarTexto(r.conteudo, `${n.tipo === 'nfe' ? 'nfe' : 'nfse'}_${n.chave}.${formato}`, formato === 'xml' ? 'application/xml' : 'application/json');
    } catch (e) {
      toast({ title: 'Não foi possível baixar', description: e.message, variant: 'destructive' });
    }
  };

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return notas.filter((n) => (tipo === 'todas' || n.tipo === tipo) &&
      (!b || [n.nome_emitente, n.cnpj_emitente, n.numero, n.chave].some((c) => String(c || '').toLowerCase().includes(b))));
  }, [notas, tipo, busca]);
  const total = filtradas.reduce((s, n) => s + (Number(n.valor_total) || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas Recebidas (Focus NFe)</h1>
          <p className="text-sm text-muted-foreground">NF-e de fornecedores e NFS-e Nacional emitidas contra o CNPJ da empresa.
            {ultima && ` Última sincronização: ${new Date(ultima).toLocaleString('pt-BR')}.`}</p>
        </div>
        <Button onClick={sincronizar} disabled={sincronizando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {sincronizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Buscar novas notas
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notas</CardTitle>
          <CardDescription>{filtradas.length} nota(s) · total {brl(total)}. NFS-e municipal recebida não é disponibilizada pela Focus.</CardDescription>
          <div className="flex flex-wrap gap-3 pt-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="nfe">NF-e (produtos)</SelectItem>
                <SelectItem value="nfsen">NFS-e Nacional</SelectItem>
              </SelectContent>
            </Select>
            <Input className="w-72" placeholder="Buscar emitente, CNPJ, número ou chave" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Tipo</th><th className="pr-3">Emissão</th><th className="pr-3">Número</th><th className="pr-3">Emitente</th>
                  <th className="pr-3 text-right">Valor</th><th className="pr-3">Manifestação</th><th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma nota. Clique em "Buscar novas notas".</td></tr>}
                {filtradas.map((n) => (
                  <tr key={n.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3"><Badge variant="outline">{n.tipo === 'nfe' ? 'NF-e' : 'NFS-e'}</Badge></td>
                    <td className="pr-3 whitespace-nowrap">{data(n.data_emissao)}</td>
                    <td className="pr-3">{n.numero || '-'}</td>
                    <td className="pr-3"><div className="font-medium text-foreground">{n.nome_emitente || '-'}</div><div className="text-xs text-muted-foreground">{n.cnpj_emitente}</div></td>
                    <td className="pr-3 text-right whitespace-nowrap">{brl(n.valor_total)}</td>
                    <td className="pr-3">{n.tipo === 'nfe' ? nomeManif(n.manifestacao) : '-'}</td>
                    <td className="text-right whitespace-nowrap">
                      {n.tipo === 'nfe' && (
                        <Select value="" onValueChange={(v) => { setJustificativa(''); setManif({ nota: n, tipo: v }); }}>
                          <SelectTrigger className="inline-flex w-36 h-8 mr-2"><SelectValue placeholder="Manifestar" /></SelectTrigger>
                          <SelectContent>{Object.entries(MANIF).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {lancadas[n.chave]
                        ? <Button size="sm" variant="outline" className="mr-2 text-emerald-700" onClick={() => navigate(`/fiscal/entrada-nf/${lancadas[n.chave]}`)}><ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Lançada</Button>
                        : <Button size="sm" className="mr-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setLancar(n)}><ClipboardCheck className="w-3.5 h-3.5 mr-1" /> Lançar entrada</Button>}
                      <Button size="sm" variant="outline" className="mr-1" onClick={() => baixar(n, 'xml')}><FileDown className="w-3.5 h-3.5 mr-1" /> XML</Button>
                      <Button size="sm" variant="outline" onClick={() => baixar(n, 'json')}><Download className="w-3.5 h-3.5 mr-1" /> JSON</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <LancarEntradaDialog nota={lancar} onClose={() => setLancar(null)} onDone={(id) => { setLancar(null); navigate(`/fiscal/entrada-nf/${id}`); }} />

      <Dialog open={!!manif} onOpenChange={(o) => { if (!o) setManif(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{manif ? nomeManif(manif.tipo) : ''}</DialogTitle></DialogHeader>
          {manif && (
            <div className="space-y-3 text-sm">
              <p>NF-e {manif.nota.numero} de <b>{manif.nota.nome_emitente}</b> — {brl(manif.nota.valor_total)}.</p>
              <p className="text-muted-foreground">A manifestação é registrada na Receita e não pode ser desfeita.</p>
              {['nao_realizada', 'desconhecimento'].includes(manif.tipo) && (
                <Textarea placeholder={manif.tipo === 'nao_realizada' ? 'Justificativa (mínimo 15 caracteres)' : 'Justificativa (opcional)'} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManif(null)}>Cancelar</Button>
            <Button onClick={enviarManifestacao} disabled={enviando}>{enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
