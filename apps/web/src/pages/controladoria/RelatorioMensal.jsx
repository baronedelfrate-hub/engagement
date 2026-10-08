import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Building2, FileDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import FiltrosGerenciais from '@/components/controladoria/FiltrosGerenciais';
import { useDadosGerenciais } from '@/hooks/useDadosGerenciais';
import { supabase } from '@/lib/customSupabaseClient';
import { montarDRE, calcularPE, agregarDashboard, MESES } from '@/lib/dreGerencial';
import { gerarRelatorioMensalPdf } from '@/lib/relatorioMensalPdf';

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const diasNoMes = (ano, m) => new Date(ano, m + 1, 0).getDate();

function RelatorioMensal() {
  const dados = useDadosGerenciais();
  const { toast } = useToast();
  const { authLoading, empresaId, isSuperAdmin, ano, movs, categorias, subcategorias, loading, error } = dados;
  const [mes, setMes] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (!empresaId) { setEmpresa(null); return; }
    supabase.from('empresas').select('razao_social, nome_fantasia, cnpj').eq('id', empresaId).single().then(({ data }) => setEmpresa(data));
  }, [empresaId]);

  // mês inicial: o mês do último lançamento do ano
  useEffect(() => {
    if (!movs.length) return;
    const ultimo = movs.reduce((a, b) => (a > b.data_transacao ? a : b.data_transacao), '');
    setMes((atual) => (atual !== null && movs.some((m) => Number(m.data_transacao.slice(5, 7)) - 1 === atual) ? atual : Number(ultimo.slice(5, 7)) - 1));
  }, [movs]);

  const dre = useMemo(() => (ano ? montarDRE(movs, { ano, categorias, subcategorias }) : null), [movs, ano, categorias, subcategorias]);
  const pe = useMemo(() => (dre ? calcularPE(dre) : null), [dre]);
  const dash = useMemo(() => {
    if (!ano || mes === null) return null;
    const mm = String(mes + 1).padStart(2, '0');
    return agregarDashboard(movs, { categorias, subcategorias, de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${diasNoMes(ano, mes)}` });
  }, [movs, categorias, subcategorias, ano, mes]);

  const naoClassificado = useMemo(() => {
    if (!dre) return { qtd: 0, valor: 0 };
    const catIds = new Set(categorias.filter((c) => c.grupo_dre).map((c) => c.id));
    const sem = movs.filter((m) => !m.categoria_id || !catIds.has(m.categoria_id));
    return { qtd: sem.length, valor: sem.reduce((s, m) => s + Number(m.valor), 0) };
  }, [dre, movs, categorias]);

  const gerar = async () => {
    setGerando(true);
    try {
      const nome = await gerarRelatorioMensalPdf({ empresa, ano, mes, dre, pe, dash, naoClassificado });
      toast({ title: 'Relatório gerado', description: `Arquivo ${nome} baixado.` });
    } catch (e) {
      toast({ title: 'Erro ao gerar o PDF', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setGerando(false);
    }
  };

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const pronto = dre && pe && dash && mes !== null;
  const p = dre?.porChave;

  return (
    <>
      <Helmet><title>Relatório Mensal - ERP Platform</title></Helmet>
      <PageHeader title="Relatório Mensal" description="Relatório gerencial do mês em PDF: resumo, DRE, ponto de equilíbrio, despesas por categoria e receita por cliente." />

      <FiltrosGerenciais dados={dados}>
        <Select value={mes === null ? '' : String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="w-32 bg-background"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>{MESES.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={gerar} disabled={!pronto || gerando} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Gerar PDF
        </Button>
      </FiltrosGerenciais>

      {!empresaId ? (
        <Card className="flex flex-col items-center py-16 text-center"><Building2 className="h-14 w-14 text-muted-foreground mb-4 opacity-20" /><CardTitle className="text-xl text-muted-foreground">Nenhuma empresa selecionada</CardTitle><CardDescription className="mt-2">{isSuperAdmin ? 'Selecione uma empresa no filtro acima.' : 'Seu usuário não está ligado a uma empresa.'}</CardDescription></Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : movs.length === 0 ? (
        <Card className="py-12 text-center"><CardTitle className="text-lg">Sem lançamentos em {ano}</CardTitle><CardDescription className="mt-2">Importe o extrato em Financeiro &gt; Importar Extrato.</CardDescription></Card>
      ) : !pronto ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {naoClassificado.qtd > 0 && (
            <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Há {naoClassificado.qtd} lançamentos sem classificação (R$ {fmt(Math.abs(naoClassificado.valor))}). O relatório sai com esse aviso, mas o resultado só fica completo depois de <Link to="/financeiro/classificar-extrato" className="underline">classificar</Link>.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-blue-600">Receita bruta — {MESES[mes]}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {fmt(p.receita_bruta.valores[mes])}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-green-600">Lucro líquido — {MESES[mes]}</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${p.lucro_liquido.valores[mes] < 0 ? 'text-red-600' : ''}`}>R$ {fmt(p.lucro_liquido.valores[mes])}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-purple-600">Ponto de equilíbrio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {fmt(pe.meses[mes].pe)}</div><div className="text-xs text-muted-foreground">{pe.meses[mes].situacao || '—'}</div></CardContent></Card>
            <Card><CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-red-600">Despesas pagas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {fmt(dash.despesa)}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>O que vai no PDF</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>1. Resumo do mês e acumulado do ano &nbsp;·&nbsp; 2. DRE gerencial (mês e acumulado) &nbsp;·&nbsp; 3. Ponto de equilíbrio</p>
              <p>4. Despesas por categoria ({dash.despesasPorCategoria.length} categorias) &nbsp;·&nbsp; 5. Receita por cliente ({dash.receitaPorCliente.length} clientes) &nbsp;·&nbsp; 6. Pendências</p>
              <p className="pt-2">Clique em <strong>Gerar PDF</strong> para baixar. O envio por e-mail e WhatsApp virá numa próxima etapa.</p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

export default RelatorioMensal;
