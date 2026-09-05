import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, AlertCircle } from 'lucide-react';

const BPOClienteFaseForm = () => {
  const { cliente_id, fase_id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    fase: '',
    status: 'Não Iniciada',
    data_inicio: '',
    data_fim: '',
    responsavel: ''
  });

  useEffect(() => {
    fetchFase();
  }, [fase_id]);

  const fetchFase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bpo_fases')
        .select('*')
        .eq('id', fase_id)
        .single();

      if (error) throw error;
      
      setFormData({
        fase: data.fase || '',
        status: data.status || 'Não Iniciada',
        data_inicio: data.data_inicio || '',
        data_fim: data.data_fim || '',
        responsavel: '' // Simulated field as it's not present in the base bpo_fases schema directly
      });
    } catch (error) {
      console.error('Error fetching fase:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os dados da fase.'
      });
      navigate(`/operacao/bpo-e5/clientes-bpo/${cliente_id}/fases`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.status) newErrors.status = 'O status é obrigatório';
    
    if (formData.data_inicio && formData.data_fim) {
      if (new Date(formData.data_fim) < new Date(formData.data_inicio)) {
        newErrors.data_fim = 'Data de fim não pode ser anterior à data de início';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      // Update only existing columns to prevent Supabase errors
      const updateData = {
        status: formData.status,
        data_inicio: formData.data_inicio || null,
        data_fim: formData.data_fim || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('bpo_fases')
        .update(updateData)
        .eq('id', fase_id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Fase atualizada com sucesso.',
      });
      navigate(`/operacao/bpo-e5/clientes-bpo/${cliente_id}/fases`);
    } catch (error) {
      console.error('Erro ao atualizar fase:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: error.message || 'Ocorreu um erro ao atualizar a fase.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Helmet>
        <title>Editar Fase BPO - ERP Platform</title>
      </Helmet>

      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/operacao/bpo-e5/clientes-bpo/${cliente_id}/fases`)} className="p-2 h-auto">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar Fase</h1>
          <p className="text-slate-500 text-sm">Atualize o status e o cronograma da fase</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-semibold">Detalhes da Fase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fase">Nome da Fase</Label>
                <Input 
                  id="fase"
                  value={formData.fase} 
                  readOnly
                  className="bg-slate-50 text-slate-600 font-medium"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input 
                  id="responsavel"
                  value={formData.responsavel} 
                  onChange={(e) => handleChange('responsavel', e.target.value)} 
                  placeholder="Nome do responsável"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Status <span className="text-red-500">*</span></Label>
                <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
                  <SelectTrigger className={`bg-white ${errors.status ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não Iniciada">Não Iniciada</SelectItem>
                    <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.status}</p>}
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input 
                  type="date" 
                  value={formData.data_inicio} 
                  onChange={(e) => handleChange('data_inicio', e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input 
                  type="date" 
                  value={formData.data_fim} 
                  onChange={(e) => handleChange('data_fim', e.target.value)} 
                  className={errors.data_fim ? "border-red-500" : ""}
                />
                {errors.data_fim && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.data_fim}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/operacao/bpo-e5/clientes-bpo/${cliente_id}/fases`)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground min-w-[140px] gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default BPOClienteFaseForm;