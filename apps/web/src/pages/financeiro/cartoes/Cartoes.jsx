import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { listarCartoes, resumoDosCartoes, moeda, fmtData } from '@/lib/cartaoService';
import CartaoFormDialog from './CartaoFormDialog';

const Barra = ({ pct }) => (
  <div className="h-2 rounded bg-muted overflow-hidden"><div className={`h-2 rounded ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct || 0)}%` }} /></div>
);

// Cartões de crédito: gasto, fatura a pagar e limite disponível de cada um.
const Cartoes = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cartoes, setCartoes] = useState([]);
  const [resumos, setResumos] = useState({});
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [lista, res] = await Promise.all([listarCartoes(companyId), resumoDosCartoes(companyId)]);
      setCartoes(lista);
      setResumos(Object.fromEntries(res.map((r) => [r.cartao.id, r])));
    } catch (e) { toast({ title: 'Erro ao carregar os cartões', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver os cartões dela.</p>;

  return (
    <>
      <Helmet><title>Cartões de Crédito - Engagement ERP</title></Helmet>
      <PageHeader title="Cartões de Crédito" description="Quanto foi gasto, a fatura a pagar e o limite disponível de cada cartão." icon={CreditCard}
        action={<Button onClick={() => setNovo(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo cartão</Button>} />
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : cartoes.length === 0 ? (
        <div className="text-center py-14"><CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground mb-4">Nenhum cartão cadastrado. Cadastre o primeiro para lançar as compras e acompanhar as faturas.</p><Button onClick={() => setNovo(true)}>Cadastrar cartão</Button></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {cartoes.map((c) => {
            const r = resumos[c.id];
            return (
              <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/financeiro/cartoes/${c.id}`)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="font-semibold text-lg">{c.nome}</div><div className="text-xs text-muted-foreground">{[c.bandeira, c.final && `final ${c.final}`, `fecha dia ${c.dia_fechamento} · vence dia ${c.dia_vencimento}`].filter(Boolean).join(' · ')}</div></div>
                    {!c.ativo && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  {r ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><div className="text-xs text-muted-foreground">Gasto no mês</div><div className="font-semibold">{moeda(r.gastoMes)}</div></div>
                        <div><div className="text-xs text-muted-foreground">Fatura aberta (fecha {fmtData(r.faturaAberta.fechamento).slice(0, 5)})</div><div className="font-semibold">{moeda(r.faturaAberta.valor)}</div></div>
                        <div><div className="text-xs text-muted-foreground">{r.aPagar ? `A pagar (vence ${fmtData(r.aPagar.vencimento).slice(0, 5)})` : 'A pagar'}</div><div className="font-semibold text-red-600">{r.aPagar ? moeda(r.aPagar.valor) : '—'}</div></div>
                        <div><div className="text-xs text-muted-foreground">Limite disponível</div><div className="font-semibold text-emerald-600">{moeda(r.disponivel)}</div></div>
                      </div>
                      {r.limite > 0 && <div className="space-y-1"><Barra pct={r.percentual} /><div className="text-[11px] text-muted-foreground">{moeda(r.utilizado)} usados de {moeda(r.limite)} ({(r.percentual ?? 0).toLocaleString('pt-BR')}%)</div></div>}
                    </>
                  ) : <p className="text-xs text-muted-foreground">Cartão inativo.</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <CartaoFormDialog aberto={novo} onFechar={() => setNovo(false)} companyId={companyId} onSalvo={(c) => { carregar(); navigate(`/financeiro/cartoes/${c.id}`); }} />
    </>
  );
};

export default Cartoes;
