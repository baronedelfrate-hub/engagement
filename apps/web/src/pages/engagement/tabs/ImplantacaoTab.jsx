import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import AcessosPanel from './AcessosPanel';
import {
  listarAcessosImpl, listarTarefas, atualizarTarefa, listarImplantacao, atualizarItemImplantacao,
  STATUS_TAREFA, formatarData, hojeISO
} from '@/lib/engService';

const selectCls = 'h-8 rounded-md border border-input bg-background px-2 text-xs';

const ImplantacaoTab = ({ cliente }) => {
  const { toast } = useToast();
  const [tarefas, setTarefas] = useState([]);
  const [itens, setItens] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [abertos, setAbertos] = useState({});
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const [t, i, ac] = await Promise.all([listarTarefas(cliente.id, { origem: 'b1' }), listarImplantacao(cliente.id), listarAcessosImpl(cliente.id).catch(() => [])]);
      setTarefas(t);
      setItens(i);
      setAcessos(ac);
    } catch (e) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [cliente.id, toast]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarTarefa = async (t, campos) => {
    setTarefas((l) => l.map((x) => (x.id === t.id ? { ...x, ...campos } : x)));
    try { await atualizarTarefa(t.id, campos); } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); carregar(); }
  };
  const salvarItem = async (it, campos) => {
    setItens((l) => l.map((x) => (x.id === it.id ? { ...x, ...campos } : x)));
    try { await atualizarItemImplantacao(it.id, campos); } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); carregar(); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (tarefas.length === 0 && itens.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">O onboarding B1 ainda não foi iniciado. Use o botão "Iniciar onboarding B1" na aba Resumo.</p>;
  }

  const aplicaveis = tarefas.filter((t) => t.status !== 'na');
  const feitas = aplicaveis.filter((t) => t.status === 'concluido').length;
  const itensAplic = itens.filter((i) => i.status !== 'na');
  const itensOk = itensAplic.filter((i) => i.status === 'ok').length;
  const porSecao = itens.reduce((acc, i) => { (acc[i.secao] ||= []).push(i); return acc; }, {});
  const hoje = hojeISO();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cronograma do B1 (8 dias)</CardTitle>
          <CardDescription>{feitas} de {aplicaveis.length} atividades concluídas. Ao marcar como concluído, a data realizada é preenchida.</CardDescription>
          <Progress value={aplicaveis.length ? (feitas / aplicaveis.length) * 100 : 0} className="h-2" />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Dia</th><th className="text-left p-2">Prevista</th><th className="text-left p-2">Atividade</th><th className="text-left p-2">Carga</th><th className="text-left p-2">Situação</th><th className="text-left p-2">Realizada</th><th className="text-left p-2">Observações</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tarefas.map((t, idx) => {
                const novoBloco = idx === 0 || tarefas[idx - 1].fase !== t.fase;
                const atrasada = t.data_prevista && t.data_prevista < hoje && !['concluido', 'na'].includes(t.status);
                return (
                  <React.Fragment key={t.id}>
                    {novoBloco && <tr><td colSpan={7} className="bg-muted/40 text-xs font-semibold p-2">{t.fase}</td></tr>}
                    <tr className={t.status === 'concluido' ? 'opacity-70' : ''}>
                      <td className="p-2">{t.dia_plano}</td>
                      <td className={`p-2 whitespace-nowrap ${atrasada ? 'text-red-600 font-medium' : ''}`}>{formatarData(t.data_prevista)}</td>
                      <td className="p-2 max-w-[360px]">{t.atividade}</td>
                      <td className="p-2">{t.carga_horas ? `${t.carga_horas}h` : ''}</td>
                      <td className="p-2">
                        <select className={selectCls} value={t.status} onChange={(e) => salvarTarefa(t, { status: e.target.value, data_realizada: e.target.value === 'concluido' ? (t.data_realizada || hoje) : t.data_realizada })}>
                          {Object.entries(STATUS_TAREFA).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                        </select>
                      </td>
                      <td className="p-2"><Input type="date" className="h-8 text-xs w-[140px]" value={t.data_realizada || ''} onChange={(e) => salvarTarefa(t, { data_realizada: e.target.value || null })} /></td>
                      <td className="p-2"><Input className="h-8 text-xs min-w-[160px]" defaultValue={t.observacao || ''} onBlur={(e) => { if (e.target.value !== (t.observacao || '')) salvarTarefa(t, { observacao: e.target.value }); }} /></td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de implantação — Bloco 02</CardTitle>
          <CardDescription>
            Marque OK quando o item estiver recebido e testado, ou N/A quando não se aplica. A implantação só é concluída quando todos os itens aplicáveis estão OK. ({itensOk} de {itensAplic.length})
          </CardDescription>
          <Progress value={itensAplic.length ? (itensOk / itensAplic.length) * 100 : 0} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-5">
          {Object.entries(porSecao).map(([secao, lista]) => (
            <div key={secao}>
              <div className="text-sm font-semibold mb-1">{secao}</div>
              <div className="divide-y divide-border">
                {lista.map((it) => (
                  <div key={it.id} className="py-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_160px_140px] items-center gap-2">
                    <div className="text-sm">{it.item}</div>
                    <div className="flex gap-1">
                      {[['pendente', 'Pendente'], ['ok', 'OK'], ['na', 'N/A']].map(([v, r]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => salvarItem(it, { status: v })}
                          className={`px-2.5 py-1 rounded border text-xs ${it.status === v ? (v === 'ok' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-primary text-primary-foreground border-primary') : 'bg-background border-border hover:bg-muted'}`}
                        >{r}</button>
                      ))}
                    </div>
                    <Input className="h-8 text-xs" placeholder="Responsável" defaultValue={it.responsavel || ''} onBlur={(e) => { if (e.target.value !== (it.responsavel || '')) salvarItem(it, { responsavel: e.target.value }); }} />
                    <Input type="date" className="h-8 text-xs" value={it.prazo || ''} onChange={(e) => salvarItem(it, { prazo: e.target.value || null })} />
                  </div>
                  <div className="mt-1.5">
                    <button type="button" onClick={() => setAbertos((o) => ({ ...o, [it.id]: !o[it.id] }))} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <KeyRound className="h-3 w-3" />{acessos.filter((x) => x.item_id === it.id).length > 0 ? `Acessos e dados (${acessos.filter((x) => x.item_id === it.id).length})` : 'Cadastrar acessos e dados'}
                      {abertos[it.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {abertos[it.id] && <div className="mt-2 pl-3 border-l-2 border-border"><AcessosPanel clienteId={cliente.id} itemId={it.id} acessos={acessos} onAtualizar={setAcessos} /></div>}
                  </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {itensAplic.length > 0 && itensOk === itensAplic.length && <Badge variant="success">Implantação concluída — todos os itens aplicáveis estão OK</Badge>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImplantacaoTab;
