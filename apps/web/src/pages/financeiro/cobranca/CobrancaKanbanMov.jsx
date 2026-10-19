import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, BarChart2, CalendarCheck, PauseCircle, Loader2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { getPhaseSequence, PHASES, formatCurrency } from '@/lib/cobrancaService';
import { carregarCobranca, aplicarFiltros } from '@/lib/cobrancaMovService';
import { formatDateOnly } from '@/lib/dateUtils';
import CobrancaFiltersIntegrated from './CobrancaFiltersIntegrated';
import CobrancaCardModalMov from './CobrancaCardModalMov';
import BaixaMovimentacaoModal from '../components/BaixaMovimentacaoModal';

const diasDesde = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

// Kanban da cobrança sobre a Movimentação Financeira: títulos a receber em aberto, por fase da régua de vencimento.
const CobrancaKanbanMov = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company_id, loading: authLoading } = useAuthContext();

  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [card, setCard] = useState(null);
  const [baixaId, setBaixaId] = useState(null);
  const [empresaNome, setEmpresaNome] = useState('');

  const carregar = useCallback(async () => {
    if (!company_id) { setLoading(false); return; }
    setLoading(true);
    setErro(null);
    try {
      setItens(await carregarCobranca(company_id));
    } catch (e) {
      setErro(e.message || 'Falha ao carregar a cobrança.');
      toast({ title: 'Erro', description: 'Não foi possível carregar a cobrança.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [company_id, toast]);

  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  useEffect(() => {
    if (!company_id) return;
    supabase.from('empresas').select('razao_social, nome_fantasia').eq('id', company_id).single()
      .then(({ data }) => setEmpresaNome(data?.nome_fantasia || data?.razao_social || ''));
  }, [company_id]);

  // mantém o cartão aberto atualizado depois de registrar uma ação
  useEffect(() => {
    setCard((atual) => (atual ? itens.find((i) => i.id === atual.id) || null : null));
  }, [itens]);

  const filtrados = useMemo(() => aplicarFiltros(itens, filtros), [itens, filtros]);

  const colunas = getPhaseSequence().map((fase) => ({
    id: fase,
    titulo: PHASES[fase].label,
    cor: PHASES[fase].border,
    itens: filtrados.filter((i) => i.fase === fase)
  }));

  if (authLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Helmet><title>Cobrança | Financeiro</title></Helmet>

      <PageHeader
        title="Cobrança"
        description="Títulos a receber em aberto, organizados pela régua de vencimento. Registre contatos, promessas de pagamento e o recebimento."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={carregar} disabled={loading} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/financeiro/cobranca/dashboard')} className="text-muted-foreground border-border">
              <BarChart2 className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </div>
        }
      />

      {!company_id ? (
        <div className="flex items-start gap-2 rounded-md border border-border p-4 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5" /> Entre com o usuário de uma empresa para ver a cobrança dela.
        </div>
      ) : (
        <>
          <CobrancaFiltersIntegrated onFilterChange={setFiltros} />

          {erro && <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{erro}</div>}

          <p className="text-xs text-muted-foreground mb-2">
            {filtrados.length} de {itens.length} títulos · a fase vem do vencimento (D-3 a D+30); recuperados = pagos com atraso nos últimos 60 dias.
          </p>

          <div className="overflow-x-auto overflow-y-hidden h-[calc(100vh-340px)] min-h-[420px] pb-4 w-full">
            <div className="flex flex-nowrap gap-4 w-max h-full px-2">
              {colunas.map((col) => {
                const total = col.itens.reduce((s, i) => s + (i.recuperado ? i.valor_recebido : i.saldo), 0);
                return (
                  <div key={col.id} className="flex flex-col w-[300px] flex-shrink-0 bg-muted/40 rounded-lg border border-border h-full">
                    <div className={`p-3 border-b-2 ${col.cor} bg-card rounded-t-lg`}>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">{col.titulo}</h3>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">{col.itens.length}</Badge>
                      </div>
                      <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(total)}</div>
                    </div>

                    <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                      {loading && itens.length === 0 ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                      ) : col.itens.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-6">Nenhum título</p>
                      ) : col.itens.map((i) => {
                        const contatoHa = diasDesde(i.ultimoContatoEm);
                        return (
                          <div
                            key={i.id}
                            onClick={() => setCard(i)}
                            className={`mb-2 p-3 rounded border bg-card shadow-sm cursor-pointer hover:border-blue-500/50 transition-all border-border ${i.recuperado || i.suspensa ? 'opacity-70' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-medium text-foreground text-sm truncate pr-2 w-full" title={i.cliente?.nome}>{i.cliente?.nome || 'Sem cliente'}</h4>
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground mb-2 truncate" title={i.numero_titulo}>{i.numero_titulo}</div>

                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Venc: {formatDateOnly(i.data_vencimento)}</span>
                              {!i.recuperado && (
                                <span className={i.dias_ate_vencimento < 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                  {i.dias_ate_vencimento < 0 ? `${i.dias_atraso}d atraso` : `${i.dias_ate_vencimento}d prazo`}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(i.recuperado ? i.valor_recebido : i.saldo)}</div>
                            {i.recuperado && i.pago_em && <div className="text-[11px] text-muted-foreground">recebido em {formatDateOnly(i.pago_em)}</div>}

                            <div className="flex flex-wrap gap-1 mt-2">
                              {i.promessa && !i.recuperado && (
                                <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${i.promessa.vencida ? 'border-red-500/40 text-red-600' : 'border-blue-500/40 text-blue-600'}`}>
                                  <CalendarCheck className="h-3 w-3" /> Promessa {formatDateOnly(i.promessa.data)}{i.promessa.vencida ? ' (vencida)' : ''}
                                </Badge>
                              )}
                              {i.suspensa && !i.recuperado && <Badge variant="outline" className="text-[10px] h-5 gap-1 border-amber-500/40 text-amber-600"><PauseCircle className="h-3 w-3" /> Suspensa</Badge>}
                              {contatoHa !== null && !i.recuperado && <Badge variant="secondary" className="text-[10px] h-5">contato há {contatoHa}d</Badge>}
                              {i.subcategoria?.nome && <Badge variant="secondary" className="text-[10px] h-5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 max-w-[140px] truncate">{i.subcategoria.nome}</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {card && (
        <CobrancaCardModalMov
          isOpen={!!card}
          card={card}
          empresaNome={empresaNome}
          onClose={() => setCard(null)}
          onChanged={carregar}
          onRegistrarRecebimento={(c) => { setCard(null); setBaixaId(c.id); }}
        />
      )}

      <BaixaMovimentacaoModal
        open={!!baixaId}
        movimentacaoId={baixaId}
        onOpenChange={(open) => { if (!open) setBaixaId(null); }}
        onSaved={() => { toast({ title: 'Recebimento registrado', description: 'O título saiu da cobrança e a baixa já está na Conciliação.' }); carregar(); }}
      />
    </>
  );
};

export default CobrancaKanbanMov;
