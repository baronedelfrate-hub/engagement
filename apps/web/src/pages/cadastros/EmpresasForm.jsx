import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Save, ArrowLeft, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { erpServices } from '@/lib/erpServices';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import FileUploader from '@/components/FileUploader';

const EmpresasForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    email: '',
    telefone: '',
    site: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: true,
    logo: '',
    logo_path: '' 
  });

  useEffect(() => {
    if (isEditing) {
      loadData();
    }
  }, [id, isEditing]);

  const loadData = async () => {
      setLoading(true);
      try {
          const { success, data, error } = await erpServices.empresas.read(id);
          if (success) {
              setFormData(data);
          } else {
              toast({ title: 'Erro', description: error || 'Empresa não encontrada', variant: 'destructive' });
              navigate('/cadastros/empresas');
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (checked) => {
    setFormData(prev => ({ ...prev, ativo: checked }));
  };

  const handleLogoUpload = (url, path) => {
    setFormData(prev => ({ ...prev, logo: url, logo_path: path }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.razao_social || !formData.cnpj) {
      toast({ title: 'Erro', description: 'Campos obrigatórios faltando (Razão Social, CNPJ).', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await erpServices.empresas.update(id, formData);
      } else {
        result = await erpServices.empresas.create(formData);
      }

      if (result.success) {
          toast({ title: 'Sucesso', description: `Empresa ${isEditing ? 'atualizada' : 'cadastrada'} com sucesso.` });
          navigate('/cadastros/empresas');
      } else {
          throw new Error(result.error);
      }
    } catch (error) {
      toast({ title: 'Erro', description: error.message || 'Falha ao salvar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>{isEditing ? 'Editar Empresa' : 'Nova Empresa'} | ERP</title></Helmet>
      <PageHeader 
        title={isEditing ? 'Editar Empresa' : 'Nova Empresa'}
        description="Preencha os dados cadastrais da organização."
        showBack={true}
        action={
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate('/cadastros/empresas')}>Cancelar</Button>
             <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
               <Save className="h-4 w-4 mr-2" /> Salvar Registro
             </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted">
            <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
            <TabsTrigger value="endereco">Endereço & Contato</TabsTrigger>
            <TabsTrigger value="config">Visual & Status</TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            <Card>
              <CardHeader><CardTitle>Informações Legais</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social *</Label>
                  <Input id="razao_social" name="razao_social" value={formData.razao_social} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                  <Input id="nome_fantasia" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input id="cnpj" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                  <Input id="inscricao_estadual" name="inscricao_estadual" value={formData.inscricao_estadual} onChange={handleChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endereco">
            <Card>
              <CardHeader><CardTitle>Localização e Contato</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label htmlFor="email">Email Corporativo</Label>
                    <Input id="email" type="email" name="email" value={formData.email} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" name="telefone" value={formData.telefone} onChange={handleChange} />
                  </div>
                </div>
                
                <div className="border-t border-border/50 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" name="cep" value={formData.cep} onChange={handleChange} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="logradouro">Logradouro</Label>
                      <Input id="logradouro" name="logradouro" value={formData.logradouro} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" name="numero" value={formData.numero} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input id="bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input id="cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado (UF)</Label>
                      <Input id="estado" name="estado" value={formData.estado} onChange={handleChange} maxLength={2} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardHeader><CardTitle>Configurações e Identidade</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                
                <div className="bg-muted p-6 rounded-lg border border-border">
                  <Label className="mb-4 block text-base">Logotipo da Empresa</Label>
                  <div className="max-w-sm">
                    <FileUploader 
                      type="logo"
                      currentUrl={formData.logo}
                      currentPath={formData.logo_path}
                      onUploadComplete={handleLogoUpload}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-4 border rounded-lg border-border bg-muted/50">
                   <Checkbox 
                      id="ativo" 
                      checked={formData.ativo} 
                      onCheckedChange={handleCheckbox}
                   />
                   <div className="grid gap-1.5 leading-none">
                     <Label htmlFor="ativo" className="cursor-pointer">Cadastro Ativo</Label>
                     <p className="text-sm text-muted-foreground">
                       Desative para ocultar esta empresa em novos lançamentos.
                     </p>
                   </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </>
  );
};

export default EmpresasForm;