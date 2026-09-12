import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';

function MovimentacaoEstoqueForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    produto_id: '',
    tipo: 'Entrada',
    quantidade: '',
    data: new Date().toISOString().split('T')[0],
    motivo: '',
    lote: '',
    serial: '',
    status: 'Concluído'
  });

  useEffect(() => {
    fetchProdutos();
    if (id) {
      loadMovimentacao();
    }
  }, [id]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, nome, estoque_atual')
      .eq('ativo', true)
      .eq('controla_estoque', true);
    if (error) {
      console.error('[MovimentacaoEstoqueForm] Erro ao carregar produtos:', error);
      return;
    }
    setProdutos(data || []);
  };

  const loadMovimentacao = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('movimentacao_estoque')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setFormData({
        produto_id: data.produto_id || '',
        tipo: data.tipo || 'Entrada',
        quantidade: data.quantidade ?? '',
        data: data.data || new Date().toISOString().split('T')[0],
        motivo: data.motivo || '',
        lote: data.lote || '',
        serial: data.serial || '',
        status: data.status || 'Concluído'
      });
    } catch (e) {
      console.error('[MovimentacaoEstoqueForm] Erro ao carregar movimentação:', e);
      toast({ title: 'Erro', description: 'Não foi possível carregar esta movimentação.', variant: 'destructive' });
      navigate('/estoque/movimentacao');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Ajuste de estoque exige aprovação; Entrada/Saída são aplicadas na hora
      const status = formData.tipo === 'Ajuste' ? 'Pendente' : 'Concluído';
      const finalData = { ...formData, status };

      if (id) {
        const { error } = await supabase
          .from('movimentacao_estoque')
          .update(finalData)
          .eq('id', id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Movimentação atualizada.' });
      } else {
        const { error } = await insertWithCompanyId('movimentacao_estoque', finalData);
        if (error) throw error;

        // Aplica o efeito no estoque real do produto imediatamente, quando concluída
        if (status === 'Concluído') {
          const produto = produtos.find(p => p.id === formData.produto_id);
          if (produto) {
            const currentStock = parseFloat(produto.estoque_atual || 0);
            const qty = parseFloat(formData.quantidade) || 0;
            const newStock = formData.tipo === 'Entrada' ? currentStock + qty : currentStock - qty;
            const { error: stockError } = await supabase
              .from('produtos')
              .update({ estoque_atual: newStock })
              .eq('id', produto.id);
            if (stockError) throw stockError;
          }
        }

        toast({
          title: status === 'Pendente' ? 'Aguardando Aprovação' : 'Sucesso',
          description: status === 'Pendente' ? 'Ajuste enviado para aprovação.' : 'Movimentação registrada e estoque atualizado.'
        });
      }
      navigate('/estoque/movimentacao');
    } catch (error) {
      console.error('[MovimentacaoEstoqueForm] Erro ao salvar movimentação:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar a movimentação.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>{id ? 'Editar' : 'Nova'} Movimentação - Engagement Soluções</title></Helmet>
      <PageHeader title={id ? 'Editar Movimentação' : 'Nova Movimentação'} description="Registro de entradas, saídas e ajustes de estoque" showBack />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <select
                    name="produto_id"
                    value={formData.produto_id}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm"
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Saída">Saída</option>
                    <option value="Ajuste">Ajuste (Requer Aprovação)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" name="quantidade" value={formData.quantidade} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" name="data" value={formData.data} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label>Lote (Opcional)</Label>
                  <Input name="lote" value={formData.lote} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Serial (Opcional)</Label>
                  <Input name="serial" value={formData.serial} onChange={handleChange} />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Motivo</Label>
                  <Textarea name="motivo" value={formData.motivo} onChange={handleChange} rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque/movimentacao')}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </>
  );
}

export default MovimentacaoEstoqueForm;