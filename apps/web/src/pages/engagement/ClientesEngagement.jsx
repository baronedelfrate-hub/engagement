import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { listarClientes, criarCliente, STATUS_CONTRATO } from '@/lib/engService';

const COR_STATUS = {
  proposta: 'secondary',
  em_implantacao: 'warning',
  em_operacao: 'success',
  pausado: 'outline',
  encerrado: 'secondary'
};

// BPO E5 e Consultoria F5 são serviços separados: cada menu lista só os clientes do próprio serviço.
export const SERVICOS = {
  bpo: {
    chave: 'bpo',
    rotulo: 'BPO E5',
    titulo: 'Clientes BPO E5',
    descricao: 'Clientes que contrataram o BPO financeiro (metodologia E5). Lista própria da Engagement, separada dos clientes de cada empresa do ERP.',
    rotaFicha: (id) => `/bpo/cliente/${id}`,
    rotaLista: '/bpo/clientes',
    progresso: 'b1',
    colunaProgresso: 'Onboarding B1'
  },
  consultoria: {
    chave: 'consultoria',
    rotulo: 'Consultoria F5',
    titulo: 'Clientes e projetos — Consultoria F5',
    descricao: 'Clientes que contrataram a Consultoria F5 (estruturação). Cada cliente tem seu projeto, cronograma, agenda de visitas, OS e entregas.',
    rotaFicha: (id) => `/metodologia-f5/cliente/${id}`,
    rotaLista: '/metodologia-f5/clientes',
    progresso: 'f5',
    colunaProgresso: 'Andamento do projeto'
  }
};

const ClientesEngagement = ({ servico = 'bpo' }) => {
  const cfg = SERVICOS[servico] || SERVICOS.bpo;
  const outro = servico === 'bpo' ? SERVICOS.consultoria : SERVICOS.bpo;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const vazio = { nome: '', cnpj_cpf: '', email: '', telefone: '', segmento: '', tambemOutro: false };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setClientes(await listarClientes());
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!novo.nome.trim()) { toast({ title: 'Informe o nome do cliente', variant: 'destructive' }); return; }
    const servicos = [cfg.chave, ...(novo.tambemOutro ? [outro.chave] : [])];
    setSalvando(true);
    try {
      const c = await criarCliente({
        nome: novo.nome.trim(), cnpj_cpf: novo.cnpj_cpf || null, email: novo.email || null,
        telefone: novo.telefone || null, segmento: novo.segmento || null, servicos, status_contrato: 'proposta'
      });
      setNovo(null);
      navigate(cfg.rotaFicha(c.id));
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const doServico = clientes.filter((c) => (c.servicos || []).includes(cfg.chave));
  const lista = doServico.filter((c) => !busca || `${c.nome} ${c.cnpj_cpf || ''}`.toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <Helmet><title>{cfg.titulo}</title></Helmet>
      <PageHeader
        title={cfg.titulo}
        description={cfg.descricao}
        action={<Button onClick={() => setNovo({ ...vazio })}><Plus className="w-4 h-4 mr-2" /> Novo cliente</Button>}
      />

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          {doServico.length === 0 ? `Nenhum cliente de ${cfg.rotulo} cadastrado ainda. Clique em "Novo cliente" para começar.` : 'Nenhum cliente encontrado na busca.'}
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Cliente</th>
                {servico === 'bpo' && <th className="text-left p-3">Plano</th>}
                <th className="text-left p-3">Situação</th>
                <th className="text-left p-3 w-56">{cfg.colunaProgresso}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((c) => {
                const p = c[cfg.progresso];
                const pct = p.total ? Math.round((p.feitas / p.total) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(cfg.rotaFicha(c.id))}>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{c.cnpj_cpf || c.email || ''}</div>
                    </td>
                    {servico === 'bpo' && <td className="p-3">{c.plano || '—'}</td>}
                    <td className="p-3"><Badge variant={COR_STATUS[c.status_contrato] || 'outline'}>{STATUS_CONTRATO[c.status_contrato] || c.status_contrato}</Badge></td>
                    <td className="p-3">
                      {p.total ? (
                        <div className="flex items-center gap-2"><Progress value={pct} className="h-2" /><span className="text-xs text-muted-foreground w-16">{p.feitas}/{p.total}</span></div>
                      ) : <span className="text-xs text-muted-foreground">{servico === 'bpo' ? 'não iniciado' : 'sem projeto'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!novo} onOpenChange={(o) => { if (!o) setNovo(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo cliente — {cfg.rotulo}</DialogTitle></DialogHeader>
          {novo && (
            <div className="space-y-3">
              <div><Label>Razão social / nome *</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CNPJ / CPF</Label><Input value={novo.cnpj_cpf} onChange={(e) => setNovo({ ...novo, cnpj_cpf: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} /></div>
              </div>
              <div><Label>E-mail</Label><Input value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
              <div><Label>Segmento (ex.: agência, clínica, consultoria)</Label><Input value={novo.segmento} onChange={(e) => setNovo({ ...novo, segmento: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <Checkbox checked={novo.tambemOutro} onCheckedChange={(v) => setNovo({ ...novo, tambemOutro: v === true })} />
                Este cliente também contratou {outro.rotulo}
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovo(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientesEngagement;
