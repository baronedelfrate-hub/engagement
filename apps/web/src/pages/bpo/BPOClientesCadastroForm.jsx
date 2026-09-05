import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, Building2, ChevronRight } from 'lucide-react';
import CnpjLookup from '@/components/CnpjLookup';
import { formatCnpj, unformatCnpj } from '@/lib/cnpjUtils';
import { motion } from 'framer-motion';

const BPOClientesCadastroForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cnae: '',
    situacao_cadastral: '',
    observacoes: '',
    status: 'ativo'
  });

  useEffect(() => {
    const fetchCliente = async () => {
      if (!id || id === 'novo') return;
      
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from('clientes_bpo')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            nome: data.nome || '',
            cnpj_cpf: data.cnpj_cpf || '',
            email: data.email || '',
            telefone: data.telefone || '',
            cep: data.cep || '',
            endereco: data.endereco || '',
            numero: data.numero || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            cidade: data.cidade || '',
            estado: data.estado || '',
            cnae: data.cnae || '',
            situacao_cadastral: data.situacao_cadastral || '',
            observacoes: data.observacoes || '',
            status: data.status || 'ativo'
          });
        }
      } catch (error) {
        console.error("Erro ao carregar cliente BPO:", error);
        toast({ 
          title: 'Erro', 
          description: 'Erro ao carregar dados do cliente BPO.', 
          variant: 'destructive' 
        });
        navigate('/clientes-bpo/cadastro-clientes');
      } finally {
        setFetching(false);
      }
    };

    fetchCliente();
  }, [id, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCnpjDataFound = (data) => {
    setFormData(prev => ({
      ...prev,
      nome: data.razao_social || prev.nome,
      cnpj_cpf: formatCnpj(data.cnpj),
      email: data.email || prev.email,
      telefone: data.telefone || prev.telefone,
      cep: data.cep || prev.cep,
      endereco: data.logradouro || prev.endereco,
      numero: data.numero || prev.numero,
      complemento: data.complemento || prev.complemento,
      bairro: data.bairro || prev.bairro,
      cidade: data.municipio || prev.cidade,
      estado: data.uf || prev.estado,
      cnae: data.cnae_principal || prev.cnae,
      situacao_cadastral: data.situacao_cadastral || prev.situacao_cadastral
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Safely convert all fields to strings and trim
    const safeString = (value) => (value || '').toString().trim();
    
    const trimmedNome = safeString(formData.nome);
    const trimmedCnpjCpf = safeString(formData.cnpj_cpf);
    
    // Validação básica
    if (!trimmedNome) {
      toast({ 
        title: 'Aviso', 
        description: 'O nome é obrigatório.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nome: trimmedNome,
        cnpj_cpf: trimmedCnpjCpf ? unformatCnpj(trimmedCnpjCpf) : null,
        email: safeString(formData.email) || null,
        telefone: safeString(formData.telefone) || null,
        cep: safeString(formData.cep) || null,
        endereco: safeString(formData.endereco) || null,
        numero: safeString(formData.numero) || null,
        complemento: safeString(formData.complemento) || null,
        bairro: safeString(formData.bairro) || null,
        cidade: safeString(formData.cidade) || null,
        estado: safeString(formData.estado) || null,
        cnae: safeString(formData.cnae) || null,
        situacao_cadastral: safeString(formData.situacao_cadastral) || null,
        observacoes: safeString(formData.observacoes) || null,
        status: formData.status
      };

      let error;

      if (id && id !== 'novo') {
        // Update
        payload.updated_at = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('clientes_bpo')
          .update(payload)
          .eq('id', id);
        error = updateError;
      } else {
        // Insert
        const { error: insertError } = await insertWithCompanyId('clientes_bpo', payload);
        error = insertError;
      }

      if (error) throw error;

      toast({ 
        title: 'Sucesso', 
        description: 'Cliente BPO salvo com sucesso.' 
      });
      navigate('/clientes-bpo/cadastro-clientes');
      
    } catch(err) {
      console.error("Erro ao salvar cliente BPO:", err);
      toast({ 
        title: 'Erro ao Salvar', 
        description: err.message || 'Ocorreu um erro inesperado.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
        <span 
          className="font-medium text-slate-900 dark:text-slate-100 cursor-pointer hover:underline" 
          onClick={() => navigate('/clientes-bpo')}
        >
          CLIENTES BPO
        </span>
        <ChevronRight className="h-4 w-4" />
        <span 
          className="cursor-pointer hover:underline" 
          onClick={() => navigate('/clientes-bpo/cadastro-clientes')}
        >
          Cadastro de Clientes
        </span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-900 dark:text-slate-100 font-medium">
          {id && id !== 'novo' ? 'Editar' : 'Novo'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate('/clientes-bpo/cadastro-clientes')}
            className="border-slate-300 dark:border-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {id && id !== 'novo' ? "Editar Cliente BPO" : "Novo Cliente BPO"}
          </h1>
        </div>
      </div>

      {/* CNPJ Lookup - Only for new records */}
      {(!id || id === 'novo') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CnpjLookup onDataFound={handleCnpjDataFound} />
        </motion.div>
      )}

      {/* Form Card */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Dados Cadastrais
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Informações principais do cliente BPO
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-slate-700 dark:text-slate-300">
                  Nome / Razão Social *
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  placeholder="Nome do cliente"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf" className="text-slate-700 dark:text-slate-300">
                  CNPJ / CPF
                </Label>
                <Input
                  id="cnpj_cpf"
                  name="cnpj_cpf"
                  value={formData.cnpj_cpf}
                  onChange={handleChange}
                  placeholder="Apenas números ou formatado"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-slate-700 dark:text-slate-300">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="border-t pt-6 mt-6 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium mb-4 text-slate-900 dark:text-white">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-1 md:col-span-3 space-y-2">
                  <Label htmlFor="cep" className="text-slate-700 dark:text-slate-300">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    placeholder="00000-000"
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-1 md:col-span-7 space-y-2">
                  <Label htmlFor="endereco" className="text-slate-700 dark:text-slate-300">Logradouro</Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    placeholder="Rua, Avenida, etc."
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="numero" className="text-slate-700 dark:text-slate-300">Número</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Ex: 123"
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="col-span-1 md:col-span-4 space-y-2">
                  <Label htmlFor="complemento" className="text-slate-700 dark:text-slate-300">Complemento</Label>
                  <Input
                    id="complemento"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    placeholder="Sala, Andar, etc."
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-1 md:col-span-4 space-y-2">
                  <Label htmlFor="bairro" className="text-slate-700 dark:text-slate-300">Bairro</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    placeholder="Bairro"
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-1 md:col-span-6 space-y-2">
                  <Label htmlFor="cidade" className="text-slate-700 dark:text-slate-300">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    placeholder="Município"
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="estado" className="text-slate-700 dark:text-slate-300">UF</Label>
                  <Input
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    maxLength={2}
                    placeholder="SP, RJ, etc."
                    className="uppercase bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="border-t pt-6 mt-6 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium mb-4 text-slate-900 dark:text-white">Informações Adicionais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cnae" className="text-slate-700 dark:text-slate-300">CNAE</Label>
                  <Input
                    id="cnae"
                    name="cnae"
                    value={formData.cnae}
                    onChange={handleChange}
                    placeholder="Código CNAE"
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situacao_cadastral" className="text-slate-700 dark:text-slate-300">
                    Situação Cadastral
                  </Label>
                  <Input
                    id="situacao_cadastral"
                    name="situacao_cadastral"
                    value={formData.situacao_cadastral}
                    onChange={handleChange}
                    placeholder="Ex: Ativa"
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="border-t pt-6 mt-6 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-medium mb-4 text-slate-900 dark:text-white">Observações</h3>
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-slate-700 dark:text-slate-300">
                  Observações Gerais
                </Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Anotações adicionais sobre o cliente"
                  rows={4}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="flex justify-between items-center pt-6 border-t mt-6 border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 'ativo'}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, status: checked ? 'ativo' : 'inativo' }))
                  }
                />
                <Label htmlFor="status" className="text-slate-700 dark:text-slate-300">
                  Cadastro Ativo
                </Label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/clientes-bpo/cadastro-clientes')}
                  disabled={loading}
                  className="border-slate-300 dark:border-slate-700"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Cliente BPO
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BPOClientesCadastroForm;