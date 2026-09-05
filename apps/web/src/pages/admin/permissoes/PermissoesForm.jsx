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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

const PermissoesForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    modulo: '',
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    if (id) {
      fetchPermission();
    }
  }, [id]);

  const fetchPermission = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('permissions').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) setFormData(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      navigate('/admin/permissoes');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, ativo: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.codigo || !formData.nome || !formData.modulo) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Código, Nome e Módulo são obrigatórios." });
      return;
    }

    setSaving(true);
    try {
      let error;
      if (id) {
        const { error: updateError } = await supabase.from('permissions').update(formData).eq('id', id);
        error = updateError;
      } else {
        const { error: insertError } = await insertWithCompanyId('permissions', formData);
        error = insertError;
      }

      if (error) throw error;
      toast({ title: "Sucesso", description: `Permissão ${id ? 'atualizada' : 'criada'}.` });
      navigate('/admin/permissoes');
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Helmet>
        <title>{id ? 'Editar' : 'Nova'} Permissão - ERP Platform</title>
      </Helmet>

      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/permissoes')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <h1 className="text-3xl font-bold">{id ? 'Editar Permissão' : 'Nova Permissão'}</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader><CardTitle>Detalhes da Permissão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Código Único <span className="text-red-500">*</span></Label>
              <Input name="codigo" value={formData.codigo} onChange={handleChange} placeholder="ex: usuarios.criar" required />
            </div>
            <div className="space-y-2">
              <Label>Nome <span className="text-red-500">*</span></Label>
              <Input name="nome" value={formData.nome} onChange={handleChange} placeholder="ex: Criar Usuário" required />
            </div>
            <div className="space-y-2">
              <Label>Módulo <span className="text-red-500">*</span></Label>
              <Input name="modulo" value={formData.modulo} onChange={handleChange} placeholder="ex: Administração" required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea name="descricao" value={formData.descricao || ''} onChange={handleChange} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="ativo" checked={formData.ativo} onCheckedChange={handleSwitchChange} />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/permissoes')}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default PermissoesForm;