import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';

function InventarioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade_contada: '',
    quantidade_sistema: '',
    diferenca: '',
    data_contagem: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchProdutos();
    if (id) {
      loadInventario();
    }
  }, [id]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('produtos').select('id, nome');
    if (error) {
      console.error('[InventarioForm] Erro ao carregar produtos:', error);
      return;
    }
    setProdutos(data || []);
  };

  const loadInventario = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setFormData({
        produto_id: data.produto_id || '',
        quantidade_contada: data.quantidade_contada ?? '',
        quantidade_sistema: data.quantidade_sistema ?? '',
        diferenca: data.diferenca ?? '',
        data_contagem: data.data_contagem || new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('[InventarioForm] Erro ao carregar inventário:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar este inventário.', variant: 'destructive' });
      navigate('/estoque/inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from('inventario').update(formData).eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Inventário atualizado." });
      } else {
        const { error } = await insertWithCompanyId('inventario', formData);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Inventário registrado." });
      }
      navigate('/estoque/inventario');
    } catch (error) {
      console.error('[InventarioForm] Erro ao salvar inventário:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      <Helmet><title>{id ? 'Editar' : 'Novo'} Inventário - ERP Platform</title></Helmet>
      <PageHeader title={id ? 'Editar Inventário' : 'Novo Inventário'} showBack />
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
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Contada</Label>
                  <Input type="number" name="quantidade_contada" value={formData.quantidade_contada} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Sistema</Label>
                  <Input type="number" name="quantidade_sistema" value={formData.quantidade_sistema} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Diferença</Label>
                  <Input type="number" name="diferenca" value={formData.diferenca} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Data da Contagem</Label>
                  <Input type="date" name="data_contagem" value={formData.data_contagem} onChange={handleChange} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque/inventario')}>Cancelar</Button>
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

export default InventarioForm;
