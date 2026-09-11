import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, GitMerge } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useConciliacoesContabeis } from '@/hooks/useConciliacoesContabeis';
import { useContabilidade } from '@/contexts/ContabilidadeContext';

export default function ConciliacoesContabeisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { loading, createConciliacao, updateConciliacao, fetchConciliacaoById } = useConciliacoesContabeis();
  const { empresas } = useContabilidade();

  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState({
    empresa_id: '',
    tipo: 'Bancária',
    status: 'Pendente',
    data_criacao: new Date().toISOString().split('T')[0],
    responsavel_id: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadUsuarios = async () => {
      const { data } = await supabase.from('users').select('id, nome').eq('ativo', true);
      if (data) setUsuarios(data);
    };
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (isEditing) {
      const load = async () => {
        const data = await fetchConciliacaoById(id);
        if (data) {
          setFormData({
            empresa_id: data.empresa_id || '',
            tipo: data.tipo || 'Bancária',
            status: data.status || 'Pendente',
            data_criacao: data.data_criacao || new Date().toISOString().split('T')[0],
            responsavel_id: data.responsavel_id || '',
          });
        }
      };
      load();
    }
  }, [id, isEditing, fetchConciliacaoById]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.empresa_id) newErrors.empresa_id = 'Selecione a empresa.';
    if (!formData.data_criacao) newErrors.data_criacao = 'Informe a data.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const success = isEditing
      ? await updateConciliacao(id, formData)
      : await createConciliacao(formData);

    if (success) navigate('/contabilidade/conciliacoes');
  };

  return (
    <div className="p-6 max-w-[700px] mx-auto space-y-6 pb-24">
      <Helmet><title>{isEditing ? 'Editar' : 'Nova'} Conciliação | ERP Platform</title></Helmet>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contabilidade/conciliacoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEditing ? 'Editar Conciliação' : 'Nova Conciliação'}</h1>
          <p className="text-sm text-muted-foreground">Registre uma conciliação contábil para acompanhamento do fechamento.</p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-blue-600" />
            Dados da Conciliação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-foreground">Empresa <span className="text-red-500">*</span></Label>
              <Select value={formData.empresa_id} onValueChange={(v) => handleChange('empresa_id', v)}>
                <SelectTrigger className={`bg-background ${errors.empresa_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.empresa_id && <p className="text-xs text-red-500">{errors.empresa_id}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Tipo <span className="text-red-500">*</span></Label>
              <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bancária">Bancária</SelectItem>
                  <SelectItem value="Fiscal">Fiscal</SelectItem>
                  <SelectItem value="Outras">Outras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Data de Criação <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.data_criacao}
                onChange={(e) => handleChange('data_criacao', e.target.value)}
                className={`bg-background ${errors.data_criacao ? 'border-red-500' : ''}`}
              />
              {errors.data_criacao && <p className="text-xs text-red-500">{errors.data_criacao}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Responsável</Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => handleChange('responsavel_id', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 bg-muted border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/contabilidade/conciliacoes')}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditing ? 'Salvar Alterações' : 'Registrar Conciliação'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
