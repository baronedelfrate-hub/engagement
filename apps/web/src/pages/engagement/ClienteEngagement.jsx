import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, PlayCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { carregarCliente, atualizarCliente, iniciarOnboarding, listarTarefas, hojeISO, STATUS_CONTRATO } from '@/lib/engService';
import DiagnosticoTab from './tabs/DiagnosticoTab';
import ImplantacaoTab from './tabs/ImplantacaoTab';
import ConsultoriaTab from './tabs/ConsultoriaTab';

const PLANOS = ['Estruturação F5', 'Básico', 'Essencial', 'Profissional', 'Estratégico'];
const selectCls = 'h-9 rounded-md border border-input bg-background px-3 text-sm w-full';

const ResumoTab = ({ cliente, onSalvar, onIniciar, iniciando, temOnboarding }) => {
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plano contratado</Label>
              <select className={selectCls} value={f.plano || ''} onChange={(e) => muda('plano', e.target.value || null)}>
                <option value="">—</option>
                {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <Label>Situação</Label>
              <select className={selectCls} value={f.status_contrato} onChange={(e) => muda('status_contrato', e.target.value)}>
                {Object.entries(STATUS_CONTRATO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Base da DRE deste cliente</Label>
            <select className={selectCls} value={f.base_dre} onChange={(e) => muda('base_dre', e.target.value)}>
              <option value="extrato">Extrato bancário (regime de caixa) — recomendado para clientes pequenos</option>
              <option value="competencia">Competência (a partir dos títulos)</option>
            </select>
          </div>
          <Button onClick={() => onSalvar({
            nome: f.nome, cnpj_cpf: f.cnpj_cpf || null, telefone: f.telefone || null, email: f.email || null,
            segmento: f.segmento || null, plano: f.plano || null, status_contrato: f.status_contrato, base_dre: f.base_dre
          })}>Salvar dados</Button>
        </CardContent>
      </Card>

      <Card>
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
      </Card>
    </div>
  );
};

const ClienteEngagement = () => {
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
      <Helmet><title>{cliente.nome} | Clientes Engagement</title></Helmet>
      <PageHeader
        title={cliente.nome}
        description={`${(cliente.servicos || []).map((s) => (s === 'bpo' ? 'BPO E5' : 'Consultoria F5')).join(' + ')}${cliente.plano ? ` · Plano ${cliente.plano}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant="outline">{STATUS_CONTRATO[cliente.status_contrato]}</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/bpo/clientes')}><ArrowLeft className="w-4 h-4 mr-2" /> Clientes</Button>
          </div>
        }
      />
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="implantacao">Implantação</TabsTrigger>
          <TabsTrigger value="consultoria">Consultoria F5</TabsTrigger>
        </TabsList>
        <TabsContent value="resumo" className="mt-4">
          <ResumoTab key={cliente.updated_at || cliente.id} cliente={cliente} onSalvar={salvar} onIniciar={iniciar} iniciando={iniciando} temOnboarding={temOnboarding} />
        </TabsContent>
        <TabsContent value="diagnostico" className="mt-4"><DiagnosticoTab cliente={cliente} /></TabsContent>
        <TabsContent value="implantacao" className="mt-4"><ImplantacaoTab cliente={cliente} /></TabsContent>
        <TabsContent value="consultoria" className="mt-4"><ConsultoriaTab cliente={cliente} /></TabsContent>
      </Tabs>
    </>
  );
};

export default ClienteEngagement;
