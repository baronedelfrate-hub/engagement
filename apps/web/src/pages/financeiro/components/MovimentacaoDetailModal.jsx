import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download } from 'lucide-react';

const MovimentacaoDetailModal = ({ open, onOpenChange, movimentacaoId, mode = 'view', onSaved }) => {
  const { toast } = useToast();
  const { company_id } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [bancos, setBancos] = useState([]);

  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open || !movimentacaoId) return;
    loadData();
  }, [open, movimentacaoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rowRes, docsRes] = await Promise.all([
        supabase
          .from('movimentacao_financeira')
          .select(`
            *,
            cliente:clientes(nome),
            fornecedor:fornecedores(nome),
            categoria:categorias(nome),
            subcategoria:subcategorias(nome),
            centro_custo:centros_custo(nome),
            banco:bancos(nome)
          `)
          .eq('id', movimentacaoId)
          .single(),
        supabase.from('movimentacao_documentos').select('*').eq('movimentacao_id', movimentacaoId)
      ]);

      if (rowRes.error) throw rowRes.error;
      setRow(rowRes.data);
      setForm({
        status: rowRes.data.status || 'pendente',
        valor_total: rowRes.data.valor_total || '',
        data_emissao: rowRes.data.data_emissao || '',
        data_vencimento: rowRes.data.data_vencimento || '',
        categoria_id: rowRes.data.categoria_id || 'none',
        subcategoria_id: rowRes.data.subcategoria_id || 'none',
        centro_custo_id: rowRes.data.centro_custo_id || 'none',
        banco_id: rowRes.data.banco_id || 'none',
        observacoes: rowRes.data.observacoes || ''
      });
      setDocumentos(docsRes.data || []);

      if (mode === 'edit' && company_id) {
        const [catRes, subRes, ccRes, banRes] = await Promise.all([
          supabase.from('categorias').select('id, nome').eq('company_id', company_id).order('nome'),
          supabase.from('subcategorias').select('id, nome, categoria_id').eq('company_id', company_id).order('nome'),
          supabase.from('centros_custo').select('id, nome').eq('company_id', company_id).order('nome'),
          supabase.from('bancos').select('id, nome').eq('company_id', company_id).order('nome')
        ]);
        setCategorias(catRes.data || []);
        setSubcategorias(subRes.data || []);
        setCentrosCusto(ccRes.data || []);
        setBancos(banRes.data || []);
      }
    } catch (err) {
      console.error('[MovimentacaoDetailModal] Erro ao carregar:', err);
      toast({ title: 'Erro', description: 'Não foi possível carregar a movimentação.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    const { data, error } = await supabase.storage.from('movimentacao-docs').createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Erro', description: 'Não foi possível gerar o link do documento.', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        status: form.status,
        valor_total: Number(form.valor_total) || 0,
        data_emissao: form.data_emissao,
        data_vencimento: form.data_vencimento,
        categoria_id: form.categoria_id === 'none' ? null : form.categoria_id,
        subcategoria_id: form.subcategoria_id === 'none' ? null : form.subcategoria_id,
        centro_custo_id: form.centro_custo_id === 'none' ? null : form.centro_custo_id,
        banco_id: form.banco_id === 'none' ? null : form.banco_id,
        observacoes: form.observacoes,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('movimentacao_financeira').update(payload).eq('id', movimentacaoId);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Movimentação atualizada.' });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredSubcategorias = subcategorias.filter(s => form.categoria_id === 'none' || s.categoria_id === form.categoria_id);
  const entidadeNome = row?.tipo?.toLowerCase() === 'receber' ? row?.cliente?.nome : row?.fornecedor?.nome;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar Movimentação' : 'Detalhes da Movimentação'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !row ? (
          <p className="text-muted-foreground text-center py-8">Movimentação não encontrada.</p>
        ) : mode === 'view' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-muted-foreground">Nº Título</Label><p className="font-mono text-foreground">{row.numero_titulo}</p></div>
              <div><Label className="text-muted-foreground">Tipo</Label><p><Badge variant="outline">{row.tipo?.toUpperCase()}</Badge></p></div>
              <div><Label className="text-muted-foreground">{row.tipo?.toLowerCase() === 'receber' ? 'Cliente' : 'Fornecedor'}</Label><p className="text-foreground">{entidadeNome || '-'}</p></div>
              <div><Label className="text-muted-foreground">Status</Label><p><Badge variant="secondary" className="capitalize">{row.status}</Badge></p></div>
              <div><Label className="text-muted-foreground">Valor Total</Label><p className="text-foreground">R$ {parseFloat(row.valor_total || 0).toFixed(2)}</p></div>
              <div><Label className="text-muted-foreground">Emissão</Label><p className="text-foreground">{row.data_emissao ? new Date(row.data_emissao + 'T12:00:00').toLocaleDateString() : '-'}</p></div>
              <div><Label className="text-muted-foreground">Vencimento</Label><p className="text-foreground">{row.data_vencimento ? new Date(row.data_vencimento + 'T12:00:00').toLocaleDateString() : '-'}</p></div>
              <div><Label className="text-muted-foreground">Parcela</Label><p className="text-foreground">{row.parcela_atual}/{row.total_parcelas}</p></div>
              <div><Label className="text-muted-foreground">Categoria</Label><p className="text-foreground">{row.categoria?.nome || '-'}</p></div>
              <div><Label className="text-muted-foreground">Subcategoria</Label><p className="text-foreground">{row.subcategoria?.nome || '-'}</p></div>
              <div><Label className="text-muted-foreground">Centro de Custo</Label><p className="text-foreground">{row.centro_custo?.nome || '-'}</p></div>
              <div><Label className="text-muted-foreground">Banco</Label><p className="text-foreground">{row.banco?.nome || '-'}</p></div>
            </div>
            {row.observacoes && (
              <div><Label className="text-muted-foreground">Observações</Label><p className="text-foreground whitespace-pre-wrap">{row.observacoes}</p></div>
            )}
            <div>
              <Label className="text-muted-foreground">Documentos Anexos</Label>
              {documentos.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">Nenhum documento anexado.</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border border-border rounded-md">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm text-foreground truncate">{doc.nome_arquivo}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(doc)} title="Baixar">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm(f => ({ ...f, valor_total: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input type="date" value={form.data_emissao} onChange={(e) => setForm(f => ({ ...f, data_emissao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={(v) => setForm(f => ({ ...f, categoria_id: v, subcategoria_id: 'none' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select value={form.subcategoria_id} onValueChange={(v) => setForm(f => ({ ...f, subcategoria_id: v }))} disabled={form.categoria_id === 'none'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {filteredSubcategorias.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={form.centro_custo_id} onValueChange={(v) => setForm(f => ({ ...f, centro_custo_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {centrosCusto.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Select value={form.banco_id} onValueChange={(v) => setForm(f => ({ ...f, banco_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {bancos.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
        )}

        {!loading && row && mode === 'edit' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MovimentacaoDetailModal;
