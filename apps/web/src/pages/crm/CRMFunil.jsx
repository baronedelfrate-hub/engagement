import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ETAPAS, hojeISO, moeda, listarOportunidades, listarContas, moverEtapa } from '@/lib/crmService';
import OportunidadeDialog from './OportunidadeDialog';

const formatarData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

const CRMFunil = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [ops, setOps] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogo, setDialogo] = useState({ aberto: false, op: null });

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [o, c] = await Promise.all([listarOportunidades(companyId), listarContas(companyId)]);
      setOps(o); setContas(c);
    } catch (e) { toast({ title: 'Erro ao carregar o funil', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);

  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const colunas = useMemo(() => ETAPAS.map((e) => ({ ...e, itens: ops.filter((o) => o.etapa === e.id) })), [ops]);
  const abertas = ops.filter((o) => !['ganho', 'perdido'].includes(o.etapa));
  const totalAberto = abertas.reduce((s, o) => s + Number(o.valor || 0), 0);
  const ponderado = abertas.reduce((s, o) => s + Number(o.valor || 0) * (o.probabilidade / 100), 0);
  const hoje = hojeISO();

  const aoSoltar = async (r) => {
    if (!r.destination || r.destination.droppableId === r.source.droppableId) return;
    const id = r.draggableId;
    const etapa = r.destination.droppableId;
    let extra = {};
    if (etapa === 'perdido') {
      const motivo = window.prompt('Qual o motivo da perda? (opcional)');
      if (motivo === null) return;
      extra = { motivo_perda: motivo || null };
    }
    const anterior = ops;
    setOps((l) => l.map((o) => (o.id === id ? { ...o, etapa } : o)));
    try { await moverEtapa(id, etapa, extra); await carregar(); }
    catch (e) { setOps(anterior); toast({ title: 'Não foi possível mover', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;

  return (
    <>
      <Helmet><title>Funil | CRM</title></Helmet>
      <PageHeader
        title="Funil de vendas"
        description={`${abertas.length} oportunidade(s) em aberto · ${moeda(totalAberto)} no funil · ${moeda(ponderado)} ponderado pela probabilidade.`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar</Button>
            <Button onClick={() => setDialogo({ aberto: true, op: null })}><Plus className="w-4 h-4 mr-2" /> Nova oportunidade</Button>
          </div>
        }
      />

      <DragDropContext onDragEnd={aoSoltar}>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 w-max min-h-[420px]">
            {colunas.map((col) => (
              <div key={col.id} className={`w-[250px] shrink-0 rounded-lg border border-border border-t-4 ${col.cor} bg-muted/30 flex flex-col`}>
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between"><span className="font-semibold text-sm">{col.rotulo}</span><Badge variant="secondary">{col.itens.length}</Badge></div>
                  <div className="text-xs text-muted-foreground mt-0.5">{moeda(col.itens.reduce((s, o) => s + Number(o.valor || 0), 0))}</div>
                </div>
                <Droppable droppableId={col.id}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.droppableProps} className={`flex-1 p-2 space-y-2 min-h-[120px] ${snap.isDraggingOver ? 'bg-primary/5' : ''}`}>
                      {col.itens.map((o, idx) => {
                        const vencida = o.previsao_fechamento && o.previsao_fechamento < hoje && !['ganho', 'perdido'].includes(o.etapa);
                        return (
                          <Draggable key={o.id} draggableId={o.id} index={idx}>
                            {(p) => (
                              <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} onClick={() => setDialogo({ aberto: true, op: o })} className="rounded-md border border-border bg-card p-3 shadow-sm cursor-pointer hover:border-primary/50">
                                <div className="text-sm font-medium leading-tight">{o.titulo}</div>
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">{o.conta?.nome}</div>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm font-semibold text-emerald-600">{moeda(o.valor)}</span>
                                  <span className="text-xs text-muted-foreground">{o.probabilidade}%</span>
                                </div>
                                {o.previsao_fechamento && <div className={`text-[11px] mt-1 ${vencida ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>fecha em {formatarData(o.previsao_fechamento)}{vencida ? ' (vencida)' : ''}</div>}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {prov.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      <OportunidadeDialog aberto={dialogo.aberto} op={dialogo.op} contas={contas} companyId={companyId} onFechar={() => setDialogo({ aberto: false, op: null })} onMudou={carregar} />
    </>
  );
};

export default CRMFunil;
