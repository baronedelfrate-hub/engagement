import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Download, FileText, Loader2, AlertCircle, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { montarVisaoSocia } from '@/lib/visaoSocia';
import { MESES } from '@/lib/dreGerencial';
import { gerarVisaoSociaPdf } from '@/lib/visaoSociaPdf';
import { useToast } from '@/components/ui/use-toast';

const fmt = (v) => (v === 0 ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const cor = (v) => (v < 0 ? 'text-red-600 dark:text-red-400' : '');

const Linha = ({ l, recuo, forte }) => (
  <tr className={`border-b border-border ${l.destaque || forte ? 'bg-muted font-bold' : ''}`}>
    <td className={`px-3 py-2 text-left sticky left-0 ${l.destaque || forte ? 'bg-muted' : 'bg-background'} ${recuo ? 'pl-8' : ''}`}>{l.rotulo}</td>
    {l.valores.map((v, i) => <td key={i} className={`px-3 py-2 ${cor(v)}`}>{fmt(v)}</td>)}
    <td className={`px-3 py-2 font-bold ${cor(l.total)}`}>{fmt(l.total)}</td>
  </tr>
);
const Titulo = ({ texto }) => <tr><td colSpan={14} className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground bg-background">{texto}</td></tr>;

// Junta a pessoa física e as empresas dela: o que saiu das empresas para a sócia e o que chegou ao PF.
function VisaoSocia() {
  const { isSuperAdmin, loading: authLoading } = useAuthContext();
  const anoAtual = new Date().getFullYear();
  const [pessoas, setPessoas] = useState([]);
  const [pessoaId, setPessoaId] = useState('');
  const [ano, setAno] = useState(anoAtual);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      let lista = [];
      if (isSuperAdmin) {
        const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('tipo_pessoa', 'PF').order('razao_social');
        lista = (data || []).map((p) => ({ id: p.id, nome: p.nome_fantasia || p.razao_social }));
      } else {
        const { data } = await supabase.rpc('minhas_empresas');
        lista = (data || []).filter((e) => e.tipo_pessoa === 'PF').map((e) => ({ id: e.id, nome: e.nome }));
      }
      setPessoas(lista);
      setPessoaId((atual) => atual || lista[0]?.id || '');
    })();
  }, [authLoading, isSuperAdmin]);

  useEffect(() => {
    if (!pessoaId) { setDados(null); return undefined; }
    let ativo = true;
    setLoading(true); setError(null);
    supabase.rpc('visao_consolidada_socia', { p_pessoa: pessoaId, p_ano: ano }).then(({ data, error: err }) => {
      if (!ativo) return;
      if (err) { setError(err.message); setDados(null); } else setDados(data);
      setLoading(false);
    });
    return () => { ativo = false; };
  }, [pessoaId, ano]);

  const v = useMemo(() => (dados ? montarVisaoSocia(dados) : null), [dados]);

  const exportPDF = async () => {
    if (!v) return;
    setGerandoPdf(true);
    try { await gerarVisaoSociaPdf({ ano, v }); } catch (e) { toast({ title: 'Não foi possível gerar o PDF', description: e.message, variant: 'destructive' }); } finally { setGerandoPdf(false); }
  };

  const exportCSV = () => {
    if (!v) return;
    const out = [['Conta', ...MESES.map((m) => `${m}/${String(ano).slice(2)}`), 'Total']];
    const add = (l, p = '') => out.push([p + l.rotulo, ...l.valores.map((x) => x.toFixed(2)), l.total.toFixed(2)]);
    v.empresas.forEach((e) => { out.push([`EMPRESA: ${e.nome}`]); e.linhas.forEach((l) => add(l, '   ')); add(e.pago); add(e.aporte); });
    out.push([`PESSOA FÍSICA: ${v.pessoa.nome}`]);
    v.pf.rendimentos.forEach((l) => add(l, '   ')); add(v.pf.totalRendimentos); add(v.pf.gastos); add(v.pf.saldo); add(v.pf.aporteEmpresas); add(v.pf.foraOutros);
    out.push(['CONFERÊNCIA']);
    v.conferencia.forEach((l) => add(l));
    const csv = '﻿' + out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `visao_socia_${ano}.csv`;
    a.click();
  };

  if (authLoading) return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>Visão da Sócia - Engagement ERP</title></Helmet>
      <PageHeader
        title="Visão da Sócia"
        description="A pessoa física e as empresas dela juntas: o que as empresas pagaram à sócia (pró-labore, distribuição, retiradas) e o que entrou e saiu no PF."
        icon={Users}
        action={(
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPDF} disabled={!v || loading || gerandoPdf} className="gap-2">{gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Exportar PDF</Button>
            <Button onClick={exportCSV} disabled={!v || loading} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
          </div>
        )}
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Select value={pessoaId} onValueChange={setPessoaId} disabled={pessoas.length === 0}>
          <SelectTrigger className="w-72 bg-background"><SelectValue placeholder="Sócia (pessoa física)" /></SelectTrigger>
          <SelectContent>{pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={(x) => setAno(Number(x))}>
          <SelectTrigger className="w-28 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>{[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {pessoas.length === 0 ? (
        <Card className="py-12 text-center">
          <CardTitle className="text-lg">Nenhuma pessoa física disponível</CardTitle>
          <CardDescription className="mt-2">Esta tela aparece para quem tem acesso a um cadastro de pessoa física. A equipe Engagement libera em Cadastros &gt; Empresas.</CardDescription>
        </Card>
      ) : error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Não foi possível carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading || !v ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardHeader><CardTitle>{v.pessoa.nome} — {ano}</CardTitle></CardHeader>
          <CardContent>
            {v.empresas.length === 0 && <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">Esta pessoa ainda não está vinculada a nenhuma empresa. Vincule em Cadastros &gt; Empresas, no cadastro dela.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right min-w-[1100px]">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-3 py-2 text-left sticky left-0 bg-muted min-w-[340px]">Conta</th>
                    {MESES.map((m) => <th key={m} className="px-3 py-2">{m}/{String(ano).slice(2)}</th>)}
                    <th className="px-3 py-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {v.empresas.map((e) => (
                    <React.Fragment key={e.id}>
                      <Titulo texto={`Empresa: ${e.nome}${e.participacao != null ? ` (${e.participacao}%)` : ''}`} />
                      {e.linhas.map((l) => <Linha key={l.rotulo} l={l} recuo />)}
                      <Linha l={e.pago} />
                      <Linha l={e.aporte} />
                    </React.Fragment>
                  ))}
                  <Titulo texto={`Pessoa física: ${v.pessoa.nome}`} />
                  {v.pf.rendimentos.map((l) => <Linha key={l.rotulo} l={l} recuo />)}
                  <Linha l={v.pf.totalRendimentos} />
                  <Linha l={v.pf.gastos} />
                  <Linha l={v.pf.saldo} />
                  <Linha l={v.pf.aporteEmpresas} />
                  <Linha l={v.pf.foraOutros} />
                  <Titulo texto="Conferência entre as empresas e o PF" />
                  {v.conferencia.map((l) => <Linha key={l.rotulo} l={l} />)}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Vale só para o que já foi importado e classificado no extrato de cada cadastro. Diferença positiva em "pago − recebido" quer dizer que a empresa pagou mais do que aparece no PF: falta importar ou classificar o extrato pessoal, ou parte foi para outra conta. Pró-labore é encontrado pelo nome da subcategoria; distribuição, retiradas e aportes pelos códigos 9.1, 9.2 e 9.3 do plano das empresas.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default VisaoSocia;
