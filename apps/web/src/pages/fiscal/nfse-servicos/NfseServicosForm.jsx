import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';

export default function NfseServicosForm({ id }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    codigo_servico: '',
    descricao_servico: '',
    aliquota_iss: '',
    municipio_id: '',
    observacoes: ''
  });

  const [municipios, setMunicipios] = useState([]);

  useEffect(() => {
    fetchMunicipios();
    if (isEdit) {
      fetchServico();
    }
  }, [id, isEdit]);

  const fetchMunicipios = async () => {
    try {
      const { data, error } = await supabase
        .from('fiscal_municipios_ibge')
        .select('id, nome_municipio, uf, codigo_ibge')
        .order('nome_municipio', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMunicipios(data || []);
    } catch (err) {
      console.error("Erro ao buscar municípios", err);
    }
  };

  const fetchServico = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nfse_servicos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          codigo_servico: data.codigo_servico || '',
          descricao_servico: data.descricao_servico || '',
          aliquota_iss: data.aliquota || '',
          municipio_id: data.municipio_id || '',
          observacoes: data.observacoes || ''
        });
      }
    } catch (err) {
      console.error("Erro ao carregar serviço", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do serviço.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.codigo_servico || !formData.descricao_servico) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha o código e a descrição do serviço.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        codigo_servico: formData.codigo_servico,
        descricao_servico: formData.descricao_servico,
        aliquota: formData.aliquota_iss ? parseFloat(formData.aliquota_iss) : 0,
        municipio_id: formData.municipio_id || null,
        observacoes: formData.observacoes,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('nfse_servicos')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Serviço atualizado com sucesso." });
      } else {
        const { error } = await insertWithCompanyId('nfse_servicos', payload);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Serviço cadastrado com sucesso." });
      }

      navigate('/fiscal/nfse-servicos');
    } catch (err) {
      console.error("Erro ao salvar", err);
      toast({
        title: "Erro ao salvar",
        description: err.message || "Ocorreu um erro ao tentar salvar o serviço.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'Editar Serviço NFS-e' : 'Novo Serviço NFS-e'}
          </h2>
          <p className="text-slate-500">Configure os parâmetros do serviço para emissão de notas.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/fiscal/nfse-servicos')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="codigo_servico">Código do Serviço (LC 116) <span className="text-red-500">*</span></Label>
              <Input
                id="codigo_servico"
                name="codigo_servico"
                value={formData.codigo_servico}
                onChange={handleChange}
                placeholder="Ex: 14.01"
                className="bg-white text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliquota_iss">Alíquota ISS Padrão (%)</Label>
              <Input
                id="aliquota_iss"
                name="aliquota_iss"
                type="number"
                step="0.01"
                value={formData.aliquota_iss}
                onChange={handleChange}
                placeholder="Ex: 2.00"
                className="bg-white text-slate-900"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descricao_servico">Descrição Fiscal do Serviço <span className="text-red-500">*</span></Label>
              <Input
                id="descricao_servico"
                name="descricao_servico"
                value={formData.descricao_servico}
                onChange={handleChange}
                placeholder="Descrição que sairá na nota fiscal"
                className="bg-white text-slate-900"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="municipio_id">Município Base (Padrão Nacional)</Label>
              <select
                id="municipio_id"
                name="municipio_id"
                value={formData.municipio_id}
                onChange={handleChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900"
              >
                <option value="">Selecione o Município</option>
                {municipios.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome_municipio} - {m.uf} (IBGE: {m.codigo_ibge})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Parâmetros NFS-e
        </Button>
      </div>
    </div>
  );
}