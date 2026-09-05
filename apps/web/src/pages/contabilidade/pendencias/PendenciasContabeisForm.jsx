import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { usePendenciasContabeis } from '@/contexts/PendenciasContabeisContext';
import { getStatusOptions, getTipoOptions } from '@/lib/pendenciasUtils';

export default function PendenciasContabeisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createPendencia, updatePendencia, getPendencia } = usePendenciasContabeis();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [empresas, setEmpresas] = useState([]);
  const [users, setUsers] = useState([]);

  const today = new Date();
  const [formData, setFormData] = useState({
    empresa_id: '',
    competencia: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    tipo: 'Documento faltante',
    descricao: '',
    origem: '',
    responsavel_id: 'none',
    prazo: new Date(today.setDate(today.getDate() + 5)).toISOString().split('T')[0],
    status: 'Aberta',
    observacoes: ''
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoading(true);
      const [empRes, usrRes] = await Promise.all([
        supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true),
        supabase.from('users').select('id, nome, email')
      ]);
      
      if (empRes.data) setEmpresas(empRes.data);
      if (usrRes.data) setUsers(usrRes.data);

      if (id) {
        const doc = await getPendencia(id);
        if (doc) {
          setFormData({
            ...doc,
            responsavel_id: doc.responsavel_id || 'none',
            observacoes: doc.observacoes || ''
          });
        }
      }
      setLoading(false);
    };
    fetchDependencies();
  }, [id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      ...formData, 
      responsavel_id: formData.responsavel_id === 'none' ? null : formData.responsavel_id 
    };

    let success = false;
    if (id) {
      success = await updatePendencia(id, payload);
    } else {
      success = await createPendencia(payload);
    }

    setSaving(false);
    if (success) {
      navigate('/contabilidade/pendencias');
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">{id ? "Editar Pendência" : "Nova Pendência Contábil"}</h2>
      </div>

      <form onSubmit={handleSave}>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg text-slate-800">Detalhes da Pendência</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">Empresa *</Label>
                <Select value={formData.empresa_id} onValueChange={(v) => handleChange('empresa_id', v)} required>
                  <SelectTrigger className="bg-white text-slate-900"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Competência (Mês/Ano) *</Label>
                <Input 
                  type="month" 
                  value={formData.competencia}
                  onChange={(e) => handleChange('competencia', e.target.value)}
                  className="bg-white text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">Tipo de Pendência *</Label>
                <Select value={formData.tipo} onValueChange={(v) => handleChange('tipo', v)} required>
                  <SelectTrigger className="bg-white text-slate-900"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {getTipoOptions().map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Origem (Doc/Área) *</Label>
                <Input 
                  value={formData.origem}
                  onChange={(e) => handleChange('origem', e.target.value)}
                  className="bg-white text-slate-900"
                  placeholder="Ex: Banco Itaú, NF 1234..."
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Descrição Detalhada *</Label>
              <Textarea 
                value={formData.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                className="min-h-[100px] bg-white text-slate-900"
                placeholder="Descreva o problema ou solicitação..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">Responsável</Label>
                <Select value={formData.responsavel_id} onValueChange={(v) => handleChange('responsavel_id', v)}>
                  <SelectTrigger className="bg-white text-slate-900"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.nome || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Prazo de Resolução *</Label>
                <Input 
                  type="date" 
                  value={formData.prazo}
                  onChange={(e) => handleChange('prazo', e.target.value)}
                  className="bg-white text-slate-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Status *</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)} required>
                  <SelectTrigger className="bg-white text-slate-900"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {getStatusOptions().map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Observações Internas</Label>
              <Textarea 
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                className="min-h-[80px] bg-white text-slate-900"
                placeholder="Anotações para a equipe..."
              />
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate('/contabilidade/pendencias')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
              Salvar Pendência
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}