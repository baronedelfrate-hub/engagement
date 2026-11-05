import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, FileDown, FileSpreadsheet, Loader2, Paperclip, Plus, Printer, Receipt, Save, Trash2, ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PreviaPdfDialog from '@/components/PreviaPdfDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { moeda, fmtData } from '@/lib/extratoConciliado';
import { TIPOS_PIX, limparChavePix } from '@/lib/chavePix';
import { gerarReembolsoPdf, gerarReembolsoExcel, totalItens } from '@/lib/reembolsoExport';

const BUCKET = 'movimentacao-docs';
const STATUS = [['rascunho', 'Rascunho'], ['enviado', 'Enviado'], ['aprovado', 'Aprovado'], ['pago', 'Pago'], ['recusado', 'Recusado']];
const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const novoItem = () => ({ id: crypto.randomUUID(), data: new Date().toISOString().slice(0, 10), descricao: '', categoria: '', valor: '', comprovante_path: null, comprovante_nome: null });
const ehImagem = (nome) => /\.(jpe?g|png)$/i.test(nome || '');

const ReembolsosPage = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [empresa, setEmpresa] = useState('');
  const [lista, setLista] = useState([]);
  const [totais, setTotais] = useState({});
  const [loading, setLoading] = useState(true);
  const [r, setR] = useState(null);
  const [itens, setItens] = useState([]);
  const [removidos, setRemovidos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [previa, setPrevia] = useState(null);

  useEffect(() => {
    if (authLoading || !companyId) return;
    supabase.from('empresas').select('razao_social, nome_fantasia').eq('id', companyId).maybeSingle().then(({ data }) => setEmpresa(data?.nome_fantasia || data?.razao_social || ''));
  }, [authLoading, companyId]);

  const carregar = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from('reembolsos').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('reembolso_itens').select('reembolso_id, valor').eq('company_id', companyId)
    ]);
    if (a.error) toast({ title: 'Erro ao carregar', description: a.error.message, variant: 'destructive' });
    setLista(a.data || []);
    const t = {}; (b.data || []).forEach((i) => { t[i.reembolso_id] = (t[i.reembolso_id] || 0) + Number(i.valor || 0); });
    setTotais(t); setLoading(false);
  }, [companyId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const novo = () => { setR({ id: crypto.randomUUID(), novo: true, beneficiario: '', cpf_cnpj: '', tipo_chave_pix: 'cnpj', chave_pix: '', referencia: '', aprovador: '', observacoes: '', status: 'rascunho' }); setItens([novoItem()]); setRemovidos([]); };
  const abrir = async (x) => {
    const { data, error } = await supabase.from('reembolso_itens').select('*').eq('reembolso_id', x.id).order('ordem');
    if (error) { toast({ title: 'Erro ao abrir', description: error.message, variant: 'destructive' }); return; }
    setR({ ...x }); setItens((data || []).map((i) => ({ ...i, valor: String(i.valor ?? '') }))); setRemovidos([]);
  };
  const set = (k, v) => setR((p) => ({ ...p, [k]: v }));
  const setItem = (id, k, v) => setItens((p) => p.map((i) => (i.id === id ? { ...i, [k]: v } : i)));
  const itensNum = useMemo(() => itens.map((i) => ({ ...i, valor: Number(String(i.valor).replace(',', '.')) || 0 })), [itens]);

  const salvar = async () => {
    if (!r.beneficiario.trim()) { toast({ title: 'Informe o beneficiário', variant: 'destructive' }); return false; }
    if (itensNum.some((i) => !i.descricao.trim())) { toast({ title: 'Toda despesa precisa de uma descrição', variant: 'destructive' }); return false; }
    setSalvando(true);
    try {
      const { novo: _n, numero, created_at, created_by, updated_at, ...campos } = r;
      const { data, error } = await supabase.from('reembolsos').upsert({ ...campos, company_id: companyId, updated_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      if (removidos.length) { const e1 = await supabase.from('reembolso_itens').delete().in('id', removidos); if (e1.error) throw e1.error; }
      const linhas = itensNum.map((i, n) => ({ id: i.id, company_id: companyId, reembolso_id: data.id, data: i.data || null, descricao: i.descricao.trim(), categoria: i.categoria || null, valor: i.valor, comprovante_path: i.comprovante_path, comprovante_nome: i.comprovante_nome, ordem: n }));
      if (linhas.length) { const e2 = await supabase.from('reembolso_itens').upsert(linhas); if (e2.error) throw e2.error; }
      setR({ ...data }); setRemovidos([]); await carregar();
      toast({ title: 'Reembolso salvo' });
      return data;
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); return false; }
    finally { setSalvando(false); }
  };

  const anexar = async (item, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'Arquivo acima de 10 MB', variant: 'destructive' }); return; }
    setOcupado(`up-${item.id}`);
    try {
      const path = `${companyId}/reembolsos/${r.id}/${item.id}-${file.name.replace(/[^A-Za-z0-9._-]+/g, '_')}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setItens((p) => p.map((i) => (i.id === item.id ? { ...i, comprovante_path: path, comprovante_nome: file.name } : i)));
      toast({ title: 'Comprovante anexado', description: 'Lembre de salvar o reembolso.' });
    } catch (e) { toast({ title: 'Não foi possível anexar', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(''); }
  };
  const abrirComprovante = async (item) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(item.comprovante_path, 300);
    if (error) { toast({ title: 'Não foi possível abrir', description: error.message, variant: 'destructive' }); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const imagensDoPdf = async () => {
    const m = {};
    for (const i of itensNum) {
      if (i.comprovante_path && ehImagem(i.comprovante_nome)) {
        const { data } = await supabase.storage.from(BUCKET).download(i.comprovante_path);
        if (data) m[i.id] = data;
      }
    }
    return m;
  };
  const gerar = async (modo, base) => {
    setOcupado(modo);
    try {
      const args = { empresa, reembolso: base, itens: itensNum, imagens: await imagensDoPdf() };
      if (modo === 'excel') await gerarReembolsoExcel(args);
      else if (modo === 'previa') setPrevia(await gerarReembolsoPdf(args, { base64: true }));
      else if (modo === 'imprimir') await gerarReembolsoPdf(args, { imprimir: true });
      else await gerarReembolsoPdf(args);
    } catch (e) { toast({ title: 'Não foi possível gerar', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(''); }
  };
  // O número do relatório só existe depois de salvar; salva antes de gerar o PDF.
  const gerarSalvando = async (modo) => { const salvo = await salvar(); if (salvo) await gerar(modo, salvo); };

  const excluir = async () => {
    if (r.novo) { setR(null); return; }
    if (!window.confirm('Excluir este reembolso e todas as suas despesas?')) return;
    const { error } = await supabase.from('reembolsos').delete().eq('id', r.id);
    if (error) { toast({ title: 'Não foi possível excluir', description: error.message, variant: 'destructive' }); return; }
    setR(null); carregar();
  };

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para usar os reembolsos.</p>;

  if (!r) {
    return (
      <>
        <Helmet><title>Reembolsos - Engagement ERP</title></Helmet>
        <PageHeader title="Relatório de Reembolso" icon={Receipt} description="Reúna as despesas de quem vai ser reembolsado, com os comprovantes, em um único relatório para aprovar e pagar."
          action={<Button size="sm" className="gap-1" onClick={novo}><Plus className="h-4 w-4" /> Novo reembolso</Button>} />
        {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Nenhum reembolso ainda. Clique em "Novo reembolso".</p>
        ) : (
          <div className="space-y-2">
            {lista.map((x) => (
              <Card key={x.id} className="cursor-pointer hover:bg-muted/40" onClick={() => abrir(x)}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#{String(x.numero).padStart(3, '0')} · {x.beneficiario}</div>
                    <div className="text-xs text-muted-foreground truncate">{x.referencia || 'Sem referência'} · criado em {fmtData(x.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0"><Badge variant="outline">{STATUS.find((s) => s[0] === x.status)?.[1]}</Badge><span className="font-semibold whitespace-nowrap">{moeda(totais[x.id] || 0)}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>
    );
  }

  const bloqueado = !!ocupado || salvando;
  return (
    <>
      <Helmet><title>Reembolso - Engagement ERP</title></Helmet>
      <PageHeader title={r.novo ? 'Novo reembolso' : `Reembolso #${String(r.numero).padStart(3, '0')}`} icon={Receipt}
        action={<Button variant="outline" size="sm" className="gap-1" onClick={() => { setR(null); carregar(); }}><ArrowLeft className="h-4 w-4" /> Voltar</Button>} />
      <Card className="mb-4"><CardContent className="p-4 grid gap-3 md:grid-cols-3">
        <div><Label>Beneficiário *</Label><Input value={r.beneficiario} onChange={(e) => set('beneficiario', e.target.value)} placeholder="Nome de quem será reembolsado" /></div>
        <div><Label>CPF / CNPJ</Label><Input value={r.cpf_cnpj || ''} onChange={(e) => set('cpf_cnpj', e.target.value)} /></div>
        <div><Label>Referência</Label><Input value={r.referencia || ''} onChange={(e) => set('referencia', e.target.value)} placeholder="Ex.: Transporte e alimentação — outubro/2026" /></div>
        <div><Label>Tipo da chave Pix</Label><select className={`${sel} w-full`} value={r.tipo_chave_pix || ''} onChange={(e) => setR((p) => ({ ...p, tipo_chave_pix: e.target.value, chave_pix: limparChavePix(e.target.value, p.chave_pix) }))}>{TIPOS_PIX.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}</select></div>
        <div><Label>Chave Pix</Label><Input value={r.chave_pix || ''} onChange={(e) => setR((p) => ({ ...p, chave_pix: limparChavePix(p.tipo_chave_pix, e.target.value) }))} /></div>
        <div><Label>Quem aprova</Label><Input value={r.aprovador || ''} onChange={(e) => set('aprovador', e.target.value)} placeholder="Ex.: Andréia" /></div>
        <div><Label>Situação</Label><select className={`${sel} w-full`} value={r.status} onChange={(e) => set('status', e.target.value)}>{STATUS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div className="md:col-span-2"><Label>Observações</Label><Input value={r.observacoes || ''} onChange={(e) => set('observacoes', e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-2">
        <div className="hidden md:grid grid-cols-[120px_1fr_170px_110px_150px_36px] gap-2 text-xs text-muted-foreground px-1"><span>Data</span><span>Descrição</span><span>Categoria</span><span>Valor (R$)</span><span>Comprovante</span><span /></div>
        {itens.map((i) => (
          <div key={i.id} className="grid gap-2 md:grid-cols-[120px_1fr_170px_110px_150px_36px] items-center">
            <Input type="date" value={i.data || ''} onChange={(e) => setItem(i.id, 'data', e.target.value)} />
            <Input value={i.descricao} onChange={(e) => setItem(i.id, 'descricao', e.target.value)} placeholder="Ex.: Uber — gravação Damas do Sertanejo" />
            <Input value={i.categoria || ''} onChange={(e) => setItem(i.id, 'categoria', e.target.value)} placeholder="Transporte, alimentação…" />
            <Input inputMode="decimal" value={i.valor} onChange={(e) => setItem(i.id, 'valor', e.target.value)} placeholder="0,00" />
            <div className="flex items-center gap-1 text-xs min-w-0">
              {i.comprovante_nome ? <button type="button" className="truncate text-blue-600 hover:underline" title={i.comprovante_nome} onClick={() => abrirComprovante(i)}>{i.comprovante_nome}</button> : null}
              <label className="cursor-pointer inline-flex items-center text-primary shrink-0" title="Anexar comprovante (PDF ou imagem)">
                {ocupado === `up-${i.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { anexar(i, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setItens((p) => p.filter((x) => x.id !== i.id)); setRemovidos((p) => [...p, i.id]); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setItens((p) => [...p, novoItem()])}><Plus className="h-4 w-4" /> Adicionar despesa</Button>
          <div className="text-lg font-bold">Total: {moeda(totalItens(itensNum))}</div>
        </div>
      </CardContent></Card>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button className="gap-1" disabled={bloqueado} onClick={salvar}>{salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</Button>
        <Button variant="outline" className="gap-1" disabled={bloqueado} onClick={() => gerarSalvando('previa')}>{ocupado === 'previa' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Visualizar PDF</Button>
        <Button variant="outline" className="gap-1" disabled={bloqueado} onClick={() => gerarSalvando('pdf')}><FileDown className="h-4 w-4" /> Baixar PDF</Button>
        <Button variant="outline" className="gap-1" disabled={bloqueado} onClick={() => gerarSalvando('imprimir')}><Printer className="h-4 w-4" /> Imprimir</Button>
        <Button variant="outline" className="gap-1" disabled={bloqueado} onClick={() => gerarSalvando('excel')}><FileSpreadsheet className="h-4 w-4" /> Excel (modelo)</Button>
        <Button variant="ghost" className="gap-1 text-destructive ml-auto" disabled={bloqueado} onClick={excluir}><Trash2 className="h-4 w-4" /> Excluir</Button>
      </div>
      <PreviaPdfDialog open={!!previa} onOpenChange={(o) => { if (!o) setPrevia(null); }} titulo="Prévia do relatório de reembolso" nome={previa?.nome} base64={previa?.base64} />
    </>
  );
};
export default ReembolsosPage;
