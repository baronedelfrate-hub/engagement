import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { bpoAutomationService } from '@/lib/bpoAutomationService';

const BPOClientesForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [formData, setFormData] = useState({
    cliente_id: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    status_bpo: 'Em Onboarding',
    data_inicio: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, cnpj_cpf, email, telefone, endereco')
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar a lista de clientes.'
      });
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleClienteChange = (clienteId) => {
    const selectedCliente = clientes.find(c => c.id === clienteId);
    
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      cnpj: selectedCliente?.cnpj_cpf || '',
      email: selectedCliente?.email || '',
      telefone: selectedCliente?.telefone || '',
      endereco: selectedCliente?.endereco || ''
    }));

    if (errors.cliente_id) {
      setErrors(prev => ({ ...prev, cliente_id: null }));
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
    if (!formData.cliente_id) newErrors.cliente_id = 'O cliente é obrigatório';
    if (!formData.status_bpo) newErrors.status_bpo = 'O status do BPO é obrigatório';
    if (!formData.data_inicio) newErrors.data_inicio = 'A data de início é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro de Validação', 
        description: 'Por favor, preencha todos os campos obrigatórios.' 
      });
      return;
    }

    setSaving(true);
    try {
      // Create the BPO client link and trigger automations
      const bpoData = {
        cliente_id: formData.cliente_id,
        status_bpo: formData.status_bpo,
        data_inicio: formData.data_inicio
      };

      // We use the bpoAutomationService to ensure all related phases/blocks/activities are created
      const result = await bpoAutomationService.createBPOClient(bpoData);
      
      if (!result.success) throw result.error;

      toast({ 
        title: 'Sucesso', 
        description: 'Cliente BPO estruturado com sucesso.' 
      });
      navigate('/operacao/bpo-e5/clientes-bpo');
    } catch (error) {
      console.error('Error saving BPO Client:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao Salvar', 
        description: error.message || 'Ocorreu um erro ao tentar salvar o cliente BPO.' 
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Helmet>
        <title>Novo Cliente BPO - ERP</title>
      </Helmet>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/operacao/bpo-e5/clientes-bpo')} className="p-2 h-auto">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Novo Cliente BPO</h1>
            <p className="text-slate-500 text-sm">Vincule um cliente existente à operação de BPO</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-semibold">Seleção de Cliente e Configurações BPO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cliente">Cliente <span className="text-red-500">*</span></Label>
                <Select value={formData.cliente_id} onValueChange={handleClienteChange} disabled={loadingClientes}>
                  <SelectTrigger className={`bg-white ${errors.cliente_id ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={loadingClientes ? "Carregando clientes..." : "Selecione um cliente..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} {cliente.cnpj_cpf ? `(${cliente.cnpj_cpf})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cliente_id && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.cliente_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ / CPF</Label>
                <Input 
                  id="cnpj"
                  value={formData.cnpj} 
                  readOnly
                  placeholder="Auto-preenchido"
                  className="bg-slate-50 text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  value={formData.email} 
                  readOnly
                  placeholder="Auto-preenchido"
                  className="bg-slate-50 text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone"
                  value={formData.telefone} 
                  readOnly
                  placeholder="Auto-preenchido"
                  className="bg-slate-50 text-slate-600"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input 
                  id="endereco"
                  value={formData.endereco} 
                  readOnly
                  placeholder="Auto-preenchido"
                  className="bg-slate-50 text-slate-600"
                />
              </div>

              <div className="col-span-full border-t border-slate-100 my-2 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Configurações BPO</h3>
              </div>

              <div className="space-y-2">
                <Label>Status BPO <span className="text-red-500">*</span></Label>
                <Select value={formData.status_bpo} onValueChange={(val) => handleChange('status_bpo', val)}>
                  <SelectTrigger className={`bg-white ${errors.status_bpo ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em Onboarding">Em Onboarding</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status_bpo && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.status_bpo}</p>}
              </div>

              <div className="space-y-2">
                <Label>Data Início <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  value={formData.data_inicio} 
                  onChange={(e) => handleChange('data_inicio', e.target.value)} 
                  className={errors.data_inicio ? "border-red-500" : ""}
                />
                {errors.data_inicio && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.data_inicio}</p>}
              </div>

            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/operacao/bpo-e5/clientes-bpo')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || loadingClientes} className="bg-primary text-primary-foreground min-w-[140px]">
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
              ) : (
                'Salvar Cliente BPO'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default BPOClientesForm;