import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, Plus, Search, Trash2, Star } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  listarContas, criarConta, atualizarConta, excluirConta, listarContatos, criarContato, atualizarContato, excluirContato,
  listarOportunidades, moeda, ETAPA_POR_ID
} from '@/lib/crmService';

const vazia = { nome: '', cnpj_cpf: '', segmento: '', site: '', cidade: '', uf: '', origem: '', observacoes: '' };
const contatoVazio = { nome: '', cargo: '', email: '', telefone: '', whatsapp: '', decisor: false };

const CRMContas = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [contas, setContas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [conta, setConta] = useState(null);
  const [novoContato, setNovoContato] = useState(contatoVazio);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [c, ct, o] = await Promise.all([listarContas(companyId), listarContatos(companyId), listarOportunidades(companyId)]);
      setContas(c); setContatos(ct); setOps(o);
    } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);

  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const salvar = async () => {
    if (!conta.nome.trim()) { toast({ title: 'Informe o nome da empresa', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const { id, company_id, created_at, updated_at, ...dados } = conta; // eslint-disable-line no-unused-vars
      const salva = id ? await atualizarConta(id, dados) : await criarConta(companyId, dados);
      setConta(salva);
      await carregar();
      toast({ title: 'Conta salva' });
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const addContato = async () => {
    if (!novoContato.nome.trim() || !conta?.id) return;
    try { await criarContato(companyId, conta.id, novoContato); setNovoContato(contatoVazio); setContatos(await listarContatos(companyId)); }
    catch (e) { toast({ title: 'Não foi possível adicionar', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;

  const lista = contas.filter((c) => !busca || `${c.nome} ${c.cnpj_cpf || ''}`.toLowerCase().includes(busca.toLowerCase()));
  const doConta = conta?.id ? contatos.filter((c) => c.conta_id === conta.id) : [];
  const opsDoConta = conta?.id ? ops.filter((o) => o.conta_id === conta.id) : [];

  return (
    <>
      <Helmet><title>Contas e contatos | CRM</title></Helmet>
      <PageHeader title="Contas e contatos" description="As empresas que você prospecta e vende, e as pessoas de cada uma." action={<Button onClick={() => setConta({ ...vazia })}><Plus className="w-4 h-4 mr-2" /> Nova conta</Button>} />
      <div className="relative max-w-sm mb-4"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma conta ainda. Clique em "Nova conta" para começar.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Empresa</th><th className="text-left p-3">Segmento</th><th className="text-left p-3">Contatos</th><th className="text-left p-3">Oportunidades</th></tr></thead>
            <tbody className="divide-y divide-border">
              {lista.map((c) => {
                const abertas = ops.filter((o) => o.conta_id === c.id && !['ganho', 'perdido'].includes(o.etapa));
                return (
                  <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setConta(c)}>
                    <td className="p-3"><div className="font-medium">{c.nome}</div><div className="text-xs text-muted-foreground">{c.cnpj_cpf || [c.cidade, c.uf].filter(Boolean).join(' / ')}</div></td>
                    <td className="p-3 text-xs">{c.segmento || '—'}</td>
                    <td className="p-3">{contatos.filter((x) => x.conta_id === c.id).length}</td>
                    <td className="p-3">{abertas.length ? <Badge variant="warning">{abertas.length} em aberto</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!conta} onOpenChange={(o) => { if (!o) setConta(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{conta?.id ? conta.nome : 'Nova conta'}</DialogTitle></DialogHeader>
          {conta && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Razão social / nome *</Label><Input value={conta.nome} onChange={(e) => setConta({ ...conta, nome: e.target.value })} /></div>
                <div><Label>CNPJ / CPF</Label><Input value={conta.cnpj_cpf || ''} onChange={(e) => setConta({ ...conta, cnpj_cpf: e.target.value })} /></div>
                <div><Label>Segmento</Label><Input value={conta.segmento || ''} onChange={(e) => setConta({ ...conta, segmento: e.target.value })} /></div>
                <div><Label>Site</Label><Input value={conta.site || ''} onChange={(e) => setConta({ ...conta, site: e.target.value })} /></div>
                <div><Label>Cidade</Label><Input value={conta.cidade || ''} onChange={(e) => setConta({ ...conta, cidade: e.target.value })} /></div>
                <div className="grid grid-cols-[80px_1fr] gap-2"><div><Label>UF</Label><Input maxLength={2} value={conta.uf || ''} onChange={(e) => setConta({ ...conta, uf: e.target.value.toUpperCase() })} /></div><div><Label>Origem</Label><Input value={conta.origem || ''} onChange={(e) => setConta({ ...conta, origem: e.target.value })} /></div></div>
              </div>
              <div><Label>Observações</Label><Textarea rows={2} value={conta.observacoes || ''} onChange={(e) => setConta({ ...conta, observacoes: e.target.value })} /></div>
            </div>
          )}

          {conta?.id && (
            <>
              <div className="border-t border-border pt-3">
                <div className="text-sm font-semibold mb-2">Contatos</div>
                {doConta.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-1.5 text-sm border-b border-border last:border-0">
                    <button type="button" title="Decisor" onClick={async () => { await atualizarContato(c.id, { decisor: !c.decisor }); setContatos(await listarContatos(companyId)); }}><Star className={`h-4 w-4 ${c.decisor ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`} /></button>
                    <div className="flex-1"><span className="font-medium">{c.nome}</span>{c.cargo ? <span className="text-muted-foreground"> · {c.cargo}</span> : null}<div className="text-xs text-muted-foreground">{[c.email, c.telefone, c.whatsapp && `WhatsApp ${c.whatsapp}`].filter(Boolean).join(' · ')}</div></div>
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={async () => { await excluirContato(c.id); setContatos(await listarContatos(companyId)); }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_auto] gap-2 mt-3">
                  <Input placeholder="Nome" value={novoContato.nome} onChange={(e) => setNovoContato({ ...novoContato, nome: e.target.value })} />
                  <Input placeholder="Cargo" value={novoContato.cargo} onChange={(e) => setNovoContato({ ...novoContato, cargo: e.target.value })} />
                  <Input placeholder="E-mail" value={novoContato.email} onChange={(e) => setNovoContato({ ...novoContato, email: e.target.value })} />
                  <Input placeholder="Telefone" value={novoContato.telefone} onChange={(e) => setNovoContato({ ...novoContato, telefone: e.target.value })} />
                  <Input placeholder="WhatsApp" value={novoContato.whatsapp} onChange={(e) => setNovoContato({ ...novoContato, whatsapp: e.target.value })} />
                  <Button onClick={addContato}><Plus className="w-4 h-4" /></Button>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground mt-2"><Checkbox checked={novoContato.decisor} onCheckedChange={(v) => setNovoContato({ ...novoContato, decisor: v === true })} /> marcar como decisor</label>
              </div>

              {opsDoConta.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-sm font-semibold mb-1">Oportunidades</div>
                  {opsDoConta.map((o) => (<div key={o.id} className="flex justify-between text-sm py-1"><span>{o.titulo}</span><span className="text-muted-foreground">{ETAPA_POR_ID[o.etapa].rotulo} · {moeda(o.valor)}</span></div>))}
                </div>
              )}
            </>
          )}

          <DialogFooter className="gap-2">
            {conta?.id && <Button variant="ghost" className="text-destructive mr-auto" onClick={async () => { if (window.confirm('Excluir esta conta, seus contatos e oportunidades?')) { try { await excluirConta(conta.id); setConta(null); carregar(); } catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); } } }}>Excluir</Button>}
            <Button variant="outline" onClick={() => setConta(null)}>Fechar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CRMContas;
