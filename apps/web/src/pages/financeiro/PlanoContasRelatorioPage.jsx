import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, FileDown, FileSpreadsheet, Loader2, ListTree, Printer } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PreviaPdfDialog from '@/components/PreviaPdfDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { carregarPlanoContas, gerarPlanoContasPdf, gerarPlanoContasExcel } from '@/lib/planoContasRelatorio';
import { listarEmpresas, nomeDaEmpresa } from '@/lib/disparoResultados';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

// Relatório do plano de contas: categorias, subcategorias e centros de custo da empresa, para ver, imprimir ou baixar.
const PlanoContasRelatorioPage = () => {
  const { company_id: companyId, isSuperAdmin, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [plano, setPlano] = useState(null);
  const [inativos, setInativos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState('');
  const [previa, setPrevia] = useState(null);

  useEffect(() => { if (!authLoading) setEmpresaId((a) => a || companyId || ''); }, [authLoading, companyId]);
  useEffect(() => { if (isSuperAdmin) listarEmpresas().then((l) => { setEmpresas(l); setEmpresaId((a) => a || l[0]?.id || ''); }).catch(() => {}); }, [isSuperAdmin]);
  const nomeEmpresa = useMemo(() => { const e = empresas.find((x) => x.id === empresaId); return e ? nomeDaEmpresa(e) : 'Empresa'; }, [empresas, empresaId]);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }
    setLoading(true);
    carregarPlanoContas(empresaId, { incluirInativos: inativos }).then(setPlano)
      .catch((e) => toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [empresaId, inativos, toast]);

  const [nomeUsuario, setNomeUsuario] = useState('');
  useEffect(() => { if (!isSuperAdmin && empresaId) import('@/lib/customSupabaseClient').then(({ supabase }) => supabase.from('empresas').select('razao_social, nome_fantasia').eq('id', empresaId).maybeSingle().then(({ data }) => setNomeUsuario(data?.nome_fantasia || data?.razao_social || ''))); }, [isSuperAdmin, empresaId]);
  const empresaNome = isSuperAdmin ? nomeEmpresa : (nomeUsuario || 'Empresa');

  const gerar = async (modo) => {
    setOcupado(modo);
    try {
      const args = { empresa: empresaNome, plano };
      if (modo === 'excel') await gerarPlanoContasExcel(args);
      else if (modo === 'previa') setPrevia(await gerarPlanoContasPdf(args, { base64: true }));
      else if (modo === 'imprimir') await gerarPlanoContasPdf(args, { imprimir: true });
      else await gerarPlanoContasPdf(args);
    } catch (e) { toast({ title: 'Não foi possível gerar', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(''); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!empresaId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o plano de contas.</p>;
  const nSub = plano ? plano.categorias.reduce((s, c) => s + c.subcategorias.length, 0) : 0;
  const desligado = !plano || loading || !!ocupado;

  return (
    <>
      <Helmet><title>Plano de Contas - Engagement ERP</title></Helmet>
      <PageHeader title="Plano de Contas e Centros de Custo" icon={ListTree}
        description="Todas as categorias, subcategorias e centros de custo da empresa, para consultar, imprimir ou baixar." />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {isSuperAdmin && <select className={sel} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>{empresas.map((e) => <option key={e.id} value={e.id}>{nomeDaEmpresa(e)}</option>)}</select>}
        <label className="text-sm flex items-center gap-1.5"><input type="checkbox" checked={inativos} onChange={(e) => setInativos(e.target.checked)} /> Incluir inativos</label>
        <div className="flex flex-wrap gap-2 ml-auto">
          <Button variant="outline" size="sm" className="gap-1" disabled={desligado} onClick={() => gerar('previa')}>{ocupado === 'previa' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Visualizar PDF</Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={desligado} onClick={() => gerar('pdf')}><FileDown className="h-4 w-4" /> PDF</Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={desligado} onClick={() => gerar('imprimir')}><Printer className="h-4 w-4" /> Imprimir</Button>
          <Button variant="outline" size="sm" className="gap-1" disabled={desligado} onClick={() => gerar('excel')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
        </div>
      </div>
      {loading || !plano ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
        <>
          <p className="text-sm text-muted-foreground mb-3">{plano.categorias.length} categorias · {nSub} subcategorias · {plano.centros.length} centros de custo</p>
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-2"><CardContent className="p-3 space-y-3">
              {plano.categorias.map((c) => (
                <div key={c.id}>
                  <div className="text-sm font-semibold">{c.codigo ? `${c.codigo} · ` : ''}{c.nome}{c.ativo === false && <span className="ml-2 text-xs font-normal text-muted-foreground">(inativa)</span>}</div>
                  {c.subcategorias.length > 0 && <ul className="ml-4 text-xs text-muted-foreground list-disc">{c.subcategorias.map((s) => <li key={s.id}>{s.codigo ? `${s.codigo} · ` : ''}{s.nome}</li>)}</ul>}
                </div>
              ))}
              {plano.categorias.length === 0 && <p className="text-sm text-muted-foreground">Esta empresa não tem categorias.</p>}
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <div className="text-sm font-semibold mb-1">Centros de custo</div>
              {plano.centros.length === 0 ? <p className="text-xs text-muted-foreground">Esta empresa não tem centros de custo.</p> : <ul className="text-xs list-disc ml-4">{plano.centros.map((c) => <li key={c.id}>{c.codigo ? `${c.codigo} · ` : ''}{c.nome}</li>)}</ul>}
            </CardContent></Card>
          </div>
        </>
      )}
      <PreviaPdfDialog open={!!previa} onOpenChange={(o) => { if (!o) setPrevia(null); }} titulo="Plano de contas" nome={previa?.nome} base64={previa?.base64} />
    </>
  );
};
export default PlanoContasRelatorioPage;
