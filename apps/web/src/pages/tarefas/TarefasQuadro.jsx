import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Loader2, Plus, Search, CheckCircle2, ListChecks, MoreHorizontal } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  PRIORIDADES, hojeISO, iniciais, listarUsuarios, carregarQuadro, criarCartao, criarColuna, atualizarColuna, excluirColuna, moverCartao, ordemEntre
} from '@/lib/tarefasService';
import CartaoDialog from './CartaoDialog';

const fmt = (iso) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');

const TarefasQuadro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company_id: companyId, user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [dados, setDados] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [soMinhas, setSoMinhas] = useState(false);
  const [responsavel, setResponsavel] = useState('');
  const [novos, setNovos] = useState({});
  const [novaColuna, setNovaColuna] = useState('');
  const [aberto, setAberto] = useState(null);
  const hoje = hojeISO();
  const userId = user?.id;

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const [d, u] = await Promise.all([carregarQuadro(id), listarUsuarios().catch(() => [])]);
      setDados(d); setUsuarios(u);
    } catch (e) { toast({ title: 'Erro ao carregar o quadro', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, id, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const nomeDe = (uid) => usuarios.find((u) => u.id === uid)?.nome || '';

  const cartoesDa = useCallback((colunaId) => {
    if (!dados) return [];
    return dados.cartoes.filter((c) => c.coluna_id === colunaId).filter((c) => {
      if (soMinhas && c.responsavel_id !== userId) return false;
      if (responsavel && c.responsavel_id !== responsavel) return false;
      if (busca && !`${c.titulo} ${c.descricao || ''}`.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    }).sort((a, b) => Number(a.ordem) - Number(b.ordem));
  }, [dados, soMinhas, responsavel, busca, userId]);

  const aoSoltar = async (r) => {
    if (!r.destination) return;
    const { source, destination, draggableId } = r;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const cartao = dados.cartoes.find((c) => c.id === draggableId);
    const destino = dados.colunas.find((c) => c.id === destination.droppableId);
    // vizinhos na coluna de destino considerando todos os cartões (os filtros podem esconder alguns)
    const todosDestino = dados.cartoes.filter((c) => c.coluna_id === destino.id && c.id !== cartao.id).sort((a, b) => Number(a.ordem) - Number(b.ordem));
    const visiveis = cartoesDa(destino.id).filter((c) => c.id !== cartao.id);
    const ref = visiveis[destination.index];
    const posicao = ref ? todosDestino.findIndex((c) => c.id === ref.id) : todosDestino.length;
    const ordem = ordemEntre(todosDestino[posicao - 1] && Number(todosDestino[posicao - 1].ordem), todosDestino[posicao] && Number(todosDestino[posicao].ordem));
    const anterior = dados;
    setDados({ ...dados, cartoes: dados.cartoes.map((c) => (c.id === cartao.id ? { ...c, coluna_id: destino.id, ordem, concluido_em: destino.concluida ? (c.concluido_em || new Date().toISOString()) : null } : c)) });
    try { await moverCartao(cartao, destino, ordem); }
    catch (e) { setDados(anterior); toast({ title: 'Não foi possível mover a tarefa', description: e.message, variant: 'destructive' }); }
  };

  const adicionar = async (coluna) => {
    const titulo = (novos[coluna.id] || '').trim();
    if (!titulo) return;
    const naColuna = dados.cartoes.filter((c) => c.coluna_id === coluna.id);
    try {
      await criarCartao(companyId, userId, id, coluna.id, { titulo, concluido_em: coluna.concluida ? new Date().toISOString() : null }, ordemEntre(naColuna.length ? Math.max(...naColuna.map((c) => Number(c.ordem))) : undefined, undefined));
      setNovos((n) => ({ ...n, [coluna.id]: '' }));
      await carregar();
    } catch (e) { toast({ title: 'Não foi possível criar a tarefa', description: e.message, variant: 'destructive' }); }
  };

  const addColuna = async () => {
    if (!novaColuna.trim()) return;
    try { await criarColuna(companyId, id, novaColuna.trim(), Math.max(0, ...dados.colunas.map((c) => c.ordem)) + 1); setNovaColuna(''); await carregar(); }
    catch (e) { toast({ title: 'Não foi possível criar a coluna', description: e.message, variant: 'destructive' }); }
  };

  const total = dados?.cartoes.length || 0;
  const abertos = dados?.cartoes.filter((c) => !c.concluido_em) || [];
  const atrasados = abertos.filter((c) => c.prazo && c.prazo < hoje).length;
  const cartaoAberto = useMemo(() => dados?.cartoes.find((c) => c.id === aberto) || null, [dados, aberto]);

  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver as tarefas dela.</p>;
  if (!dados) return null;

  return (
    <>
      <Helmet><title>{dados.quadro.nome} | Tarefas</title></Helmet>
      <PageHeader
        title={dados.quadro.nome}
        description={`${abertos.length} em aberto · ${atrasados} atrasada(s) · ${total - abertos.length} concluída(s)`}
        action={<Button variant="outline" size="sm" onClick={() => navigate('/tarefas')}><ArrowLeft className="w-4 h-4 mr-2" /> Quadros</Button>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar tarefa" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}><option value="">Todos os responsáveis</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select>
        <button type="button" onClick={() => setSoMinhas((v) => !v)} className={`px-3 h-10 rounded-md border text-sm ${soMinhas ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>Minhas tarefas</button>
      </div>

      <DragDropContext onDragEnd={aoSoltar}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 w-max items-start">
            {dados.colunas.map((col) => {
              const lista = cartoesDa(col.id);
              return (
                <div key={col.id} className="w-[290px] shrink-0 rounded-lg bg-muted/40 border border-border flex flex-col max-h-[calc(100vh-290px)]">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0"><span className="font-semibold text-sm truncate">{col.nome}</span>{col.concluida && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" title="Coluna de concluídas" />}<span className="text-xs text-muted-foreground">{lista.length}</span></div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button type="button" className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={async () => { const n = window.prompt('Novo nome da coluna', col.nome); if (n && n.trim()) { await atualizarColuna(col.id, { nome: n.trim() }); carregar(); } }}>Renomear</DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => { await atualizarColuna(col.id, { concluida: !col.concluida }); carregar(); }}>{col.concluida ? 'Deixar de ser coluna de concluídas' : 'Marcar como coluna de concluídas'}</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={async () => { if (dados.cartoes.some((c) => c.coluna_id === col.id)) { toast({ title: 'Mova ou exclua as tarefas desta coluna antes de excluí-la', variant: 'destructive' }); return; } if (window.confirm(`Excluir a coluna "${col.nome}"?`)) { await excluirColuna(col.id); carregar(); } }}>Excluir coluna</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(prov, snap) => (
                      <div ref={prov.innerRef} {...prov.droppableProps} className={`px-2 pb-2 space-y-2 overflow-y-auto min-h-[40px] ${snap.isDraggingOver ? 'bg-primary/5' : ''}`}>
                        {lista.map((c, idx) => {
                          const atrasada = c.prazo && c.prazo < hoje && !c.concluido_em;
                          const feitos = (c.checklist || []).filter((i) => i.feito).length;
                          return (
                            <Draggable key={c.id} draggableId={c.id} index={idx}>
                              {(p) => (
                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} onClick={() => setAberto(c.id)} className={`rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:border-primary/50 ${c.concluido_em ? 'opacity-70' : ''}`}>
                                  <div className={`text-sm font-medium leading-snug ${c.concluido_em ? 'line-through' : ''}`}>{c.titulo}</div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    {c.prioridade !== 'media' && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORIDADES[c.prioridade].cor}`}>{PRIORIDADES[c.prioridade].rotulo}</span>}
                                    {c.prazo && <span className={`text-[11px] px-1.5 py-0.5 rounded ${atrasada ? 'bg-red-100 text-red-700 font-medium' : 'bg-muted text-muted-foreground'}`}>{fmt(c.prazo)}</span>}
                                    {(c.checklist || []).length > 0 && <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5"><ListChecks className="h-3 w-3" />{feitos}/{c.checklist.length}</span>}
                                    {c.responsavel_id && <span title={nomeDe(c.responsavel_id)} className="ml-auto h-6 w-6 rounded-full bg-primary/15 text-primary text-[10px] font-semibold flex items-center justify-center">{iniciais(nomeDe(c.responsavel_id))}</span>}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                  <div className="p-2 border-t border-border">
                    <div className="flex gap-1"><Input className="h-8 text-sm" placeholder="+ Adicionar tarefa" value={novos[col.id] || ''} onChange={(e) => setNovos((n) => ({ ...n, [col.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') adicionar(col); }} /><Button size="sm" className="h-8" onClick={() => adicionar(col)}><Plus className="w-4 h-4" /></Button></div>
                  </div>
                </div>
              );
            })}
            <div className="w-[260px] shrink-0 rounded-lg border border-dashed border-border p-3">
              <div className="flex gap-1"><Input className="h-8 text-sm" placeholder="+ Nova coluna" value={novaColuna} onChange={(e) => setNovaColuna(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addColuna(); }} /><Button size="sm" variant="outline" className="h-8" onClick={addColuna}><Plus className="w-4 h-4" /></Button></div>
            </div>
          </div>
        </div>
      </DragDropContext>

      <CartaoDialog aberto={!!cartaoAberto} cartao={cartaoAberto} colunas={dados.colunas} cartoes={dados.cartoes} usuarios={usuarios} quadro={dados.quadro} companyId={companyId} userId={userId} onFechar={() => setAberto(null)} onMudou={carregar} />
    </>
  );
};

export default TarefasQuadro;
