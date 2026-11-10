import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, ExternalLink, FileText, History, Loader2, MessageCircle, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnviarWhatsAppDialog from '@/components/EnviarWhatsAppDialog';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { statusWhatsApp } from '@/lib/whatsappService';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const MAX_MB = 15;
const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const fmtDataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '');
const paraBase64 = (blob) => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = erro; fr.readAsDataURL(blob); });

const situacaoValidade = (v) => {
  if (!v) return null;
  const dias = Math.ceil((new Date(`${String(v).slice(0, 10)}T00:00:00`) - new Date(new Date().toDateString())) / 86400000);
  if (dias < 0) return { texto: `Vencido em ${fmtData(v)}`, cls: 'bg-red-100 text-red-700 border-red-200' };
  if (dias <= 30) return { texto: `Vence em ${dias} dia(s) · ${fmtData(v)}`, cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { texto: `Válido até ${fmtData(v)}`, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

// modo 'pessoal': documentos de pessoas (só superadmin), agrupados por titular, com histórico de acessos.
// modo 'empresa': documentos da empresa (contrato social, CNDs...), agrupados por tipo.
const GerenciadorDocumentos = ({ modo, tabela, bucket, tipos, companyId, titularesSugeridos = [] }) => {
  const pessoal = modo === 'pessoal';
  const { toast } = useToast();
  const { isSuperAdmin, loading: authLoading } = useAuthContext();
  const [docs, setDocs] = useState([]);
  const [acessos, setAcessos] = useState([]);
  const [verAcessos, setVerAcessos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [envio, setEnvio] = useState(null);
  const [remetentes, setRemetentes] = useState([]);
  const [remetenteId, setRemetenteId] = useState('');
  const [conectado, setConectado] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [movendo, setMovendo] = useState(false);
  const [moverDoc, setMoverDoc] = useState(null);
  const [form, setForm] = useState({ tipo: tipos[0].id, titular: '', titulo: '', validade: '', observacoes: '', arquivo: null });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const rotulo = (id) => tipos.find((t) => t.id === id)?.rotulo || id;

  const carregar = useCallback(async () => {
    setLoading(true);
    let q = supabase.from(tabela).select('*').order('created_at', { ascending: false });
    if (!pessoal) q = q.eq('company_id', companyId);
    const { data, error } = await q;
    if (error) toast({ title: 'Erro ao carregar os documentos', description: error.message, variant: 'destructive' });
    setDocs(data || []);
    if (pessoal) {
      const a = await supabase.from('docs_pessoais_acessos').select('*').order('created_at', { ascending: false }).limit(60);
      setAcessos(a.data || []);
    }
    setLoading(false);
  }, [tabela, pessoal, companyId, toast]);
  useEffect(() => { if (!authLoading && (pessoal || companyId)) carregar(); }, [authLoading, pessoal, companyId, carregar]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase.from('whatsapp_instancias').select('company_id, empresa:empresas(razao_social, nome_fantasia)').then(({ data }) => {
      const lista = (data || []).map((r) => ({ id: r.company_id, nome: r.empresa?.nome_fantasia || r.empresa?.razao_social || 'Empresa' }));
      setRemetentes(lista); setRemetenteId((a) => a || lista[0]?.id || '');
    });
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    if (!remetenteId) { setConectado(false); return; }
    setConectado(null);
    statusWhatsApp(remetenteId).then((s) => setConectado(!!s?.conectado)).catch(() => setConectado(false));
  }, [isSuperAdmin, remetenteId]);

  useEffect(() => {
    if (pessoal) return;
    supabase.rpc('empresas_para_mover').then(({ data }) => setEmpresas(data || []));
  }, [pessoal]);
  const nomeEmp = (e) => e?.nome || 'Empresa';
  // Move documentos quem tem acesso a mais de uma empresa (superadmin ou login do BPO).
  const podeMover = !pessoal && empresas.length > 1;

  // Move o arquivo para a pasta da outra empresa e troca a empresa do registro.
  const moverPara = async (doc, destinoId) => {
    const nome = doc.storage_path.split('/').pop();
    const novo = `${destinoId}/${nome}`;
    const mv = await supabase.storage.from(bucket).move(doc.storage_path, novo);
    if (mv.error) throw mv.error;
    const up = await supabase.rpc('mover_doc_empresa', { p_doc: doc.id, p_destino: destinoId, p_path: novo });
    if (up.error) { await supabase.storage.from(bucket).move(novo, doc.storage_path); throw up.error; }
  };

  // Documentos cujo nome de arquivo traz o CNPJ (completo ou a raiz de 8 dígitos) de OUTRA empresa do sistema.
  const planoDeMovimento = () => {
    const alvo = empresas.filter((e) => String(e.cnpj || '').replace(/\D/g, '').length === 14);
    return docs.map((d) => {
      const dig = String(d.nome_arquivo).replace(/\D/g, '');
      const e = alvo.find((x) => dig.includes(String(x.cnpj).replace(/\D/g, '')) || dig.includes(String(x.cnpj).replace(/\D/g, '').slice(0, 8)));
      return e && e.id !== companyId ? { doc: d, destino: e } : null;
    }).filter(Boolean);
  };
  const moverPorCnpj = async () => {
    const plano = planoDeMovimento();
    if (!plano.length) { toast({ title: 'Nenhum documento de outra empresa encontrado', description: 'Procurei o CNPJ das empresas cadastradas no nome dos arquivos.' }); return; }
    const resumo = plano.map((x) => `• ${x.doc.nome_arquivo} → ${nomeEmp(x.destino)}`).join('\n');
    if (!window.confirm(`Mover ${plano.length} documento(s) para a empresa certa?\n\n${resumo}`)) return;
    setMovendo(true); let ok = 0; const falhas = [];
    for (const x of plano) { try { await moverPara(x.doc, x.destino.id); ok += 1; } catch (e) { falhas.push(`${x.doc.nome_arquivo}: ${e.message}`); } }
    setMovendo(false);
    toast({ title: `${ok} documento(s) movido(s)`, description: falhas.length ? `Falharam ${falhas.length}: ${falhas.join(' | ')}` : undefined, variant: falhas.length ? 'destructive' : undefined });
    carregar();
  };
  const moverUm = async (destinoId) => {
    if (!moverDoc || !destinoId) return;
    setMovendo(true);
    try { await moverPara(moverDoc, destinoId); toast({ title: 'Documento movido' }); setMoverDoc(null); carregar(); }
    catch (e) { toast({ title: 'Não foi possível mover', description: e.message, variant: 'destructive' }); }
    finally { setMovendo(false); }
  };

  const registrar = (doc, acao, destino) => (pessoal
    ? supabase.from('docs_pessoais_acessos').insert({ doc_id: doc.id, titular: doc.titular, nome_arquivo: doc.nome_arquivo, acao, destino: destino || null }).then(() => {})
    : Promise.resolve());

  const enviar = async () => {
    if (!form.arquivo) { toast({ title: 'Escolha o arquivo', variant: 'destructive' }); return; }
    if (pessoal && !form.titular.trim()) { toast({ title: 'Informe de quem é o documento', variant: 'destructive' }); return; }
    if (form.arquivo.size > MAX_MB * 1024 * 1024) { toast({ title: `O arquivo passa de ${MAX_MB} MB`, variant: 'destructive' }); return; }
    setEnviando(true);
    try {
      const nome = form.arquivo.name;
      const pasta = pessoal ? 'docs' : companyId;
      const path = `${pasta}/${crypto.randomUUID()}-${nome.replace(/[^A-Za-z0-9._-]+/g, '_')}`;
      const up = await supabase.storage.from(bucket).upload(path, form.arquivo, { contentType: form.arquivo.type || undefined });
      if (up.error) throw up.error;
      const linha = { tipo: form.tipo, validade: form.validade || null, observacoes: form.observacoes.trim() || null, storage_path: path, nome_arquivo: nome, mime: form.arquivo.type || null, tamanho: form.arquivo.size };
      const ins = await supabase.from(tabela).insert(pessoal ? { ...linha, titular: form.titular.trim() } : { ...linha, company_id: companyId, titulo: form.titulo.trim() || null });
      if (ins.error) { await supabase.storage.from(bucket).remove([path]); throw ins.error; }
      setForm((f) => ({ ...f, titulo: '', validade: '', observacoes: '', arquivo: null }));
      toast({ title: 'Documento guardado' });
      await carregar();
    } catch (e) { toast({ title: 'Não foi possível guardar', description: e.message, variant: 'destructive' }); }
    finally { setEnviando(false); }
  };

  const abrir = async (d) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(d.storage_path, 120);
    if (error) { toast({ title: 'Não foi possível abrir', description: error.message, variant: 'destructive' }); return; }
    await registrar(d, 'abrir');
    window.open(data.signedUrl, '_blank', 'noopener');
    if (pessoal) carregar();
  };

  const excluir = async (d) => {
    if (!window.confirm(`Excluir "${d.nome_arquivo}"? Isso apaga o arquivo e não dá para desfazer.`)) return;
    const r = await supabase.storage.from(bucket).remove([d.storage_path]);
    if (r.error) { toast({ title: 'Não foi possível excluir o arquivo', description: r.error.message, variant: 'destructive' }); return; }
    await registrar(d, 'excluir');
    const { error } = await supabase.from(tabela).delete().eq('id', d.id);
    if (error) { toast({ title: 'Não foi possível excluir', description: error.message, variant: 'destructive' }); return; }
    carregar();
  };

  const grupos = useMemo(() => {
    const m = new Map();
    docs.forEach((d) => { const k = pessoal ? d.titular : rotulo(d.tipo); if (!m.has(k)) m.set(k, []); m.get(k).push(d); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, pessoal]);

  return (
    <>
      <Card className="mb-4"><CardContent className="p-4 grid gap-3 md:grid-cols-4">
        <div><Label>Tipo</Label><select className={`${sel} w-full`} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>{tipos.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}</select></div>
        {pessoal
          ? <div><Label>De quem é *</Label><Input list="titulares-docs" value={form.titular} onChange={(e) => set('titular', e.target.value)} placeholder="Ex.: Andrea Cypriano" /><datalist id="titulares-docs">{[...new Set([...titularesSugeridos, ...docs.map((d) => d.titular)])].map((t) => <option key={t} value={t} />)}</datalist></div>
          : <div><Label>Descrição</Label><Input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: 3ª alteração contratual" /></div>}
        <div><Label>Validade</Label><Input type="date" value={form.validade} onChange={(e) => set('validade', e.target.value)} /></div>
        <div><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} /></div>
        <div className="md:col-span-3">
          <Label>Arquivo (PDF ou imagem, até {MAX_MB} MB)</Label>
          <Input type="file" accept={pessoal ? 'application/pdf,image/*' : 'application/pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt'} key={form.arquivo ? 'com' : 'sem'} onChange={(e) => set('arquivo', e.target.files?.[0] || null)} />
        </div>
        <div className="flex items-end"><Button className="gap-1 w-full" disabled={enviando} onClick={enviar}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Guardar documento</Button></div>
      </CardContent></Card>

      {podeMover && (
        <div className="mb-3">
          <Button variant="outline" size="sm" className="gap-1" disabled={movendo || docs.length === 0} onClick={moverPorCnpj}>{movendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />} Mover para a empresa certa (pelo CNPJ no nome do arquivo)</Button>
        </div>
      )}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Label className="text-xs text-muted-foreground">Enviar pelo WhatsApp de:</Label>
          <select className={sel} value={remetenteId} onChange={(e) => setRemetenteId(e.target.value)}>
            {remetentes.length === 0 && <option value="">Nenhum WhatsApp conectado</option>}
            {remetentes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
          {conectado === null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : conectado ? <span className="text-xs text-emerald-600">● conectado</span> : <span className="text-xs text-red-600">● desconectado — reconecte em Cadastros &gt; WhatsApp (conexão)</span>}
        </div>
      )}

      {loading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        : grupos.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhum documento guardado ainda.</p>
          : grupos.map(([nome, lista]) => (
            <div key={nome} className="mb-4">
              <div className="text-sm font-semibold mb-1.5">{nome} <span className="font-normal text-muted-foreground">({lista.length})</span></div>
              <div className="space-y-1.5">
                {lista.map((d) => {
                  const v = situacaoValidade(d.validade);
                  return (
                    <Card key={d.id}><CardContent className="p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="text-sm truncate"><Badge variant="outline" className="mr-2">{pessoal ? rotulo(d.tipo) : (d.titulo || rotulo(d.tipo))}</Badge>{d.nome_arquivo}</div>
                          <div className="text-[11px] text-muted-foreground truncate">guardado em {fmtData(d.created_at)}{d.observacoes ? ` · ${d.observacoes}` : ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {v && <span className={`text-[11px] px-1.5 py-0.5 rounded border whitespace-nowrap ${v.cls}`}>{v.texto}</span>}
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir (link temporário)" onClick={() => abrir(d)}><ExternalLink className="h-4 w-4" /></Button>
                        {podeMover && <Button variant="ghost" size="icon" className="h-8 w-8" title="Mover para outra empresa" onClick={() => setMoverDoc(d)}><ArrowRightLeft className="h-4 w-4" /></Button>}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Enviar por WhatsApp" onClick={() => setEnvio(d)}><MessageCircle className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Excluir" onClick={() => excluir(d)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent></Card>
                  );
                })}
              </div>
            </div>
          ))}

      {pessoal && (
        <div className="mt-6">
          <button type="button" className="text-sm inline-flex items-center gap-1 text-primary hover:underline" onClick={() => setVerAcessos((v) => !v)}><History className="h-4 w-4" /> {verAcessos ? 'Ocultar' : 'Ver'} histórico de acessos e envios</button>
          {verAcessos && (
            <div className="mt-2 border rounded-md divide-y text-xs">
              {acessos.length === 0 && <p className="p-3 text-muted-foreground">Nada registrado ainda.</p>}
              {acessos.map((a) => <div key={a.id} className="p-2 flex flex-wrap gap-x-3"><span className="text-muted-foreground">{fmtDataHora(a.created_at)}</span><strong>{{ abrir: 'Abriu', enviar: 'Enviou por WhatsApp', excluir: 'Excluiu' }[a.acao] || a.acao}</strong><span>{a.titular} · {a.nome_arquivo}</span>{a.destino && <span className="text-muted-foreground">para {a.destino}</span>}</div>)}
            </div>
          )}
        </div>
      )}

      {moverDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setMoverDoc(null)}>
          <div className="bg-background rounded-lg p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold">Mover "{moverDoc.nome_arquivo}" para:</div>
            <select className={`${sel} w-full`} defaultValue="" onChange={(e) => moverUm(e.target.value)} disabled={movendo}>
              <option value="">Escolha a empresa…</option>
              {empresas.filter((e) => e.id !== companyId).map((e) => <option key={e.id} value={e.id}>{nomeEmp(e)}{e.cnpj ? ` · ${e.cnpj}` : ''}</option>)}
            </select>
            <div className="text-right"><Button variant="outline" size="sm" onClick={() => setMoverDoc(null)}>Cancelar</Button></div>
          </div>
        </div>
      )}

      {envio && (
        <EnviarWhatsAppDialog
          open onOpenChange={(o) => { if (!o) setEnvio(null); }}
          titulo={`Enviar ${rotulo(envio.tipo)}`}
          descricao={pessoal ? `Documento pessoal de ${envio.titular}. Confira o destinatário: depois de enviado, o arquivo fica no celular de quem recebeu. O envio fica registrado.` : undefined}
          tipo="outro" refTipo={pessoal ? 'doc_pessoal' : 'doc_empresa'} refId={envio.id}
          empresaRemetente={isSuperAdmin ? remetenteId : undefined}
          mensagemInicial={pessoal ? `Segue o documento: ${rotulo(envio.tipo)} — ${envio.titular}.` : `Segue o documento: ${envio.titulo || rotulo(envio.tipo)}.`}
          anexos={[{
            rotulo: rotulo(envio.tipo),
            gerar: async () => {
              const { data, error } = await supabase.storage.from(bucket).download(envio.storage_path);
              if (error) throw error;
              return { nome: envio.nome_arquivo, base64: await paraBase64(data), mimetype: envio.mime || (/\.pdf$/i.test(envio.nome_arquivo) ? 'application/pdf' : /\.docx$/i.test(envio.nome_arquivo) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.xlsx$/i.test(envio.nome_arquivo) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'image/jpeg') };
            }
          }]}
          onEnviado={(para) => registrar(envio, 'enviar', para).then(() => pessoal && carregar())}
        />
      )}
    </>
  );
};
export default GerenciadorDocumentos;
