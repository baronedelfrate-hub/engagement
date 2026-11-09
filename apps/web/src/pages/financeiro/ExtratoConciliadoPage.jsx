import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { AlertTriangle, FileDown, FileSpreadsheet, Loader2, Printer, ScrollText } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { carregarExtratoConciliado, filtrarPorSituacao, resumir, textoLimite, SITUACOES, moeda, fmtData } from '@/lib/extratoConciliado';
import { exportarExtratoExcel, exportarExtratoPdf } from '@/lib/extratoConciliadoExport';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const LIMITE_TELA = 300;

// Extrato do banco já com a classificação do sistema (fornecedor, título, categoria, centro de custo, obra, observação).
const ExtratoConciliadoPage = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [empresa, setEmpresa] = useState('');
  const [bancoId, setBancoId] = useState('TODOS');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [situacao, setSituacao] = useState('TODAS');
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !companyId) return;
    supabase.from('empresas').select('razao_social, nome_fantasia').eq('id', companyId).maybeSingle().then(({ data }) => setEmpresa(data?.nome_fantasia || data?.razao_social || ''));
  }, [authLoading, companyId]);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try { setDados(await carregarExtratoConciliado(companyId, { bancoId, de: de || null, ate: ate || null })); }
    catch (e) { toast({ title: 'Erro ao carregar o extrato', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, bancoId, de, ate, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const linhas = useMemo(() => (dados ? filtrarPorSituacao(dados.linhas, situacao) : []), [dados, situacao]);
  const resumo = useMemo(() => (dados ? resumir(linhas, dados.saldos) : null), [dados, linhas]);
  const filtros = useMemo(() => {
    const b = dados?.banco ? `${dados.banco.nome} ag ${dados.banco.agencia || '-'} cc ${dados.banco.conta || '-'}` : 'Todos os bancos';
    const p = de || ate ? `${de ? fmtData(de) : 'início'} a ${ate ? fmtData(ate) : 'hoje'}` : 'todo o período';
    return `${b} · ${p} · ${SITUACOES.find((s) => s.id === situacao)?.rotulo}`;
  }, [dados, de, ate, situacao]);

  const baixar = async (tipo) => {
    try {
      const args = { empresa, filtros, linhas, resumo, banco: dados.banco };
      if (tipo === 'xlsx') await exportarExtratoExcel(args); else exportarExtratoPdf(args, tipo === 'imprimir' ? { imprimir: true } : {});
    } catch (e) { toast({ title: 'Não foi possível gerar o arquivo', description: e.message, variant: 'destructive' }); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o extrato.</p>;

  const Cartao = ({ t, v, cor = '', sub }) => <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{t}</div><div className={`text-lg font-bold whitespace-nowrap ${cor}`}>{v}</div>{sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}</CardContent></Card>;

  return (
    <>
      <Helmet><title>Extrato Conciliado - Engagement ERP</title></Helmet>
      <PageHeader title="Extrato Conciliado" icon={ScrollText}
        description="O extrato do banco com tudo o que o sistema sabe de cada linha: fornecedor ou cliente, título, nota fiscal, categoria, centro de custo, obra e observação. Pronto para enviar à contabilidade."
        action={<div className="flex gap-2"><Button variant="outline" size="sm" className="gap-1" disabled={!resumo || loading || !linhas.length} onClick={() => baixar('xlsx')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button><Button size="sm" className="gap-1" disabled={!resumo || loading || !linhas.length} onClick={() => baixar('pdf')}><FileDown className="h-4 w-4" /> PDF</Button><Button variant="outline" size="sm" className="gap-1" disabled={!resumo || loading || !linhas.length} onClick={() => baixar('imprimir')}><Printer className="h-4 w-4" /> Imprimir</Button></div>} />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><Label className="text-xs">Banco</Label>
          <select className={`${sel} w-80 block`} value={bancoId} onChange={(e) => setBancoId(e.target.value)}>
            <option value="TODOS">Todos os bancos (sem saldo por linha)</option>
            {(dados?.bancos || []).map((b) => <option key={b.id} value={b.id}>{b.nome}{b.agencia ? ` · ag ${b.agencia}` : ''}{b.conta ? ` · cc ${b.conta}` : ''}</option>)}
          </select></div>
        <div><Label className="text-xs">De</Label><Input type="date" className="h-9 w-40" value={de} onChange={(e) => setDe(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" className="h-9 w-40" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
        <div><Label className="text-xs">Mostrar</Label>
          <select className={`${sel} w-48 block`} value={situacao} onChange={(e) => setSituacao(e.target.value)}>
            {SITUACOES.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
          </select></div>
      </div>

      {loading || !resumo ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <Cartao t="Entradas" v={moeda(resumo.entradas)} cor="text-emerald-600" sub={`${resumo.qtd} lançamentos`} />
            <Cartao t="Saídas" v={moeda(resumo.saidas)} cor="text-red-600" sub={`${resumo.semCategoria} sem categoria · ${resumo.naoConciliadas} não conciliados`} />
            {dados.saldos.length === 1 ? (
              <>
                <Cartao t={resumo.saldoFinal !== null && resumo.saldoFinal < 0 && dados.saldos[0].limite > 0 ? 'Limite em uso (saldo bancário final)' : 'Saldo bancário final'} v={resumo.saldoFinal === null ? '—' : moeda(resumo.saldoFinal)} cor={resumo.saldoFinal < 0 ? 'text-red-600' : ''} sub={[resumo.dataSaldoFinal ? `em ${fmtData(resumo.dataSaldoFinal)}` : '', textoLimite(resumo.saldoFinal, dados.saldos[0].limite)].filter(Boolean).join(' · ')} />
              </>
            ) : (
              <Card className="col-span-2"><CardContent className="p-4 text-xs text-muted-foreground">
                {dados.saldos.length === 0 ? 'Nenhum banco tem saldo inicial cadastrado. Cadastre o saldo inicial no cadastro do banco para ver o saldo bancário.' : 'Escolha um banco para ver o saldo bancário final, ou veja o de todas as contas na tabela abaixo.'}
              </CardContent></Card>
            )}
          </div>
          {dados.saldos.length > 1 && (
            <div className="border rounded-md mb-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left"><tr>{['Saldo bancário por conta', 'Final'].map((h) => <th key={h} className={`px-3 py-2 font-medium ${h !== 'Saldo bancário por conta' ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {dados.saldos.map((b) => (
                    <tr key={b.bancoId} className="border-t">
                      <td className="px-3 py-1.5">{b.nome}{b.agencia ? ` · ag ${b.agencia}` : ''}{b.conta ? ` · cc ${b.conta}` : ''}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">{b.final === null ? '—' : <>{moeda(b.final)} <span className="text-muted-foreground">({fmtData(b.dataFinal)}{b.final < 0 && b.limite > 0 ? ` · ${textoLimite(b.final, b.limite)}` : ''})</span></>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(resumo.semCategoria > 0 || resumo.naoConciliadas > 0) && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{resumo.semCategoria} linha(s) sem categoria e {resumo.naoConciliadas} não conciliada(s). Elas saem destacadas no Excel e no PDF. Classifique antes de enviar à contabilidade.</span>
            </div>
          )}

          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left">
                <tr>{['Data', 'Nº doc.', 'Histórico', 'Fornecedor / cliente', 'Título / NF', 'Categoria', 'Centro / obra', 'Observação', 'Valor', 'Saldo', ''].map((h) => <th key={h} className={`px-2 py-2 font-medium ${h === 'Valor' || h === 'Saldo' ? 'text-right' : ''}`}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {[...linhas].reverse().slice(0, LIMITE_TELA).map((l) => (
                  <tr key={l.id} className="border-t align-top">
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmtData(l.data)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{l.documento}</td>
                    <td className="px-2 py-1.5 min-w-[200px]">{l.historico}</td>
                    <td className="px-2 py-1.5 min-w-[160px]">{l.contraparte || '—'}{l.cpfCnpj && <div className="text-[10px] text-muted-foreground">{l.cpfCnpj}</div>}</td>
                    <td className="px-2 py-1.5 min-w-[140px]">{l.titulo || '—'}{l.parcela && <span className="text-muted-foreground"> · {l.parcela}</span>}{l.notaFiscal && <div className="text-[10px] text-muted-foreground">NF {l.notaFiscal}</div>}</td>
                    <td className="px-2 py-1.5 min-w-[150px]">{l.classificado ? <>{l.codigoCategoria} {l.categoria}{l.subcategoria && <div className="text-[10px] text-muted-foreground">{l.subcategoria}</div>}</> : <Badge variant="destructive" className="text-[10px]">Sem categoria</Badge>}</td>
                    <td className="px-2 py-1.5 min-w-[120px]">{l.centroCusto || ''}{l.obra && <div className="text-[10px] text-muted-foreground">{l.obra}</div>}</td>
                    <td className="px-2 py-1.5 min-w-[160px] text-muted-foreground">{l.observacao}</td>
                    <td className={`px-2 py-1.5 text-right whitespace-nowrap font-medium ${l.valor < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{moeda(l.valor)}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{l.saldo === null ? '' : moeda(l.saldo)}</td>
                    <td className="px-2 py-1.5">{l.conciliado ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Conciliado</Badge> : <Badge variant="outline" className="text-[10px]">Pendente</Badge>}</td>
                  </tr>
                ))}
                {!linhas.length && <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">Nenhum lançamento neste filtro.</td></tr>}
              </tbody>
            </table>
          </div>
          {linhas.length > LIMITE_TELA && <p className="text-xs text-muted-foreground mt-2">Mostrando as {LIMITE_TELA} mais recentes de {linhas.length} linhas. O Excel e o PDF trazem todas, em ordem de data.</p>}
        </>
      )}
    </>
  );
};

export default ExtratoConciliadoPage;
