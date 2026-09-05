import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, CalendarCheck } from 'lucide-react';
import { useFechamentoMensal } from '@/hooks/useFechamentoMensal';
import { validateClosingData } from '@/lib/fechamentoUtils';
import { useContabilidade } from '@/contexts/ContabilidadeContext';
import { supabase } from '@/lib/customSupabaseClient';

export default function FechamentoMensalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { createClosing, updateClosing, fetchClosingById, loading } = useFechamentoMensal();
  const { empresas } = useContabilidade();
  
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState({
    empresa_id: '',
    competencia: '',
    responsavel_id: '',
    status: 'Em aberto',
    observacoes_gerais: ''
  });
  const [originalStatus, setOriginalStatus] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadDependencies = async () => {
      const { data } = await supabase.from('users').select('id, nome').eq('ativo', true);
      if (data) setUsuarios(data);
    };
    loadDependencies();
  }, []);

  useEffect(() => {
    if (isEditing) {
      const loadClosing = async () => {
        const data = await fetchClosingById(id);
        if (data) {
          setFormData({
            empresa_id: data.empresa_id || '',
            competencia: data.competencia || '',
            responsavel_id: data.responsavel_id || '',
            status: data.status || 'Em aberto',
            observacoes_gerais: data.observacoes_gerais || ''
          });
          setOriginalStatus(data.status);
        }
      };
      loadClosing();
    }
  }, [id, isEditing, fetchClosingById]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateClosingData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (isEditing) {
      const success = await updateClosing(id, formData, null, originalStatus);
      if (success) navigate('/contabilidade/fechamento');
    } else {
      const success = await createClosing(formData, null);
      if (success) navigate(`/contabilidade/fechamento/${success.id}`);
    }
  };

  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6 pb-24">
      <Helmet><title>{isEditing ? 'Editar Fechamento' : 'Novo Fechamento'} | ERP Platform</title></Helmet>
      
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contabilidade/fechamento')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Fechamento Mensal' : 'Abrir Novo Fechamento Mensal'}</h1>
          <p className="text-sm text-slate-500">Configure os parâmetros base para o processo de fechamento.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            Dados do Fechamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Empresa <span className="text-red-500">*</span></Label>
              <Select value={formData.empresa_id} onValueChange={(v) => handleChange('empresa_id', v)}>
                <SelectTrigger className={`bg-white ${errors.empresa_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.empresa_id && <p className="text-xs text-red-500">{errors.empresa_id}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Competência (MM/YYYY) <span className="text-red-500">*</span></Label>
              <Input 
                type="month" 
                value={formData.competencia} 
                onChange={(e) => handleChange('competencia', e.target.value)}
                className={`bg-white ${errors.competencia ? 'border-red-500' : ''}`}
              />
              {errors.competencia && <p className="text-xs text-red-500">{errors.competencia}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Responsável <span className="text-red-500">*</span></Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => handleChange('responsavel_id', v)}>
                <SelectTrigger className={`bg-white ${errors.responsavel_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.responsavel_id && <p className="text-xs text-red-500">{errors.responsavel_id}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Status Inicial <span className="text-red-500">*</span></Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em aberto">Em aberto</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Aguardando contabilidade">Aguardando contabilidade</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Observações Gerais</Label>
            <Textarea 
              rows={4}
              value={formData.observacoes_gerais}
              onChange={(e) => handleChange('observacoes_gerais', e.target.value)}
              placeholder="Notas ou instruções gerais para este fechamento..."
              className="bg-white resize-none"
            />
          </div>

        </CardContent>
        <CardFooter className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/contabilidade/fechamento')}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditing ? 'Salvar Alterações' : 'Abrir Fechamento'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}