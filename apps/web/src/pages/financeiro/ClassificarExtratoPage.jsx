import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Tags } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { carregarCatalogo, listarExtrato, classificarLinhas } from '@/services/extratoAsaasService';
import { formatDateOnly } from '@/lib/dateUtils';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const LIMITE_TELA = 500;

const ClassificarExtratoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company_id, user } = useAuthContext();
  const dropdowns = useFinanceiroDropdowns();

  const [catalogo, setCatalogo] = useState({ categorias: [], subcategorias: [], centros: [], regras: [], clientes: [] });
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bancoId, setBancoId] = useState('TODOS');
  const [status, setStatus] = useState('pendentes');
  const [busca, setBusca] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [sel, setSel] = useState(new Set());
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    if (!company_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cat, ext] = await Promise.all([carregarCatalogo(company_id), listarExtrato({ companyId: company_id, bancoId, de, ate })]);
      setCatalogo(cat);
      setLinhas(ext);
      setSel(new Set());
    } catch (e) {
      toast({ title: 'Erro', description: e.message || 'Não foi possível carregar o extrato.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [company_id, bancoId, de, ate]);

  const mapas = useMemo(() => ({
    cat: new Map(catalogo.categorias.map((c) => [c.id, c])),
    sub: new Map(catalogo.subcategorias.map((s) => [s.id, s])),
    cc: new Map(catalogo.centros.map((c) => [c.id, c]))
  }), [catalogo]);

  const classificada = (l) => !!l.categoria_id;
  const totais = useMemo(() => ({
    total: linhas.length,
    pend: linhas.filter((l) => !classificada(l)).length
  }), [linhas]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (status === 'pendentes' && classificada(l)) return false;
      if (status === 'classificadas' && !classificada(l)) return false;
      if (!t) return true;
      return `${l.descricao} ${l.tipo_transacao} ${l.cliente_nome || ''}`.toLowerCase().includes(t);
    });
  }, [linhas, status, busca]);

  const visiveis = filtradas.slice(0, LIMITE_TELA);
  const selecionadas = linhas.filter((l) => sel.has(l.id));
  const mesmoTipo = selecionadas.length > 0 && selecionadas.every((l) => l.tipo_norm && l.tipo_norm === selecionadas[0].tipo_norm);
  const mesmoFavorecido = mesmoTipo && selecionadas.every((l) => l.assinatura && l.assinatura === selecionadas[0].assinatura);

  const alternar = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todasVisiveisMarcadas = visiveis.length > 0 && visiveis.every((l) => sel.has(l.id));
  const alternarTodas = () => setSel(todasVisiveisMarcadas ? new Set() : new Set(visiveis.map((l) => l.id)));

  const abrirDialogo = (linhasAlvo) => {
    setSel(new Set(linhasAlvo.map((l) => l.id)));
    const u = linhasAlvo.length === 1 ? linhasAlvo[0] : null;
    setForm({
      categoria_id: u?.categoria_id || 'none',
      subcategoria_id: u?.subcategoria_id || 'none',
      centro_custo_id: u?.centro_custo_id || 'none',
      cliente_nome: u?.cliente_nome || '',
      escopo: 'linhas',
      aplicarSemelhantes: true
    });
    setDialog(true);
  };

  const subsDaCategoria = catalogo.subcategorias.filter((s) => form.categoria_id !== 'none' && s.categoria_id === form.categoria_id);
  const orNull = (v) => (v === 'none' ? null : v);

  const salvar = async () => {
    if (form.categoria_id === 'none') return toast({ title: 'Atenção', description: 'Escolha a categoria.', variant: 'destructive' });
    setSaving(true);
    try {
      const alvo = selecionadas;
      const { semelhantes } = await classificarLinhas({
        companyId: company_id,
        linhas: alvo,
        classificacao: {
          categoria_id: orNull(form.categoria_id),
          subcategoria_id: orNull(form.subcategoria_id),
          centro_custo_id: orNull(form.centro_custo_id),
          cliente_nome: form.cliente_nome
        },
        escopo: form.escopo,
        aplicarSemelhantes: form.aplicarSemelhantes,
        userId: user?.id
      });
      toast({
        title: 'Classificado',
        description: `${alvo.length} lançamento(s)${semelhantes ? ` + ${semelhantes} semelhantes` : ''}${form.escopo !== 'linhas' ? '. Regra salva: as próximas importações já virão classificadas.' : '.'}`
      });
      setDialog(false);
      carregar();
    } catch (e) {
      toast({ title: 'Erro ao classificar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!company_id) {
    return <p className="text-muted-foreground p-6">Seu usuário não está ligado a uma empresa. Entre com o usuário da empresa para classificar o extrato.</p>;
  }

  return (
    <div className="space-y-5 pb-12">
      <Helmet><title>Classificar Extrato</title></Helmet>
      <PageHeader
        title="Classificar Extrato"
        description="Defina categoria, subcategoria, centro de custo e cliente. Ao criar uma regra, as próximas importações já vêm classificadas."
        actions={<Button variant="outline" onClick={() => navigate('/financeiro/importar-extrato')}><Upload className="mr-2 h-4 w-4" /> Importar extrato</Button>}
      />

      <div className="flex flex-wrap gap-3 items-end">
        <Input className="w-64 bg-background" placeholder="Buscar descrição, tipo ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={bancoId} onValueChange={setBancoId}>
          <SelectTrigger className="w-48 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os bancos</SelectItem>
            {dropdowns.bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendentes">A classificar</SelectItem>
            <SelectItem value="classificadas">Classificadas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-40 bg-background" value={de} onChange={(e) => setDe(e.target.value)} title="Data inicial" />
        <Input type="date" className="w-40 bg-background" value={ate} onChange={(e) => setAte(e.target.value)} title="Data final" />
        <Button disabled={sel.size === 0} onClick={() => abrirDialogo(selecionadas)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Tags className="mr-2 h-4 w-4" /> Classificar selecionadas ({sel.size})
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {totais.total} lançamentos · <span className="text-amber-600 font-medium">{totais.pend} a classificar</span> · {totais.total - totais.pend} classificados
      </p>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[640px]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 w-10"><Checkbox checked={todasVisiveisMarcadas} onCheckedChange={alternarTodas} /></th>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Descrição</th>
                <th className="p-2 text-left">Classificação</th>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-right">Valor</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="7" className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : visiveis.length === 0 ? (
                <tr><td colSpan="7" className="p-10 text-center text-muted-foreground">Nada para mostrar com esses filtros.</td></tr>
              ) : visiveis.map((l) => {
                const cat = mapas.cat.get(l.categoria_id);
                const sub = mapas.sub.get(l.subcategoria_id);
                return (
                  <tr key={l.id} className="hover:bg-muted/30">
                    <td className="p-2"><Checkbox checked={sel.has(l.id)} onCheckedChange={() => alternar(l.id)} /></td>
                    <td className="p-2 whitespace-nowrap">{formatDateOnly(l.data_transacao)}</td>
                    <td className="p-2"><div className="truncate max-w-[360px]" title={l.descricao}>{l.descricao}</div><div className="text-xs text-muted-foreground">{l.tipo_transacao}</div></td>
                    <td className="p-2 text-xs">
                      {cat ? (
                        <div>
                          <div>{cat.codigo} {cat.nome}</div>
                          <div className="text-muted-foreground">{sub ? `${sub.codigo} ${sub.nome}` : 'sem subcategoria'}{l.classificacao_origem === 'regra' ? ' · regra' : ''}</div>
                        </div>
                      ) : <Badge variant="outline" className="border-amber-500/40 text-amber-600">a classificar</Badge>}
                    </td>
                    <td className="p-2 text-xs">{l.cliente_nome || '—'}</td>
                    <td className={`p-2 text-right font-medium whitespace-nowrap ${l.valor < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{brl(l.valor)}</td>
                    <td className="p-2 text-right"><Button size="sm" variant="outline" onClick={() => abrirDialogo([l])}>Classificar</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {filtradas.length > LIMITE_TELA && <p className="text-xs text-muted-foreground">Mostrando {LIMITE_TELA} de {filtradas.length}. Use os filtros para ver o restante.</p>}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Classificar {selecionadas.length} lançamento{selecionadas.length === 1 ? '' : 's'}</DialogTitle>
            <DialogDescription>{selecionadas.length === 1 ? selecionadas[0]?.descricao : 'Os campos abaixo serão aplicados a todos os selecionados.'}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Categoria *</Label>
              <Select value={form.categoria_id} onValueChange={(v) => setForm((f) => ({ ...f, categoria_id: v, subcategoria_id: 'none' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {catalogo.categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Subcategoria (conta)</Label>
              <Select value={form.subcategoria_id} onValueChange={(v) => setForm((f) => ({ ...f, subcategoria_id: v }))} disabled={form.categoria_id === 'none' || subsDaCategoria.length === 0}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{subsDaCategoria.length === 0 && form.categoria_id !== 'none' ? 'Esta categoria não tem subcategorias' : 'Nenhuma'}</SelectItem>
                  {subsDaCategoria.map((s) => <SelectItem key={s.id} value={s.id}>{s.codigo} {s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Centro de custo</Label>
              <Select value={form.centro_custo_id} onValueChange={(v) => setForm((f) => ({ ...f, centro_custo_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {catalogo.centros.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input list="clientes-extrato" value={form.cliente_nome || ''} onChange={(e) => setForm((f) => ({ ...f, cliente_nome: e.target.value }))} placeholder="Nome do cliente" />
              <datalist id="clientes-extrato">{catalogo.clientes.map((n) => <option key={n} value={n} />)}</datalist>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <Label>Lembrar esta classificação (regra)</Label>
            {[
              ['linhas', 'Só estes lançamentos', true],
              ['favorecido', 'Todo lançamento com a mesma descrição / favorecido', mesmoFavorecido],
              ['tipo', `Todo lançamento do tipo "${selecionadas[0]?.tipo_transacao || ''}"`, mesmoTipo]
            ].map(([valor, rotulo, habilitado]) => (
              <label key={valor} className={`flex items-center gap-2 text-sm ${habilitado ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}>
                <input type="radio" name="escopo" disabled={!habilitado} checked={form.escopo === valor} onChange={() => setForm((f) => ({ ...f, escopo: valor }))} />
                {rotulo}
              </label>
            ))}
            {form.escopo !== 'linhas' && (
              <label className="flex items-center gap-2 text-sm pt-1 cursor-pointer">
                <input type="checkbox" checked={form.aplicarSemelhantes} onChange={(e) => setForm((f) => ({ ...f, aplicarSemelhantes: e.target.checked }))} />
                Aplicar também aos já importados que ainda estão sem classificação
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassificarExtratoPage;
