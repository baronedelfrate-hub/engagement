import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function TipoDocumentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    sigla: '',
    nome: '',
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
        .from('tipos_documento')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setFormData(data);
    } catch (error) {
      console.error('Error loading tipo de documento:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar este tipo de documento.', variant: 'destructive' });
      navigate('/cadastros/tipo-documento');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (id) {
        const { error } = await supabase.from('tipos_documento').update(formData).eq('id', id);
        if (error) throw error;
        toast({
          title: "Tipo de documento atualizado",
          description: "Os dados do tipo de documento foram atualizados com sucesso.",
        });
      } else {
        const { error } = await supabase.from('tipos_documento').insert(formData);
        if (error) throw error;
        toast({
          title: "Tipo de documento criado",
          description: "O novo tipo de documento foi cadastrado com sucesso.",
        });
      }
      navigate('/cadastros/tipo-documento');
    } catch (error) {
      console.error('Error saving tipo de documento:', error);
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
        <title>{id ? 'Editar' : 'Novo'} Tipo de Documento - ERP Platform</title>
        <meta name="description" content={`${id ? 'Edit existing' : 'Create new'} document type in your ERP system`} />
      </Helmet>

      <PageHeader
        title={id ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}
        description={id ? 'Atualize as informações do tipo de documento' : 'Cadastre um novo tipo de documento'}
        showBack
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo de Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Nota Fiscal, Recibo, Contrato"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sigla">Sigla</Label>
                  <Input
                    id="sigla"
                    name="sigla"
                    value={formData.sigla || ''}
                    onChange={handleChange}
                    placeholder="Ex: NF, RPA, BOLETO"
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
                <Button type="button" variant="outline" onClick={() => navigate('/cadastros/tipo-documento')}>
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

export default TipoDocumentoForm;