import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowDown, ArrowUp, Loader2, Maximize2, Minimize2, SlidersHorizontal, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { WIDGETS, WIDGET_POR_ID, GRUPOS, layoutPadrao, mesclarLayout } from '@/components/dashboard/widgets';
import DashboardLegado from '@/pages/Dashboard';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

// Tela inicial personalizável: cada usuário escolhe, ordena e dimensiona os blocos; o administrador define o padrão da empresa.
const DashboardHome = () => {
  const { company_id: companyId, user, role, isSuperAdmin, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState(layoutPadrao());
  const [origem, setOrigem] = useState('padrao'); // padrao | empresa | usuario
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const userId = user?.id;
  const ehAdmin = role === 'admin' || isSuperAdmin;

  const carregar = useCallback(async () => {
    if (!companyId || !userId) { setLoading(false); return; }
    try {
      const linhas = ok(await supabase.from('dashboard_layouts').select('id, user_id, widgets').eq('company_id', companyId).or(`user_id.eq.${userId},user_id.is.null`));
      const meu = linhas.find((l) => l.user_id === userId);
      const empresa = linhas.find((l) => !l.user_id);
      if (meu) { setLayout(mesclarLayout(meu.widgets)); setOrigem('usuario'); }
      else if (empresa) { setLayout(mesclarLayout(empresa.widgets)); setOrigem('empresa'); }
      else { setLayout(layoutPadrao()); setOrigem('padrao'); }
    } catch (e) { toast({ title: 'Não foi possível carregar a sua tela inicial', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [companyId, userId, toast]);
  useEffect(() => { if (!authLoading) carregar(); }, [authLoading, carregar]);

  const visiveis = useMemo(() => layout.filter((x) => x.visivel), [layout]);

  const iniciarEdicao = () => { setRascunho(layout.map((x) => ({ ...x }))); setEditando(true); };
  const mover = (idx, delta) => setRascunho((l) => { const n = [...l]; const j = idx + delta; if (j < 0 || j >= n.length) return n; [n[idx], n[j]] = [n[j], n[idx]]; return n; });
  const muda = (id, campos) => setRascunho((l) => l.map((x) => (x.id === id ? { ...x, ...campos } : x)));

  const gravar = async (paraEmpresa) => {
    setSalvando(true);
    try {
      const widgets = rascunho.map((x) => ({ id: x.id, visivel: x.visivel, tamanho: x.tamanho }));
      const alvo = paraEmpresa ? null : userId;
      const q = supabase.from('dashboard_layouts').select('id').eq('company_id', companyId);
      const existente = ok(await (alvo ? q.eq('user_id', alvo) : q.is('user_id', null)).maybeSingle());
      if (existente) ok(await supabase.from('dashboard_layouts').update({ widgets, updated_at: new Date().toISOString() }).eq('id', existente.id));
      else ok(await supabase.from('dashboard_layouts').insert({ company_id: companyId, user_id: alvo, widgets }));
      toast({ title: paraEmpresa ? 'Padrão da empresa salvo' : 'Sua tela inicial foi salva', description: paraEmpresa ? 'Quem ainda não personalizou passa a ver este modelo.' : undefined });
      setEditando(false);
      await carregar();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  const restaurar = async () => {
    if (!window.confirm('Voltar para o modelo da empresa (ou o padrão do sistema)? As suas escolhas serão apagadas.')) return;
    try { await supabase.from('dashboard_layouts').delete().eq('company_id', companyId).eq('user_id', userId); setEditando(false); await carregar(); toast({ title: 'Tela inicial restaurada' }); }
    catch (e) { toast({ title: 'Não foi possível restaurar', description: e.message, variant: 'destructive' }); }
  };

  // superadmin não pertence a uma empresa: mantém a tela inicial de sempre
  if (!authLoading && !companyId) return <DashboardLegado />;
  if (authLoading || loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <>
      <Helmet><title>Início</title></Helmet>
      <PageHeader
        title="Início"
        description={origem === 'usuario' ? 'Sua tela inicial personalizada.' : origem === 'empresa' ? 'Modelo definido pela empresa. Personalize como preferir.' : 'Modelo padrão. Use "Personalizar" para escolher o que aparece.'}
        action={!editando && <Button variant="outline" size="sm" onClick={iniciarEdicao}><SlidersHorizontal className="w-4 h-4 mr-2" /> Personalizar</Button>}
      />

      {editando && (
        <Card className="mb-6 border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Personalizar a tela inicial</CardTitle>
            <CardDescription>Marque os blocos que quer ver, mude a ordem com as setas e escolha se ocupam meia largura ou a largura inteira.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(GRUPOS).map(([g, rotulo]) => (
              <div key={g}>
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-1">{rotulo}</div>
                <div className="divide-y divide-border rounded-md border border-border">
                  {rascunho.map((x, idx) => ({ x, idx })).filter(({ x }) => WIDGET_POR_ID[x.id].grupo === g).map(({ x, idx }) => (
                    <div key={x.id} className="p-2.5 flex items-center gap-3 text-sm">
                      <Checkbox checked={x.visivel} onCheckedChange={(v) => muda(x.id, { visivel: v === true })} />
                      <div className="flex-1 min-w-0"><div className="font-medium">{WIDGET_POR_ID[x.id].titulo}</div><div className="text-xs text-muted-foreground">{WIDGET_POR_ID[x.id].descricao}</div></div>
                      <button type="button" title={x.tamanho === 'g' ? 'Largura inteira' : 'Meia largura'} className="p-1.5 rounded hover:bg-muted" onClick={() => muda(x.id, { tamanho: x.tamanho === 'g' ? 'm' : 'g' })}>{x.tamanho === 'g' ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</button>
                      <button type="button" title="Subir" className="p-1.5 rounded hover:bg-muted" onClick={() => mover(idx, -1)}><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" title="Descer" className="p-1.5 rounded hover:bg-muted" onClick={() => mover(idx, 1)}><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button onClick={() => gravar(false)} disabled={salvando}>{salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}Salvar para mim</Button>
              {ehAdmin && <Button variant="outline" onClick={() => gravar(true)} disabled={salvando}>Salvar como padrão da empresa</Button>}
              <Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
              {origem === 'usuario' && <Button variant="ghost" className="ml-auto text-muted-foreground" onClick={restaurar}>Restaurar modelo</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {visiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Nenhum bloco ativo. Clique em "Personalizar" e escolha o que mostrar.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visiveis.map((x) => {
            const W = WIDGET_POR_ID[x.id];
            return <div key={x.id} className={x.tamanho === 'g' ? 'lg:col-span-2' : ''}><W.Componente /></div>;
          })}
        </div>
      )}
    </>
  );
};

export default DashboardHome;
