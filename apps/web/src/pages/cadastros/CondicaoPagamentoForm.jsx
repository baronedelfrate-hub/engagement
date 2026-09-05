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
import { erpServices } from '@/lib/erpServices';
import { useToast } from '@/components/ui/use-toast';

function CondicaoPagamentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    dias: '',
    percentual_desconto: '',
    ativo: true
  });

  useEffect(() => {
    if (id) {
      loadCondicao();
    }
  }, [id]);

  const loadCondicao = async () => {
    setLoading(true);
    const result = await erpServices.condicoesPagamento.read(id);
    if (result.success) {
      setFormData({
        nome: result.data.nome || '',
        dias: result.data.dias ?? '',
        percentual_desconto: result.data.percentual_desconto ?? '',
        ativo: result.data.ativo ?? true
      });
    } else {
      toast({ title: 'Erro', description: 'Não foi possível carregar esta condição de pagamento.', variant: 'destructive' });
      navigate('/cadastros/condicao-pagamento');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nome: formData.nome,
      dias: formData.dias === '' ? null : parseInt(formData.dias, 10),
      percentual_desconto: formData.percentual_desconto === '' ? null : parseFloat(formData.percentual_desconto),
      ativo: formData.ativo
    };

    const result = id
      ? await erpServices.condicoesPagamento.update(id, payload)
      : await erpServices.condicoesPagamento.create(payload);

    if (result.success) {
      toast({
        title: id ? 'Condição de pagamento atualizada' : 'Condição de pagamento criada',
        description: id
          ? 'Os dados da condição de pagamento foram atualizados com sucesso.'
          : 'A nova condição de pagamento foi cadastrada com sucesso.'
      });
      navigate('/cadastros/condicao-pagamento');
    } else {
      toast({ title: 'Erro', description: result.error || 'Não foi possível salvar a condição de pagamento.', variant: 'destructive' });
    }
    setSaving(false);
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
    <div className="max-w-4xl mx-auto">
      <Helmet>
        <title>{id ? 'Editar' : 'Nova'} Condição de Pagamento - Engagement Soluções</title>
        <meta name="description" content={`${id ? 'Edit existing' : 'Create new'} payment condition`} />
      </Helmet>

      <PageHeader
        title={id ? 'Editar Condição de Pagamento' : 'Nova Condição de Pagamento'}
        description={id ? 'Atualize as informações da condição de pagamento' : 'Cadastre uma nova condição de pagamento'}
        showBack
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informações da Condição de Pagamento</CardTitle>
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
                    placeholder="Ex: À Vista, 30 dias, 30/60/90 dias"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dias">Prazo (dias)</Label>
                  <Input
                    id="dias"
                    name="dias"
                    type="number"
                    min="0"
                    value={formData.dias}
                    onChange={handleChange}
                    placeholder="Ex: 30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="percentual_desconto">Desconto (%)</Label>
                  <Input
                    id="percentual_desconto"
                    name="percentual_desconto"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.percentual_desconto}
                    onChange={handleChange}
                    placeholder="Ex: 5"
                  />
                </div>

                <div className="flex items-center gap-3 md:col-span-2 pt-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData(p => ({ ...p, ativo: checked }))}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/cadastros/condicao-pagamento')}
                >
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
    </div>
  );
}

export default CondicaoPagamentoForm;