import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, PlayCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  carregarCliente, atualizarCliente, iniciarOnboarding, listarTarefas, hojeISO, STATUS_CONTRATO,
  listarAcessos, vincularAcesso, desvincularAcesso
} from '@/lib/engService';
import DiagnosticoTab from './tabs/DiagnosticoTab';
import ImplantacaoTab from './tabs/ImplantacaoTab';
import ConsultoriaTab from './tabs/ConsultoriaTab';
import AcessosTab from './tabs/AcessosTab';
import { SERVICOS } from './ClientesEngagement';

const PLANOS = ['Estruturação F5', 'Básico', 'Essencial', 'Profissional', 'Estratégico'];
const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';

// Login do cliente: a Estela cria o usuário (Administração > Usuários) e aqui apenas o vincula a este cliente.
const AcessoCliente = ({ cliente }) => {
  const { toast } = useToast();
  const [acessos, setAcessos] = useState(null);
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);

  const carregar = useCallback(async () => {
    try { setAcessos(await listarAcessos(cliente.id)); setIndisponivel(false); }
    catch (e) { setAcessos([]); setIndisponivel(true); }
  }, [cliente.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const vincular = async () => {
    if (!email.trim()) return;
    setSalvando(true);
    try { await vincularAcesso(email.trim(), cliente.id); setEmail(''); toast({ title: 'Acesso liberado' }); await carregar(); }
    catch (e) { toast({ title: 'Não foi possível liberar o acesso', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };
  const remover = async (u) => {
    if (!window.confirm(`Remover o acesso de ${u.email}?`)) return;
    try { await desvincularAcesso(u.id); await carregar(); } catch (e) { toast({ title: 'Não foi possível remover', description: e.message, variant: 'destructive' }); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acesso do cliente</CardTitle>
        <CardDescription>O cliente entra com e-mail e senha e vê só a tela "Meu projeto": fases, entregas, agenda e OS publicadas. Crie o usuário em Administração > Usuários (perfil comum ou somente leitura, sem empresa) e vincule o e-mail aqui.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {indisponivel && <p className="text-xs text-amber-700">Recurso ainda não disponível no banco (falta aplicar a migração de acesso do cliente).</p>}
        {(acessos || []).map((u) => (
          <div key={u.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
            <span>{u.email}{u.nome ? <span className="text-muted-foreground"> · {u.nome}</span> : null}</span>
            <Button variant="ghost" size="sm" onClick={() => remover(u)}>Remover</Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input type="email" placeholder="e-mail do usuário do cliente" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={vincular} disabled={salvando || !email.trim() || indisponivel}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Liberar acesso</Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ResumoTab = ({ cliente, servico, onSalvar, onIniciar, iniciando, temOnboarding }) => {
  const [f, setF] = useState(cliente);
  const [inicio, setInicio] = useState(hojeISO());
  const muda = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Dados do cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Razão social / nome</Label><Input value={f.nome || ''} onChange={(e) => muda('nome', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CNPJ / CPF</Label><Input value={f.cnpj_cpf || ''} onChange={(e) => muda('cnpj_cpf', e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={f.telefone || ''} onChange={(e) => muda('telefone', e.target.value)} /></div>
          </div>
          <div><Label>E-mail</Label><Input value={f.email || ''} onChange={(e) => muda('email', e.target.value)} /></div>
          <div><Label>Segmento</Label><Input value={f.segmento || ''} onChange={(e) => muda('segmento', e.target.value)} /></div>
          <div>
            <Label>Serviços contratados</Label>
            <div className="flex gap-6 mt-1">
              {Object.values(SERVICOS).map((s) => (
                <label key={s.chave} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={(f.servicos || []).includes(s.chave)} onCheckedChange={(v) => muda('servicos', v === true ? [...new Set([...(f.servicos || []), s.chave])] : (f.servicos || []).filter((x) => x !== s.chave))} />
                  {s.rotulo}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {servico === 'bpo' ? (
            <div>
              <Label>Plano contratado</Label>
              <select className={selectCls} value={f.plano || ''} onChange={(e) => muda('plano', e.target.value || null)}>
                <option value="">—</option>
                {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            ) : <div />}
            <div>
              <Label>Situação</Label>
              <select className={selectCls} value={f.status_contrato} onChange={(e) => muda('status_contrato', e.target.value)}>
                {Object.entries(STATUS_CONTRATO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          {servico === 'bpo' && <div>
            <Label>Base da DRE deste cliente</Label>
            <select className={selectCls} value={f.base_dre} onChange={(e) => muda('base_dre', e.target.value)}>
              <option value="extrato">Extrato bancário (regime de caixa) — recomendado para clientes pequenos</option>
              <option value="competencia">Competência (a partir dos títulos)</option>
            </select>
          </div>}
          <Button onClick={() => { if (!(f.servicos || []).length) { alert('Marque ao menos um serviço contratado.'); return; } onSalvar({
            nome: f.nome, cnpj_cpf: f.cnpj_cpf || null, telefone: f.telefone || null, email: f.email || null,
            segmento: f.segmento || null, plano: f.plano || null, status_contrato: f.status_contrato, base_dre: f.base_dre, servicos: f.servicos
          }); }}>Salvar dados</Button>
        </CardContent>
      </Card>

      {servico === 'bpo' && <Card>
        <CardHeader>
          <CardTitle className="text-base">Onboarding B1</CardTitle>
          <CardDescription>Projeto de 8 dias: diagnóstico e processo (Bloco 01) e implantação técnica (Bloco 02).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {temOnboarding ? (
            <p className="text-sm text-muted-foreground">O onboarding já foi iniciado. Acompanhe pelas abas Diagnóstico e Implantação.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Ao iniciar, o sistema cria as 12 atividades do cronograma, com datas em dias úteis, e o checklist de implantação com 39 itens.</p>
              <div className="max-w-[200px]"><Label>Data de início</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
              <Button onClick={() => onIniciar(inicio)} disabled={iniciando || !inicio}>
                {iniciando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}Iniciar onboarding B1
              </Button>
            </>
          )}
        </CardContent>
      </Card>}

      <div className="lg:col-span-2"><AcessoCliente cliente={cliente} /></div>
    </div>
  );
};

const ClienteEngagement = ({ servico = 'bpo' }) => {
  const cfg = SERVICOS[servico] || SERVICOS.bpo;
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cliente, setCliente] = useState(null);
  const [temOnboarding, setTemOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [aba, setAba] = useState('resumo');

  const carregar = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([carregarCliente(id), listarTarefas(id, { origem: 'b1' })]);
      setCliente(c);
      setTemOnboarding(t.length > 0);
    } catch (e) {
      toast({ title: 'Erro ao carregar o cliente', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async (dados) => {
    try {
      setCliente(await atualizarCliente(id, dados));
      toast({ title: 'Dados salvos' });
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    }
  };

  const iniciar = async (inicio) => {
    setIniciando(true);
    try {
      await iniciarOnboarding(id, inicio);
      toast({ title: 'Onboarding B1 iniciado' });
      await carregar();
      setAba('diagnostico');
    } catch (e) {
      toast({ title: 'Não foi possível iniciar', description: e.message, variant: 'destructive' });
    } finally {
      setIniciando(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!cliente) return <p className="text-sm text-muted-foreground py-10 text-center">Cliente não encontrado.</p>;

  return (
    <>
      <Helmet><title>{cliente.nome} | {cfg.rotulo}</title></Helmet>
      <PageHeader
        title={cliente.nome}
        description={`${cfg.rotulo}${servico === 'bpo' && cliente.plano ? ` · Plano ${cliente.plano}` : ''}${(cliente.servicos || []).length > 1 ? ` · também contratou ${SERVICOS[(cliente.servicos || []).find((s) => s !== servico)]?.rotulo || ''}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{STATUS_CONTRATO[cliente.status_contrato]}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate(cfg.rotaLista)}><ArrowLeft className="w-4 h-4 mr-2" /> Clientes</Button>
          </div>
        }
      />
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          {servico === 'bpo' && <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>}
          {servico === 'bpo' && <TabsTrigger value="implantacao">Implantação</TabsTrigger>}
          {servico === 'bpo' && <TabsTrigger value="acessos">Acessos</TabsTrigger>}
          {servico === 'consultoria' && <TabsTrigger value="consultoria">Projeto F5</TabsTrigger>}
        </TabsList>
        <TabsContent value="resumo" className="mt-4">
          <ResumoTab key={cliente.updated_at || cliente.id} cliente={cliente} servico={servico} onSalvar={salvar} onIniciar={iniciar} iniciando={iniciando} temOnboarding={temOnboarding} />
        </TabsContent>
        {servico === 'bpo' && <TabsContent value="diagnostico" className="mt-4"><DiagnosticoTab cliente={cliente} /></TabsContent>}
        {servico === 'bpo' && <TabsContent value="implantacao" className="mt-4"><ImplantacaoTab cliente={cliente} /></TabsContent>}
        {servico === 'bpo' && <TabsContent value="acessos" className="mt-4"><AcessosTab cliente={cliente} /></TabsContent>}
        {servico === 'consultoria' && <TabsContent value="consultoria" className="mt-4"><ConsultoriaTab cliente={cliente} /></TabsContent>}
      </Tabs>
    </>
  );
};

export default ClienteEngagement;
