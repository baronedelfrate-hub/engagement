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

function EntradaEstoqueForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    data_entrada: new Date().toISOString().split('T')[0],
    referencia: ''
  });

  useEffect(() => {
    fetchProdutos();
    if (id) {
      loadEntrada();
    }
  }, [id]);

  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('produtos').select('id, nome');
    if (error) {
      console.error('[EntradaEstoqueForm] Erro ao carregar produtos:', error);
      return;
    }
    setProdutos(data || []);
  };

  const loadEntrada = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entradas_estoque')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setFormData({
        produto_id: data.produto_id || '',
        quantidade: data.quantidade ?? '',
        data_entrada: data.data_entrada || new Date().toISOString().split('T')[0],
        referencia: data.referencia || ''
      });
    } catch (error) {
      console.error('[EntradaEstoqueForm] Erro ao carregar entrada:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar esta entrada.', variant: 'destructive' });
      navigate('/estoque/entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        const { error } = await supabase.from('entradas_estoque').update(formData).eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Entrada atualizada." });
      } else {
        const { error } = await insertWithCompanyId('entradas_estoque', formData);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Entrada criada." });
      }
      navigate('/estoque/entrada');
    } catch (error) {
      console.error('[EntradaEstoqueForm] Erro ao salvar entrada:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
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
      <Helmet>
        <title>{id ? 'Editar' : 'Nova'} Entrada - ERP Platform</title>
      </Helmet>

      <PageHeader
        title={id ? 'Editar Entrada' : 'Nova Entrada de Estoque'}
        showBack
      />

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
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    name="quantidade"
                    value={formData.quantidade}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    name="data_entrada"
                    value={formData.data_entrada}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Documento de Origem</Label>
                  <Input
                    name="referencia"
                    value={formData.referencia}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque/entrada')}>
                  Cancelar
                </Button>
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

export default EntradaEstoqueForm;
