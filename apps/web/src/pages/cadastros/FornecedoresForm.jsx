import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, Truck } from 'lucide-react';
import CnpjInput from '@/components/CnpjInput';
import { formatCnpj, unformatCnpj } from '@/lib/cnpjUtils';
import { validateNumericField, validateCNPJ } from '@/lib/validationUtils';
import { TIPOS_PIX } from '@/lib/chavePix';

const FornecedoresForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    fantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    tipo_fornecedor: 'PJ',
    status: 'ativo',
    cnae_principal: '',
    situacao_cadastral: '',
    tipo_chave_pix: '',
    chave_pix: ''
  });

  useEffect(() => {
    if (id && id !== 'novo') {
      setLoading(true);
      erpServices.fornecedores.read(id).then(res => {
        if (res.success) {
          setFormData({
            ...res.data,
            // Ensure fields exist to avoid uncontrolled inputs
            fantasia: res.data.fantasia || '',
            numero: res.data.numero !== null && res.data.numero !== undefined ? res.data.numero.toString() : '',
            complemento: res.data.complemento || '',
            tipo_chave_pix: res.data.tipo_chave_pix || '',
            chave_pix: res.data.chave_pix || '',
            bairro: res.data.bairro || '',
            cnae_principal: res.data.cnae_principal || '',
            situacao_cadastral: res.data.situacao_cadastral !== null && res.data.situacao_cadastral !== undefined ? res.data.situacao_cadastral.toString() : '',
            tipo_fornecedor: res.data.cnpj && unformatCnpj(res.data.cnpj).length === 11 ? 'PF' : 'PJ'
          });
        } else {
          toast({ title: 'Erro', description: 'Erro ao carregar dados do fornecedor.', variant: 'destructive' });
          navigate('/cadastros/fornecedores');
        }
        setLoading(false);
      });
    }
  }, [id, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCnpjDataFound = (data) => {
    setFormData(prev => ({
      ...prev,
      nome: data.razao_social || '',
      fantasia: data.nome_fantasia || '',
      cnpj: formatCnpj(data.cnpj),
      email: data.email || prev.email,
      telefone: data.telefone || prev.telefone,
      cep: data.cep || '',
      endereco: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      estado: data.uf || '',
      cnae_principal: data.cnae_principal || '',
      situacao_cadastral: data.situacao_cadastral !== undefined ? data.situacao_cadastral.toString() : '',
      tipo_fornecedor: 'PJ'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.nome || !formData.cnpj) {
      toast({ title: 'Aviso', description: 'Preencha Nome/Razão Social e CPF/CNPJ.', variant: 'destructive' });
      return;
    }

    if (!validateCNPJ(formData.cnpj)) {
      toast({ title: 'Aviso', description: 'O CPF ou CNPJ informado é inválido.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nome: formData.nome,
        fantasia: formData.fantasia,
        cnpj: unformatCnpj(formData.cnpj),
        email: formData.email,
        telefone: formData.telefone,
        tipo_chave_pix: formData.chave_pix ? (formData.tipo_chave_pix || null) : null,
        chave_pix: formData.chave_pix ? formData.chave_pix.trim() : null,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: validateNumericField(formData.numero),
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        status: formData.status,
        cnae_principal: formData.cnae_principal,
        situacao_cadastral: validateNumericField(formData.situacao_cadastral)
      };

      const res = (id && id !== 'novo')
        ? await erpServices.fornecedores.update(id, payload) 
        : await erpServices.fornecedores.create(payload);

      if (res.success) {
        toast({ title: 'Sucesso', description: 'Fornecedor salvo com sucesso.', variant: 'success' });
        navigate('/cadastros/fornecedores');
      } else {
        toast({ title: 'Erro', description: res.error, variant: 'destructive' });
      }
    } catch(err) {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao salvar.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 text-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/fornecedores')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{id && id !== 'novo' ? "Editar Fornecedor" : "Novo Fornecedor"}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Dados Cadastrais
          </CardTitle>
          <CardDescription>
            Informações do fornecedor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Razão Social / Nome Completo *</Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fantasia">Nome Fantasia</Label>
                <Input
                  id="fantasia"
                  name="fantasia"
                  value={formData.fantasia}
                  onChange={handleChange}
                  placeholder="Nome fantasia (se aplicável)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CPF / CNPJ *</Label>
                <CnpjInput
                  id="cnpj"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  onDataFound={handleCnpjDataFound}
                  auto={!id || id === 'novo'}
                  required
                  placeholder={formData.tipo_fornecedor === 'PJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_fornecedor">Tipo de Fornecedor</Label>
                <Select 
                  value={formData.tipo_fornecedor} 
                  onValueChange={(val) => handleSelectChange('tipo_fornecedor', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_chave_pix">Tipo da chave Pix</Label>
                <Select value={formData.tipo_chave_pix || 'nenhum'} onValueChange={(val) => handleSelectChange('tipo_chave_pix', val === 'nenhum' ? '' : val)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem chave Pix</SelectItem>
                    {TIPOS_PIX.map((t) => <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chave_pix">Chave Pix</Label>
                <Input id="chave_pix" name="chave_pix" value={formData.chave_pix} onChange={handleChange} placeholder="Chave para pagar este fornecedor" />
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="col-span-1 md:col-span-3 space-y-2">
                        <Label htmlFor="cep">CEP</Label>
                        <Input
                            id="cep"
                            name="cep"
                            value={formData.cep}
                            onChange={handleChange}
                            placeholder="00000-000"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-7 space-y-2">
                        <Label htmlFor="endereco">Logradouro</Label>
                        <Input
                            id="endereco"
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleChange}
                            placeholder="Rua, Avenida, etc."
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label htmlFor="numero">Número</Label>
                        <Input
                            id="numero"
                            name="numero"
                            type="number"
                            value={formData.numero}
                            onChange={handleChange}
                            placeholder="Ex: 123"
                        />
                    </div>

                    <div className="col-span-1 md:col-span-4 space-y-2">
                        <Label htmlFor="complemento">Complemento</Label>
                        <Input
                            id="complemento"
                            name="complemento"
                            value={formData.complemento}
                            onChange={handleChange}
                            placeholder="Ex: Sala 12, Bloco B"
                        />
                    </div>

                    <div className="col-span-1 md:col-span-4 space-y-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input
                            id="bairro"
                            name="bairro"
                            value={formData.bairro}
                            onChange={handleChange}
                            placeholder="Bairro"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-6 space-y-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input
                            id="cidade"
                            name="cidade"
                            value={formData.cidade}
                            onChange={handleChange}
                            placeholder="Município"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label htmlFor="estado">UF</Label>
                        <Input
                            id="estado"
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                            maxLength={2}
                            placeholder="SP, RJ, etc."
                            className="uppercase"
                        />
                    </div>
                </div>
            </div>

            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium mb-4">Informações Fiscais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="cnae_principal">CNAE Principal</Label>
                        <Input
                            id="cnae_principal"
                            name="cnae_principal"
                            value={formData.cnae_principal}
                            onChange={handleChange}
                            placeholder="Código CNAE"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="situacao_cadastral">Situação Cadastral (Código numérico)</Label>
                        <Input
                            id="situacao_cadastral"
                            name="situacao_cadastral"
                            type="number"
                            value={formData.situacao_cadastral}
                            onChange={handleChange}
                            placeholder="Ex: 2 (Ativa)"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t mt-6">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="status"
                        checked={formData.status === 'ativo'}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked ? 'ativo' : 'inativo' }))}
                    />
                    <Label htmlFor="status">Cadastro Ativo</Label>
                </div>

                <div className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/cadastros/fornecedores')}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Registro
                    </Button>
                </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FornecedoresForm;