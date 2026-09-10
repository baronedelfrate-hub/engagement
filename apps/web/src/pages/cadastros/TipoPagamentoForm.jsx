import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function TipoPagamentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    if (id) {
      loadTipo();
    }
  }, [id]);

  const loadTipo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipos_pagamento')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setFormData(data);
    } catch (error) {
      console.error('Error loading tipo de pagamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar este tipo de pagamento.', variant: 'destructive' });
      navigate('/cadastros/tipo-pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (id) {
        const { error } = await supabase.from('tipos_pagamento').update(formData).eq('id', id);
        if (error) throw error;
        toast({
          title: "Tipo de pagamento atualizado",
          description: "Os dados do tipo de pagamento foram atualizados com sucesso.",
        });
      } else {
        const { error } = await supabase.from('tipos_pagamento').insert(formData);
        if (error) throw error;
        toast({
          title: "Tipo de pagamento criado",
          description: "O novo tipo de pagamento foi cadastrado com sucesso.",
        });
      }
      navigate('/cadastros/tipo-pagamento');
    } catch (error) {
      console.error('Error saving tipo de pagamento:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
        <title>{id ? 'Editar' : 'Novo'} Tipo de Pagamento - ERP Platform</title>
        <meta name="description" content={`${id ? 'Edit existing' : 'Create new'} payment type in your ERP financial system`} />
      </Helmet>

      <PageHeader
        title={id ? 'Editar Tipo de Pagamento' : 'Novo Tipo de Pagamento'}
        description={id ? 'Atualize as informações do tipo de pagamento' : 'Cadastre um novo tipo de pagamento'}
        showBack
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Dinheiro, Cartão, PIX"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao || ''}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/cadastros/tipo-pagamento')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {id ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default TipoPagamentoForm;
