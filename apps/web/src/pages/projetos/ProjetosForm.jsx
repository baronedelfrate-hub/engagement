import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClientesDropdown } from '@/hooks/useClientesDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/customSupabaseClient';
import { resolveCompanyId } from '@/lib/companyUtils';

export default function ProjetosForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id && id !== 'novo');
  
  const { clientes, isLoading: loadingClientes, error: clientesError } = useClientesDropdown();
  
  const [loading, setLoading] = useState(false);
  const [resolvedCompanyId, setResolvedCompanyId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cliente_id: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    orcamento: '',
    status: 'Planejamento'
  });

  // Resolve company_id on mount
  useEffect(() => {
    const initCompanyId = async () => {
      const cid = await resolveCompanyId(null);
      setResolvedCompanyId(cid);
    };
    initCompanyId();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const fetchProjeto = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('projetos').select('*').eq('id', id).single();
            if (error) throw error;
            
            if (data) {
                setFormData({
                    nome: data.nome || '',
                    cliente_id: data.cliente_id || '',
                    descricao: data.descricao || '',
                    data_inicio: data.data_inicio || '',
                    data_fim: data.data_fim || '',
                    orcamento: data.orcamento || '',
                    status: data.status || 'Planejamento'
                });
            }
        } catch (error) {
            console.error("❌ [ProjetosForm] Erro ao buscar projeto:", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro', 
                description: 'Projeto não encontrado.' 
            });
            navigate('/projetos');
        } finally {
            setLoading(false);
        }
      };
      fetchProjeto();
    }
  }, [id, isEdit, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cliente_id || !formData.data_inicio || !formData.data_fim || !formData.status || !formData.orcamento) {
      toast({ 
        variant: 'destructive', 
        title: 'Campos Obrigatórios', 
        description: 'Preencha todos os campos obrigatórios (Nome, Cliente, Data Início, Data Fim, Orçamento, Status).' 
      });
      return;
    }

    if (new Date(formData.data_fim) < new Date(formData.data_inicio)) {
        toast({ 
            variant: "destructive", 
            title: "Erro de Validação", 
            description: "A data de término não pode ser anterior à data de início." 
        });
        return;
    }

    // Ensure company_id before saving
    let finalCompanyId = resolvedCompanyId;
    if (!finalCompanyId) {
        console.warn("⚠️ [ProjetosForm] resolvedCompanyId vazio no submit. Tentando resolver novamente...");
        finalCompanyId = await resolveCompanyId(null);
        if (!finalCompanyId) {
            toast({
                variant: "destructive",
                title: "Erro Crítico",
                description: "Não foi possível identificar a empresa vinculada (company_id nulo). Atualize a página ou contate o suporte."
            });
            return;
        }
    }

    setLoading(true);

    const payload = { 
      nome: formData.nome,
      cliente_id: formData.cliente_id,
      status: formData.status,
      company_id: finalCompanyId,
      created_by: null
    };
    
    if (formData.descricao) payload.descricao = formData.descricao;
    if (formData.data_inicio) payload.data_inicio = formData.data_inicio;
    if (formData.data_fim) payload.data_fim = formData.data_fim;
    if (formData.orcamento) payload.orcamento = parseFloat(formData.orcamento);
    
    console.log("🚀 [ProjetosForm] PAYLOAD COMPLETO ANTES DO INSERT/UPDATE:", JSON.stringify(payload, null, 2));

    try {
        let result;
        if (isEdit) {
            result = await supabase.from('projetos').update(payload).eq('id', id).select();
        } else {
            result = await supabase.from('projetos').insert([payload]).select();
        }

        if (result.error) {
            console.error("❌ [ProjetosForm] Erro do Supabase:", result.error);
            throw result.error;
        }

        console.log("✅ [ProjetosForm] Operação bem sucedida. Dados retornados:", result.data);

        toast({
            title: 'Sucesso!',
            description: `Projeto ${isEdit ? 'atualizado' : 'criado'} com sucesso.`,
        });
        
        navigate('/projetos', { replace: true });
    } catch (err) {
        console.error("❌ [ProjetosForm] Erro fatal capturado no catch:", err);
        
        let errorMessage = err.message || 'Ocorreu um erro inesperado ao salvar o projeto.';
        if (err.details) errorMessage += ` Detalhes: ${err.details}`;
        if (err.hint) errorMessage += ` Dica: ${err.hint}`;

        toast({ 
            variant: 'destructive', 
            title: 'Erro ao Salvar', 
            description: errorMessage 
        });
    } finally {
        setLoading(false);
    }
  };

  const getClientSelectState = () => {
      if (loadingClientes) return { disabled: true, placeholder: "Carregando clientes...", showSpinner: true, className: "bg-muted/50 cursor-wait" };
      if (clientesError) return { disabled: true, placeholder: "Erro ao carregar clientes", showSpinner: false, className: "bg-destructive/10 border-destructive cursor-not-allowed" };
      if (clientes.length === 0) return { disabled: true, placeholder: "Nenhum cliente cadastrado", showSpinner: false, className: "bg-yellow-50 border-yellow-300 cursor-not-allowed" };
      return { disabled: false, placeholder: "Selecione o Cliente", showSpinner: false, className: "" };
  };

  const clientSelectState = getClientSelectState();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      
      {/* Debug Info apenas em localhost */}
      {window.location.hostname === 'localhost' && (
          <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="py-3">
                  <CardTitle className="text-sm font-mono text-emerald-400">🐛 Debug Info: ProjetosForm</CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                  <pre className="text-xs text-slate-300 overflow-auto whitespace-pre-wrap">
                      {JSON.stringify({
                          resolvedCompanyId,
                          localStorageCompanyId: localStorage.getItem('company_id'),
                          payloadPreview: { ...formData, company_id: resolvedCompanyId }
                      }, null, 2)}
                  </pre>
              </CardContent>
          </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isEdit ? 'Editar Projeto' : 'Novo Projeto'}</CardTitle>
          <CardDescription>
            {isEdit ? 'Atualize as informações do projeto' : 'Preencha os dados do novo projeto'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {clientesError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro ao Carregar Clientes</AlertTitle>
                    <AlertDescription>{clientesError}</AlertDescription>
                </Alert>
            )}

            {!loadingClientes && !clientesError && clientes.length === 0 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Nenhum Cliente Cadastrado</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                        Você precisa cadastrar pelo menos um cliente antes de criar um projeto.{' '}
                        <Button variant="link" className="p-0 h-auto text-yellow-800 underline" onClick={() => navigate('/cadastros/clientes/novo')}>
                            Clique aqui para cadastrar
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Projeto *</Label>
                <Input id="nome" name="nome" value={formData.nome} onChange={handleChange} required placeholder="Ex: Implantação Sistema ERP" className="text-slate-900 dark:text-slate-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente *</Label>
                {loadingClientes ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <Select value={formData.cliente_id} onValueChange={(val) => handleSelectChange('cliente_id', val)} disabled={clientSelectState.disabled} required>
                      <SelectTrigger id="cliente_id" className={clientSelectState.className}>
                        {clientSelectState.showSpinner && <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />}
                        <SelectValue placeholder={clientSelectState.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data de Início *</Label>
                <Input type="date" id="data_inicio" name="data_inicio" value={formData.data_inicio} onChange={handleChange} required className="text-slate-900 dark:text-slate-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data de Término *</Label>
                <Input type="date" id="data_fim" name="data_fim" value={formData.data_fim} onChange={handleChange} required className="text-slate-900 dark:text-slate-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orcamento">Orçamento Total (R$) *</Label>
                <Input type="number" step="0.01" id="orcamento" name="orcamento" value={formData.orcamento} onChange={handleChange} required placeholder="0.00" className="text-slate-900 dark:text-slate-100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)} required>
                  <SelectTrigger id="status"><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Planejamento">Planejamento</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição / Escopo do Projeto</Label>
              <Textarea id="descricao" name="descricao" value={formData.descricao} onChange={handleChange} rows={4} placeholder="Detalhes adicionais..." className="text-slate-900 dark:text-slate-100" />
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/projetos')} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading || clientSelectState.disabled || !resolvedCompanyId}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Salvar Alterações' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}