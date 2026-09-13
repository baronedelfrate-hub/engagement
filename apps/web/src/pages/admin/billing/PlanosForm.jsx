import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import { Save, Loader2 } from 'lucide-react';
import { listarPlanos, criarPlano, atualizarPlano } from '@/services/admin/billingService';

const PlanosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ nome: '', valor_mensal: '', descricao: '', ativo: true });

  useEffect(() => {
    if (isEditing) {
      listarPlanos().then(planos => {
        const p = planos.find(x => x.id === id);
        if (p) setFormData(p);
      });
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.valor_mensal) {
      toast({ title: 'Erro', description: 'Preencha nome e valor mensal.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (isEditing) {
        await atualizarPlano(id, { nome: formData.nome, valor_mensal: formData.valor_mensal, descricao: formData.descricao, ativo: formData.ativo });
      } else {
        await criarPlano({ nome: formData.nome, valor_mensal: formData.valor_mensal, descricao: formData.descricao, ativo: formData.ativo });
      }
      toast({ title: 'Sucesso', description: `Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso.` });
      navigate('/admin/planos');
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>{isEditing ? 'Editar' : 'Novo'} Plano | ERP Platform</title></Helmet>
      <PageHeader
        title={isEditing ? 'Editar Plano' : 'Novo Plano'}
        showBack
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/planos')}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        }
      />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_mensal">Valor Mensal (R$) *</Label>
              <Input id="valor_mensal" type="number" step="0.01" value={formData.valor_mensal} onChange={(e) => setFormData(p => ({ ...p, valor_mensal: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao || ''} onChange={(e) => setFormData(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="ativo" checked={formData.ativo} onCheckedChange={(c) => setFormData(p => ({ ...p, ativo: c }))} />
              <Label htmlFor="ativo" className="cursor-pointer">Plano ativo (disponível para novas assinaturas)</Label>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PlanosForm;
