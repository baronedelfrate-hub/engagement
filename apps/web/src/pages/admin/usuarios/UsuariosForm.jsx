import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Save, AlertCircle, Mail, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  criarUsuario, 
  atualizarUsuario, 
  buscarTodasEmpresas,
  listarUsuarios
} from '@/services/admin/usuariosService';

const UsuariosForm = ({ mode, userId }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(mode === 'edit');
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmar_senha: '',
    company_id: '',
    role: '',
    status: 'ativo'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadDependencies();
  }, [mode, userId]);

  const loadDependencies = async () => {
    try {
      setCompaniesLoading(true);
      const empresas = await buscarTodasEmpresas();
      setCompanies(empresas);
      setCompaniesLoading(false);

      if (mode === 'edit' && userId) {
        const users = await listarUsuarios();
        const user = users.find(u => u.id === userId);
        
        if (user) {
          setFormData({
            nome: user.nome || '',
            email: user.email || '',
            senha: '',
            confirmar_senha: '',
            company_id: user.company_id || '',
            role: user.role || '',
            status: user.banned_until ? 'inativo' : 'ativo'
          });
        } else {
          toast({ variant: "destructive", title: "Usuário não encontrado" });
          navigate('/admin/usuarios');
        }
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: error.message });
      setCompaniesLoading(false);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = 'E-mail inválido';
    if (!formData.company_id) newErrors.company_id = 'Empresa é obrigatória';
    if (!formData.role) newErrors.role = 'Perfil é obrigatório';

    if (formData.senha || formData.confirmar_senha) {
      if (!formData.senha) newErrors.senha = 'Preencha a senha';
      if (!formData.confirmar_senha) newErrors.confirmar_senha = 'Confirme a senha';
      if (formData.senha && formData.confirmar_senha && formData.senha !== formData.confirmar_senha) {
        newErrors.confirmar_senha = 'As senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "Verifique os campos destacados e tente novamente."
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await criarUsuario(
          formData.email,
          formData.senha,
          formData.nome,
          formData.company_id,
          formData.role
        );
        
        toast({ 
          title: "Sucesso", 
          description: formData.senha 
            ? "Usuário criado com sucesso!" 
            : `Convite enviado para ${formData.email}` 
        });

        // Clear password fields after success
        setFormData(prev => ({ ...prev, senha: '', confirmar_senha: '' }));
      } else {
        await atualizarUsuario(userId, formData);
        
        if (formData.status === 'inativo') {
          toast({ 
            title: "Atenção", 
            description: "O usuário foi atualizado. Para desativar o acesso de vez, use o botão Desativar na listagem caso necessário." 
          });
        } else {
          toast({ title: "Sucesso", description: "Usuário atualizado com sucesso!" });
        }
      }
      
      navigate('/admin/usuarios');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro inesperado."
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando informações...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/usuarios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {mode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Dados do Usuário</CardTitle>
            <CardDescription>
              {mode === 'create' 
                ? 'Preencha os dados do usuário. Você pode definir uma senha agora ou deixá-la em branco para enviar um link de convite.' 
                : 'Atualize os dados de perfil do usuário.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo <span className="text-destructive">*</span></Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: João da Silva"
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={mode === 'edit'}
                  placeholder="joao@empresa.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_id">Empresa <span className="text-destructive">*</span></Label>
                {companiesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : companies.length === 0 ? (
                  <div className="flex items-center p-2 rounded border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Nenhuma empresa encontrada
                  </div>
                ) : (
                  <Select value={formData.company_id} onValueChange={(v) => handleSelectChange('company_id', v)}>
                    <SelectTrigger className={errors.company_id ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.company_id && <p className="text-xs text-destructive">{errors.company_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil / Time <span className="text-destructive">*</span></Label>
                <Select value={formData.role} onValueChange={(v) => handleSelectChange('role', v)}>
                  <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              </div>

              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha (Opcional)</Label>
                    <Input
                      id="senha"
                      name="senha"
                      type="password"
                      value={formData.senha}
                      onChange={handleChange}
                      placeholder="Deixe em branco para convite"
                      className={errors.senha ? 'border-destructive' : ''}
                    />
                    {errors.senha && <p className="text-xs text-destructive">{errors.senha}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmar_senha">Confirmar Senha</Label>
                    <Input
                      id="confirmar_senha"
                      name="confirmar_senha"
                      type="password"
                      value={formData.confirmar_senha}
                      onChange={handleChange}
                      className={errors.confirmar_senha ? 'border-destructive' : ''}
                    />
                    {errors.confirmar_senha && <p className="text-xs text-destructive">{errors.confirmar_senha}</p>}
                  </div>
                </>
              )}

              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t bg-muted/20 px-6 py-4">
            <Button variant="outline" type="button" onClick={() => navigate('/admin/usuarios')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'create' ? (
                formData.senha ? <UserPlus className="h-4 w-4" /> : <Mail className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {mode === 'create' 
                ? (formData.senha ? 'Criar Usuário' : 'Enviar Convite') 
                : 'Salvar Alterações'
              }
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default UsuariosForm;