import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { carregarConfig, salvarConfig } from '@/lib/crmService';

const C = ({ rotulo, children, className = '' }) => <div className={className}><Label className="text-xs">{rotulo}</Label>{children}</div>;

// Textos fixos das propostas (páginas "Quem somos" e "Valores") e dados de assinatura. Valem para todas as propostas da empresa.
const CRMConfig = () => {
  const { company_id: companyId, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [i, setI] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (authLoading || !companyId) return;
    carregarConfig(companyId).then((c) => setI({ camadas: [], valores: [], assinatura: {}, ...c })).catch((e) => toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' }));
  }, [authLoading, companyId, toast]);

  const salvar = async () => {
    setSalvando(true);
    try { await salvarConfig(companyId, i); toast({ title: 'Textos salvos' }); }
    catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setSalvando(false); }
  };

  if (authLoading || (companyId && !i)) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver o CRM dela.</p>;
  const m = (k, v) => setI((x) => ({ ...x, [k]: v }));

  return (
    <>
      <Helmet><title>Textos da proposta | CRM</title></Helmet>
      <PageHeader
        title="Textos da proposta"
        description="Páginas fixas que aparecem em todas as propostas: quem somos, missão, visão, valores e assinatura."
        action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => navigate('/crm/propostas')}><ArrowLeft className="w-4 h-4 mr-2" /> Propostas</Button><Button size="sm" onClick={salvar} disabled={salvando}>{salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Salvar</Button></div>}
      />
      <div className="space-y-4 max-w-4xl">
        <Card><CardHeader><CardTitle className="text-base">Marca</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <C rotulo="Nome da marca (capa)"><Input value={i.marca || ''} onChange={(e) => m('marca', e.target.value)} /></C>
          <C rotulo="Metodologia / linha (capa)"><Input value={i.metodologia || ''} onChange={(e) => m('metodologia', e.target.value)} /></C>
          <C rotulo="Cidade (data da capa)"><Input value={i.cidade || ''} onChange={(e) => m('cidade', e.target.value)} /></C>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Quem somos</CardTitle></CardHeader><CardContent className="space-y-3">
          <C rotulo="Título da página"><Input value={i.quem_somos_titulo || ''} onChange={(e) => m('quem_somos_titulo', e.target.value)} /></C>
          <C rotulo="Texto"><Textarea rows={3} value={i.quem_somos || ''} onChange={(e) => m('quem_somos', e.target.value)} /></C>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <C rotulo="Frase das camadas"><Input value={i.camadas_titulo || ''} onChange={(e) => m('camadas_titulo', e.target.value)} /></C>
            <C rotulo="Camadas (separadas por vírgula)"><Input value={(i.camadas || []).join(', ')} onChange={(e) => m('camadas', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></C>
          </div>
          <C rotulo="Frase de resultado"><Input value={i.resultado || ''} onChange={(e) => m('resultado', e.target.value)} /></C>
          <C rotulo="Missão"><Textarea rows={3} value={i.missao || ''} onChange={(e) => m('missao', e.target.value)} /></C>
          <C rotulo="Visão"><Textarea rows={3} value={i.visao || ''} onChange={(e) => m('visao', e.target.value)} /></C>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Valores</CardTitle></CardHeader><CardContent className="space-y-2">
          {(i.valores || []).map((v, k) => (
            <div key={k} className="grid grid-cols-[200px_1fr_32px] gap-2">
              <Input value={v.titulo} placeholder="Valor" onChange={(e) => m('valores', i.valores.map((x, n) => (n === k ? { ...x, titulo: e.target.value } : x)))} />
              <Input value={v.texto} placeholder="Descrição" onChange={(e) => m('valores', i.valores.map((x, n) => (n === k ? { ...x, texto: e.target.value } : x)))} />
              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => m('valores', i.valores.filter((_, n) => n !== k))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => m('valores', [...(i.valores || []), { titulo: '', texto: '' }])}><Plus className="w-4 h-4 mr-1" /> Valor</Button>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Assinatura (última página)</CardTitle><CardDescription>Aparece no rodapé da página de próximos passos.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <C rotulo="Nome"><Input value={i.assinatura?.nome || ''} onChange={(e) => m('assinatura', { ...i.assinatura, nome: e.target.value })} /></C>
          <C rotulo="Cargo"><Input value={i.assinatura?.cargo || ''} onChange={(e) => m('assinatura', { ...i.assinatura, cargo: e.target.value })} /></C>
          <C rotulo="Site"><Input value={i.assinatura?.site || ''} onChange={(e) => m('assinatura', { ...i.assinatura, site: e.target.value })} /></C>
        </CardContent></Card>
      </div>
    </>
  );
};

export default CRMConfig;
