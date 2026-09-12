import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { validateCPF } from '@/lib/rhUtils';
import RHDependentesForm from '@/components/rh/RHDependentesForm';
import RHBeneficiariosForm from '@/components/rh/RHBeneficiariosForm';
import RHDocumentosUpload from '@/components/RHDocumentosUpload';

const RHFuncionariosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pessoais");

  const [formData, setFormData] = useState({
    nome_completo: '', cpf: '', rg: '', data_nascimento: '', sexo: '', estado_civil: '',
    rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '',
    telefone: '', celular: '', email: '',
    cargo: '', departamento: '', data_admissao: '', salario: '', tipo_contrato: 'CLT', jornada: '8h', status: 'Ativo'
  });

  useEffect(() => {
    if (id && id !== 'novo') loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('rh_funcionarios').select('*').eq('id', id).single();
    if (data) setFormData({ ...formData, ...data });
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateCPF(formData.cpf)) {
      toast({ title: "Erro de Validação", description: "CPF inválido.", variant: "destructive" });
      return;
    }
    if (!formData.nome_completo || !formData.data_admissao) {
      toast({ title: "Erro de Validação", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (id && id !== 'novo') {
        const { error } = await supabase.from('rh_funcionarios').update(formData).eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Funcionário atualizado com sucesso.", variant: "success" });
      } else {
        const { data, error } = await insertWithCompanyId('rh_funcionarios', formData, {
          chain: (query) => query.select().single()
        });
        if (error) throw error;
        toast({ title: "Sucesso", description: "Funcionário criado com sucesso.", variant: "success" });
        navigate(`/rh/funcionarios/${data.id}/editar`);
        return; 
      }
      navigate('/rh/funcionarios');
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isNew = !id || id === 'novo';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Helmet><title>{isNew ? 'Novo Funcionário' : 'Editar Funcionário'} - RH</title></Helmet>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/rh/funcionarios')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-bold">{isNew ? 'Novo Funcionário' : 'Editar Funcionário'}</h1>
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="contato">Contato</TabsTrigger>
          <TabsTrigger value="profissional">Profissional</TabsTrigger>
          <TabsTrigger value="dependentes" disabled={isNew}>Dependentes</TabsTrigger>
          <TabsTrigger value="documentos" disabled={isNew}>Documentos</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-6">
          <TabsContent value="pessoais" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome Completo *</Label><Input name="nome_completo" value={formData.nome_completo} onChange={handleChange} required /></div>
              <div className="space-y-2"><Label>CPF *</Label><Input name="cpf" value={formData.cpf} onChange={handleChange} required placeholder="Apenas números" /></div>
              <div className="space-y-2"><Label>RG</Label><Input name="rg" value={formData.rg || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" name="data_nascimento" value={formData.data_nascimento || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Sexo</Label>
                <Select value={formData.sexo || ''} onValueChange={v => handleSelectChange('sexo', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Estado Civil</Label>
                <Select value={formData.estado_civil || ''} onValueChange={v => handleSelectChange('estado_civil', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="endereco" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CEP</Label><Input name="cep" value={formData.cep || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Rua/Logradouro</Label><Input name="rua" value={formData.rua || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Número</Label><Input name="numero" value={formData.numero || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Complemento</Label><Input name="complemento" value={formData.complemento || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Bairro</Label><Input name="bairro" value={formData.bairro || ''} onChange={handleChange} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Cidade</Label><Input name="cidade" value={formData.cidade || ''} onChange={handleChange} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input name="estado" value={formData.estado || ''} onChange={handleChange} /></div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contato" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Celular</Label><Input name="celular" value={formData.celular || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Telefone Fixo</Label><Input name="telefone" value={formData.telefone || ''} onChange={handleChange} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" name="email" value={formData.email || ''} onChange={handleChange} /></div>
            </div>
          </TabsContent>

          <TabsContent value="profissional" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Admissão *</Label><Input type="date" name="data_admissao" value={formData.data_admissao || ''} onChange={handleChange} required /></div>
              <div className="space-y-2"><Label>Cargo</Label><Input name="cargo" value={formData.cargo || ''} onChange={handleChange} placeholder="Ex: Analista Financeiro Jr." /></div>
              <div className="space-y-2"><Label>Departamento</Label><Input name="departamento" value={formData.departamento || ''} onChange={handleChange} placeholder="Ex: Financeiro" /></div>
              <div className="space-y-2"><Label>Salário (R$)</Label><Input type="number" step="0.01" name="salario" value={formData.salario || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label>Tipo de Contrato</Label>
                <Select value={formData.tipo_contrato || 'CLT'} onValueChange={v => handleSelectChange('tipo_contrato', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="Estagiário">Estagiário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Status</Label>
                <Select value={formData.status || 'Ativo'} onValueChange={v => handleSelectChange('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Férias">Férias</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </form>

        <TabsContent value="dependentes" className="space-y-6 mt-4">
          {!isNew && (
            <>
              <div><h3 className="text-lg font-medium mb-4">Dependentes</h3><RHDependentesForm funcionarioId={id} /></div>
              <div className="border-t pt-6"><h3 className="text-lg font-medium mb-4">Beneficiários</h3><RHBeneficiariosForm funcionarioId={id} /></div>
            </>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="space-y-6 mt-4">
          {!isNew && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card><CardContent className="p-4"><h4 className="font-medium mb-2">RG / CNH</h4><RHDocumentosUpload funcionarioId={id} tipoDocumento="Identidade" /></CardContent></Card>
              <Card><CardContent className="p-4"><h4 className="font-medium mb-2">CPF</h4><RHDocumentosUpload funcionarioId={id} tipoDocumento="CPF" /></CardContent></Card>
              <Card><CardContent className="p-4"><h4 className="font-medium mb-2">Comprovante de Endereço</h4><RHDocumentosUpload funcionarioId={id} tipoDocumento="Endereço" /></CardContent></Card>
              <Card><CardContent className="p-4"><h4 className="font-medium mb-2">Carteira de Trabalho (CTPS)</h4><RHDocumentosUpload funcionarioId={id} tipoDocumento="CTPS" /></CardContent></Card>
              <Card><CardContent className="p-4"><h4 className="font-medium mb-2">Certidões / Outros</h4><RHDocumentosUpload funcionarioId={id} tipoDocumento="Outros" /></CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RHFuncionariosForm;