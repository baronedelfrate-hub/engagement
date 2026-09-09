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
      <div className="flex justify-center items-center h-screen bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 bg-muted min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground mb-4">
        <span 
          className="font-medium text-foreground cursor-pointer hover:underline" 
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
        <span className="text-foreground font-medium">
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
            className="border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
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
      <Card className="shadow-lg border-border">
        <CardHeader className="border-b border-border bg-muted">
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Dados Cadastrais
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-muted-foreground">
            Informações principais do cliente BPO
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-foreground">
                  Nome / Razão Social *
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  placeholder="Nome do cliente"
                  className="bg-background border-border text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf" className="text-foreground">
                  CNPJ / CPF
                </Label>
                <Input
                  id="cnpj_cpf"
                  name="cnpj_cpf"
                  value={formData.cnpj_cpf}
                  onChange={handleChange}
                  placeholder="Apenas números ou formatado"
                  className="bg-background border-border text-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com"
                  className="bg-background border-border text-foreground"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-foreground">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="border-t pt-6 mt-6 border-border">
              <h3 className="text-lg font-medium mb-4 text-foreground dark:text-white">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="col-span-1 md:col-span-3 space-y-2">
                  <Label htmlFor="cep" className="text-foreground">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    placeholder="00000-000"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="col-span-1 md:col-span-7 space-y-2">
                  <Label htmlFor="endereco" className="text-foreground">Logradouro</Label>
                  <Input
                    id="endereco"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    placeholder="Rua, Avenida, etc."
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="numero" className="text-foreground">Número</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Ex: 123"
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div className="col-span-1 md:col-span-4 space-y-2">
                  <Label htmlFor="complemento" className="text-foreground">Complemento</Label>
                  <Input
                    id="complemento"
                    name="complemento"
                    value={formData.complemento}
                    onChange={handleChange}
                    placeholder="Sala, Andar, etc."
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="col-span-1 md:col-span-4 space-y-2">
                  <Label htmlFor="bairro" className="text-foreground">Bairro</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    placeholder="Bairro"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="col-span-1 md:col-span-6 space-y-2">
                  <Label htmlFor="cidade" className="text-foreground">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    placeholder="Município"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <Label htmlFor="estado" className="text-foreground">UF</Label>
                  <Input
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    maxLength={2}
                    placeholder="SP, RJ, etc."
                    className="uppercase bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="border-t pt-6 mt-6 border-border">
              <h3 className="text-lg font-medium mb-4 text-foreground dark:text-white">Informações Adicionais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cnae" className="text-foreground">CNAE</Label>
                  <Input
                    id="cnae"
                    name="cnae"
                    value={formData.cnae}
                    onChange={handleChange}
                    placeholder="Código CNAE"
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="situacao_cadastral" className="text-foreground">
                    Situação Cadastral
                  </Label>
                  <Input
                    id="situacao_cadastral"
                    name="situacao_cadastral"
                    value={formData.situacao_cadastral}
                    onChange={handleChange}
                    placeholder="Ex: Ativa"
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Observations */}
            <div className="border-t pt-6 mt-6 border-border">
              <h3 className="text-lg font-medium mb-4 text-foreground dark:text-white">Observações</h3>
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-foreground">
                  Observações Gerais
                </Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Anotações adicionais sobre o cliente"
                  rows={4}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="flex justify-between items-center pt-6 border-t mt-6 border-border">
              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 'ativo'}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, status: checked ? 'ativo' : 'inativo' }))
                  }
                />
                <Label htmlFor="status" className="text-foreground">
                  Cadastro Ativo
                </Label>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/clientes-bpo/cadastro-clientes')}
                  disabled={loading}
                  className="border-border"
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