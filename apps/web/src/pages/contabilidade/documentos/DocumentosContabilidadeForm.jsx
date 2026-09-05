import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import FileUploader from '@/components/FileUploader';
import { FileText, Loader2, Save, ArrowLeft } from 'lucide-react';
import { DOCUMENT_TYPES } from './utils/documentosUtils';

export default function DocumentosContabilidadeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  
  const [formData, setFormData] = useState({
    empresa_id: '',
    competencia: new Date().toISOString().slice(0, 7),
    tipo: '',
    origem: 'Inclusão Manual',
    descricao: '',
    arquivo_url: '',
    observacoes: '',
    status: 'Pendente',
    data_inclusao: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true);
      if (data) setEmpresas(data);
    };
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchDoc = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('documentos_contabilidade').select('*').eq('id', id).single();
        if (data) {
          setFormData({
            ...data,
            observacoes: data.observacoes || ''
          });
        }
        setLoading(false);
      };
      fetchDoc();
    }
  }, [id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (url, path) => {
    setFormData(prev => ({ ...prev, arquivo_url: url }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.empresa_id || !formData.competencia || !formData.tipo || !formData.descricao) {
      toast({ title: 'Aviso', description: 'Preencha os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    if (!formData.arquivo_url && !id) {
      toast({ title: 'Aviso', description: 'Faça o upload do arquivo.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let docId = id;
      if (id) {
        const { error } = await supabase.from('documentos_contabilidade').update(formData).eq('id', id);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Documento atualizado com sucesso.' });
      } else {
        const payload = { ...formData, created_by: null };
        const { data, error } = await insertWithCompanyId('documentos_contabilidade', payload, {
          chain: (query) => query.select().single()
        });
        if (error) throw error;
        docId = data.id;
        
        await insertWithCompanyId('documentos_historico', {
          documento_id: docId,
          acao: 'Adicionado',
          status_novo: 'Pendente',
          usuario_id: null,
          observacoes: 'Inclusão manual de documento'
        });

        toast({ title: 'Sucesso', description: 'Documento cadastrado com sucesso.' });
      }
      navigate('/contabilidade/documentos');
    } catch (err) {
      console.error('Error saving document:', err);
      toast({ title: 'Erro', description: 'Falha ao salvar documento.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader 
        title={id ? "Editar Documento" : "Novo Documento Contábil"} 
        description="Envie ou atualize arquivos para o fechamento."
        icon={FileText}
        breadcrumbs={[
          { label: 'Contabilidade', href: '/contabilidade/dashboard' },
          { label: 'Documentos', href: '/contabilidade/documentos' },
          { label: id ? 'Editar' : 'Novo' }
        ]}
      />

      <Card className="border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg text-slate-800">Dados do Documento</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">Empresa *</Label>
                <Select value={formData.empresa_id} onValueChange={(v) => handleChange('empresa_id', v)}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a Empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Competência (Mês/Ano) *</Label>
                <Input 
                  type="month" 
                  value={formData.competencia}
                  onChange={(e) => handleChange('competencia', e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Tipo de Documento *</Label>
                <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o Tipo" /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Origem *</Label>
                <Input 
                  value={formData.origem}
                  onChange={(e) => handleChange('origem', e.target.value)}
                  className="bg-white"
                  placeholder="Ex: Departamento RH, Sistema ERP..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Descrição / Título do Documento *</Label>
              <Input 
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                className="bg-white"
                placeholder="Descreva o documento..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Arquivo Anexo {id ? '' : '*'}</Label>
              <FileUploader 
                type="documento"
                currentUrl={formData.arquivo_url}
                onUploadComplete={handleFileUpload}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Observações Extras</Label>
              <Textarea 
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                className="min-h-[100px] bg-white"
                placeholder="Notas para a contabilidade..."
              />
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate('/contabilidade/documentos')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Documento
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}