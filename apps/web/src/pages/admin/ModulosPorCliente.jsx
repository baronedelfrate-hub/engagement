import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, AlertCircle, Save, Lock } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { MODULOS, CHAVES_MODULOS, PACOTES } from '@/lib/modulos';

// Tela do superadmin: escolhe, por empresa, quais módulos ela usa.
const ModulosPorCliente = () => {
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState(null);
  const [marcados, setMarcados] = useState(new Set(CHAVES_MODULOS));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('empresas').select('id, razao_social, nome_fantasia, modulos_ativos').order('razao_social');
    if (e) setError(e.message?.includes('modulos_ativos') ? 'A coluna de módulos ainda não existe no banco. Aplique a migração primeiro.' : e.message);
    else { setEmpresas(data || []); setEmpresaId((atual) => atual || data?.[0]?.id || null); }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const empresa = empresas.find((e) => e.id === empresaId);
  useEffect(() => {
    if (!empresa) return;
    setMarcados(new Set(empresa.modulos_ativos ?? CHAVES_MODULOS));
  }, [empresaId, empresas]);

  const alternar = (chave) => setMarcados((s) => { const n = new Set(s); n.has(chave) ? n.delete(chave) : n.add(chave); return n; });
  const aplicarPacote = (modulos) => setMarcados(new Set([...modulos, 'cadastros']));

  const salvar = async () => {
    setSaving(true);
    try {
      const lista = CHAVES_MODULOS.filter((c) => marcados.has(c) || c === 'cadastros');
      // todos marcados = sem restrição (nulo): módulos criados no futuro entram sozinhos
      const valor = lista.length === CHAVES_MODULOS.length ? null : lista;
      const { error: e } = await supabase.from('empresas').update({ modulos_ativos: valor }).eq('id', empresaId);
      if (e) throw e;
      toast({ title: 'Módulos salvos', description: 'Vale na próxima vez que os usuários dessa empresa entrarem ou atualizarem a página.' });
      await carregar();
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resumo = useMemo(() => Object.fromEntries(empresas.map((e) => [e.id, e.modulos_ativos == null ? 'Todos' : `${e.modulos_ativos.length} de ${CHAVES_MODULOS.length}`])), [empresas]);
  const grupos = ['Gestão', 'Operação'];
  const alterado = empresa && JSON.stringify([...(empresa.modulos_ativos ?? CHAVES_MODULOS)].sort()) !== JSON.stringify([...marcados].sort());

  return (
    <>
      <Helmet><title>Módulos por Cliente - ERP Platform</title></Helmet>
      <PageHeader title="Módulos por Cliente" description="Escolha quais módulos cada empresa usa. Os módulos desligados somem do menu e as telas ficam bloqueadas." />

      {error ? (
        <Card className="border-destructive bg-destructive/10"><CardHeader className="text-center"><AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" /><CardTitle className="text-destructive">Falha ao carregar</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>
      ) : loading && !empresas.length ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Empresas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {empresas.map((e) => (
                <button key={e.id} type="button" onClick={() => setEmpresaId(e.id)}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${e.id === empresaId ? 'border-blue-500 bg-blue-500/10' : 'border-border hover:bg-muted/50'}`}>
                  <div className="font-medium">{e.nome_fantasia || e.razao_social}</div>
                  <div className="text-xs text-muted-foreground flex justify-between"><span>{e.razao_social}</span><Badge variant="outline">{resumo[e.id]}</Badge></div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{empresa ? (empresa.nome_fantasia || empresa.razao_social) : 'Selecione uma empresa'}</CardTitle>
              <CardDescription>Marque o que a empresa contratou. Cadastros é o núcleo e fica sempre ligado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {PACOTES.map((p) => <Button key={p.nome} variant="outline" size="sm" onClick={() => aplicarPacote(p.modulos)}>{p.nome}</Button>)}
              </div>

              {grupos.map((g) => (
                <div key={g}>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{g}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MODULOS.filter((m) => m.grupo === g).map((m) => (
                      <label key={m.chave} className={`flex items-center gap-3 rounded-md border border-border p-3 ${m.fixo ? 'opacity-70' : 'cursor-pointer hover:bg-muted/40'}`}>
                        <Checkbox checked={m.fixo || marcados.has(m.chave)} disabled={m.fixo} onCheckedChange={() => !m.fixo && alternar(m.chave)} />
                        <span className="flex-1">{m.nome}</span>
                        {m.fixo && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">{marcados.size} de {CHAVES_MODULOS.length} módulos ligados</span>
                <Button onClick={salvar} disabled={!empresa || saving || !alterado} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar módulos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default ModulosPorCliente;
