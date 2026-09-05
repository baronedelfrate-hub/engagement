import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const TimesForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    if (id) {
      fetchTime();
    }
  }, [id]);

  const fetchTime = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('times')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) setFormData(data);
    } catch (error) {
      console.error('Error fetching time:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do time."
      });
      navigate('/admin/times');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro de validação",
        description: "O nome do time é obrigatório."
      });
      return;
    }

    setSaving(true);
    try {
      let error;
      if (id) {
        const { error: updateError } = await supabase
          .from('times')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            updated_at: new Date()
          })
          .eq('id', id);
        error = updateError;
      } else {
        const { error: insertError } = await insertWithCompanyId('times', {
            nome: formData.nome,
            descricao: formData.descricao
        });
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Time ${id ? 'atualizado' : 'criado'} com sucesso.`
      });
      navigate('/admin/times');
    } catch (error) {
      console.error('Error saving time:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Helmet>
        <title>{id ? 'Editar Time' : 'Novo Time'} - ERP Platform</title>
      </Helmet>

      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/times')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{id ? 'Editar Time' : 'Novo Time'}</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Dados do Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Time <span className="text-red-500">*</span></Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Equipe de Vendas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                value={formData.descricao || ''}
                onChange={handleChange}
                placeholder="Descreva as responsabilidades deste time"
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/times')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default TimesForm;