import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, LayoutGrid, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { PRIORIDADES, hojeISO, listarQuadros, criarQuadro, tarefasAbertas, listarUsuarios, iniciais } from '@/lib/tarefasService';

const CORES = ['#FE6102', '#2563eb', '#16a34a', '#9333ea', '#db2777', '#0891b2', '#475569'];
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : 'sem prazo');

const TarefasQuadros = () => {
  const { company_id: companyId, user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [quadros, setQuadros] = useState([]);
  const [minhas, setMinhas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState('quadros');
  const hoje = hojeISO();

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [q, t, u] = await Promise.all([listarQuadros(companyId), tarefasAbertas(companyId), listarUsuarios().catch(() => [])]);
      setQuadros(q); setMinhas(t.filter((x) => x.responsavel_id === user?.id)); setUsuarios(u);
    } catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, user?.id, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const salvar = async () => {
    if (!novo.nome.trim()) { toast({ title: 'Dê um nome ao quadro', variant: 'destructive' }); return; }
    setSalvando(true);
    try { const q = await criarQuadro(companyId, user?.id, { nome: novo.nome.trim(), descricao: novo.descricao || null, cor: novo.cor }); setNovo(null); navigate(`/tarefas/${q.id}`); }
    catch (e) { toast({ title: 'Não foi possível criar o quadro', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver as tarefas dela.</p>;

  return (
    <>
      <Helmet><title>Tarefas</title></Helmet>
      <PageHeader title="Tarefas" description="Quadros para distribuir o trabalho: cada tarefa tem responsável, prazo e status, e anda de coluna em coluna." action={<Button onClick={() => setNovo({ nome: '', descricao: '', cor: CORES[0] })}><Plus className="w-4 h-4 mr-2" /> Novo quadro</Button>} />

      <div className="flex gap-2 mb-4">
        {[['quadros', `Quadros (${quadros.length})`], ['minhas', `Minhas tarefas (${minhas.length})`]].map(([id, r]) => (
          <button key={id} type="button" onClick={() => setAba(id)} className={`px-3 py-1.5 rounded-md border text-sm ${aba === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>{r}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : aba === 'quadros' ? (
        quadros.length === 0 ? (
          <div className="text-center py-14"><LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground mb-4">Nenhum quadro ainda. Crie o primeiro para começar a distribuir tarefas.</p><Button onClick={() => setNovo({ nome: 'Tarefas gerais', descricao: '', cor: CORES[0] })}><Plus className="w-4 h-4 mr-2" /> Criar quadro "Tarefas gerais"</Button></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {quadros.map((q) => (
              <Card key={q.id} className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden" onClick={() => navigate(`/tarefas/${q.id}`)}>
                <div className="h-2" style={{ background: q.cor || CORES[0] }} />
                <CardContent className="p-5">
                  <div className="font-semibold text-lg">{q.nome}</div>
                  {q.descricao && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{q.descricao}</p>}
                  <div className="flex items-center gap-2 mt-4 text-sm"><Badge variant="secondary">{q.abertos} em aberto</Badge>{q.atrasados > 0 && <Badge variant="destructive">{q.atrasados} atrasada(s)</Badge>}<span className="text-xs text-muted-foreground ml-auto">{q.total} no total</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        minhas.length === 0 ? <p className="text-sm text-muted-foreground py-10 text-center">Você não tem tarefas em aberto atribuídas a você.</p> : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {minhas.map((t) => {
              const atrasada = t.prazo && t.prazo < hoje;
              return (
                <div key={t.id} className="p-3 flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/tarefas/${t.quadro_id}`)}>
                  {atrasada && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />}
                  <div className="flex-1 min-w-0"><div className="font-medium truncate">{t.titulo}</div><div className="text-xs text-muted-foreground">{t.quadro?.nome}</div></div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORIDADES[t.prioridade].cor}`}>{PRIORIDADES[t.prioridade].rotulo}</span>
                  <span className={`text-xs whitespace-nowrap ${atrasada ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{fmt(t.prazo)}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      <Dialog open={!!novo} onOpenChange={(o) => { if (!o) setNovo(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo quadro</DialogTitle></DialogHeader>
          {novo && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="ex.: Financeiro, Marketing, Projeto X" /></div>
              <div><Label>Descrição</Label><Textarea rows={2} value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} /></div>
              <div><Label>Cor</Label><div className="flex gap-2 mt-1">{CORES.map((c) => <button key={c} type="button" onClick={() => setNovo({ ...novo, cor: c })} className={`h-7 w-7 rounded-full border-2 ${novo.cor === c ? 'border-foreground' : 'border-transparent'}`} style={{ background: c }} />)}</div></div>
              <p className="text-xs text-muted-foreground">O quadro nasce com as colunas A fazer, Em andamento, Aguardando e Concluído. Você pode renomear, criar e excluir colunas depois.</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setNovo(null)}>Cancelar</Button><Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar quadro</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TarefasQuadros;
