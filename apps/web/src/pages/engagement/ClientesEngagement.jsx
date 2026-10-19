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

const vazio = { nome: '', cnpj_cpf: '', email: '', telefone: '', segmento: '', bpo: true, f5: false };

// Clientes da Engagement (BPO E5 e Consultoria F5). Lista própria, separada do cadastro de clientes das empresas do ERP.
const ClientesEngagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(null);
  const [salvando, setSalvando] = useState(false);

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
    const servicos = [novo.bpo && 'bpo', novo.f5 && 'consultoria'].filter(Boolean);
    if (servicos.length === 0) { toast({ title: 'Marque ao menos um serviço', variant: 'destructive' }); return; }
    setSalvando(true);
    try {
      const c = await criarCliente({
        nome: novo.nome.trim(), cnpj_cpf: novo.cnpj_cpf || null, email: novo.email || null,
        telefone: novo.telefone || null, segmento: novo.segmento || null, servicos, status_contrato: 'proposta'
      });
      setNovo(null);
      navigate(`/bpo/cliente/${c.id}`);
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const lista = clientes.filter((c) => !busca || `${c.nome} ${c.cnpj_cpf || ''}`.toLowerCase().includes(busca.toLowerCase()));

  return (
    <>
      <Helmet><title>Clientes Engagement</title></Helmet>
      <PageHeader
        title="Clientes Engagement"
        description="Clientes de BPO E5 e de Consultoria F5. É uma lista própria da Engagement, separada dos clientes de cada empresa do ERP."
        action={<Button onClick={() => setNovo({ ...vazio })}><Plus className="w-4 h-4 mr-2" /> Novo cliente</Button>}
      />

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhum cliente cadastrado ainda. Clique em "Novo cliente" para começar.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Serviços</th>
                <th className="text-left p-3">Plano</th>
                <th className="text-left p-3">Situação</th>
                <th className="text-left p-3 w-48">Onboarding B1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((c) => {
                const pct = c.b1.total ? Math.round((c.b1.feitas / c.b1.total) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/bpo/cliente/${c.id}`)}>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">{c.cnpj_cpf || c.email || ''}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {(c.servicos || []).includes('bpo') && <Badge variant="outline">BPO E5</Badge>}
                        {(c.servicos || []).includes('consultoria') && <Badge variant="outline">Consultoria F5</Badge>}
                      </div>
                    </td>
                    <td className="p-3">{c.plano || '—'}</td>
                    <td className="p-3"><Badge variant={COR_STATUS[c.status_contrato] || 'outline'}>{STATUS_CONTRATO[c.status_contrato] || c.status_contrato}</Badge></td>
                    <td className="p-3">
                      {c.b1.total ? (
                        <div className="flex items-center gap-2"><Progress value={pct} className="h-2" /><span className="text-xs text-muted-foreground w-16">{c.b1.feitas}/{c.b1.total}</span></div>
                      ) : <span className="text-xs text-muted-foreground">não iniciado</span>}
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
          <DialogHeader><DialogTitle>Novo cliente Engagement</DialogTitle></DialogHeader>
          {novo && (
            <div className="space-y-3">
              <div><Label>Razão social / nome *</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CNPJ / CPF</Label><Input value={novo.cnpj_cpf} onChange={(e) => setNovo({ ...novo, cnpj_cpf: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} /></div>
              </div>
              <div><Label>E-mail</Label><Input value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
              <div><Label>Segmento (ex.: agência, clínica, consultoria)</Label><Input value={novo.segmento} onChange={(e) => setNovo({ ...novo, segmento: e.target.value })} /></div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={novo.bpo} onCheckedChange={(v) => setNovo({ ...novo, bpo: v === true })} /> BPO E5</label>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={novo.f5} onCheckedChange={(v) => setNovo({ ...novo, f5: v === true })} /> Consultoria F5</label>
              </div>
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
