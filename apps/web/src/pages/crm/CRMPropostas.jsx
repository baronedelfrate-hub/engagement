import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Settings2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { listarPropostas, moeda, STATUS_PROPOSTA } from '@/lib/crmService';

const COR = { rascunho: 'outline', enviada: 'warning', aceita: 'success', recusada: 'destructive', expirada: 'secondary' };
const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const FILTROS = [['todas', 'Todas'], ['rascunho', 'Rascunho'], ['enviada', 'Enviadas'], ['aceita', 'Aceitas'], ['recusada', 'Recusadas']];

const CRMPropostas = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try { setLista(await listarPropostas(companyId)); }
    catch (e) { toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;

  const vis = lista.filter((p) => filtro === 'todas' || p.status === filtro);
  const abertas = lista.filter((p) => p.status === 'enviada');

  return (
    <>
      <Helmet><title>Propostas | CRM</title></Helmet>
      <PageHeader
        title="Propostas"
        description={`${lista.length} proposta(s) · ${abertas.length} aguardando resposta (${moeda(abertas.reduce((s, p) => s + Number(p.valor_total || 0), 0))}).`}
        action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => navigate('/crm/configuracoes')}><Settings2 className="w-4 h-4 mr-2" /> Textos da proposta</Button><Button onClick={() => navigate('/crm/propostas/nova')}><Plus className="w-4 h-4 mr-2" /> Nova proposta</Button></div>}
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTROS.map(([id, r]) => <button key={id} type="button" onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-md border text-sm ${filtro === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}>{r}</button>)}
      </div>
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : vis.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhuma proposta {filtro === 'todas' ? 'ainda. Clique em "Nova proposta" para criar a primeira.' : 'nesta situação.'}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Número</th><th className="text-left p-3">Cliente</th><th className="text-left p-3">Proposta</th><th className="text-right p-3">Valor</th><th className="text-left p-3">Emissão</th><th className="text-left p-3">Situação</th></tr></thead>
            <tbody className="divide-y divide-border">
              {vis.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/crm/propostas/${p.id}`)}>
                  <td className="p-3 font-medium whitespace-nowrap">{p.numero}{p.versao > 1 ? ` v${p.versao}` : ''}</td>
                  <td className="p-3">{p.conta?.nome || <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 max-w-[320px] truncate">{p.titulo}</td>
                  <td className="p-3 text-right">{moeda(p.valor_total)}</td>
                  <td className="p-3 text-xs">{fmt(p.data_emissao)}</td>
                  <td className="p-3"><Badge variant={COR[p.status]}>{STATUS_PROPOSTA[p.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default CRMPropostas;
