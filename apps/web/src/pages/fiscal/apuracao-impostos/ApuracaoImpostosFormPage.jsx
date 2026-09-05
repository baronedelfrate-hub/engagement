import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Calculator, Save, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { apuracaoImpostosService } from '@/lib/apuracaoImpostosService';
import ApuracaoImpostosForm from './components/ApuracaoImpostosForm';

const INITIAL_STATE = {
  empresa_id: '',
  periodoRaw: '', // format YYYY-MM
  periodo_referencia: '', // format MM/YYYY
  tipo_imposto: 'ISS',
  base_calculo: 0,
  aliquota: 0,
  valor_apurado: 0,
  vencimento: '',
  status: 'Em aberto',
  observacoes: '',
  responsavel_conferencia_id: 'none'
};

export default function ApuracaoImpostosFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdowns, setDropdowns] = useState({ empresas: [], users: [] });

  useEffect(() => {
    fetchDropdowns();
    if (isEdit) loadData();
  }, [id, isEdit]);

  const fetchDropdowns = async () => {
    try {
      const [emp, usr] = await Promise.all([
        supabase.from('empresas').select('id, razao_social').eq('ativo', true),
        supabase.from('users').select('id, nome, email').eq('ativo', true)
      ]);
      setDropdowns({
        empresas: emp.data || [],
        users: usr.data || []
      });
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar opções.', variant: 'destructive' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apuracaoImpostosService.fetchApuracaoById(id);
      
      // Parse MM/YYYY back to YYYY-MM for the native input
      let raw = '';
      if (data.periodo_referencia) {
        const [mm, yyyy] = data.periodo_referencia.split('/');
        raw = `${yyyy}-${mm}`;
      }

      setFormData({
        ...data,
        periodoRaw: raw,
        responsavel_conferencia_id: data.responsavel_conferencia_id || 'none'
      });
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar apuração', variant: 'destructive' });
      navigate('/fiscal/apuracao-impostos');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const err = [];
    if (!formData.empresa_id) err.push('Empresa é obrigatória.');
    if (!formData.periodo_referencia) err.push('Período é obrigatório.');
    if (!formData.tipo_imposto) err.push('Tipo de imposto é obrigatório.');
    if (!formData.vencimento) err.push('Vencimento é obrigatório.');
    if (formData.base_calculo < 0) err.push('Base de cálculo inválida.');
    return err;
  };

  const handleSave = async () => {
    const errors = validate();
    if (errors.length > 0) {
      toast({ title: 'Verifique os erros:', description: errors.join('\n'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        responsavel_conferencia_id: formData.responsavel_conferencia_id === 'none' ? null : formData.responsavel_conferencia_id
      };
      delete payload.periodoRaw;
      delete payload.users;
      delete payload.apuracao_impostos_historico;
      delete payload.apuracao_impostos_origem;

      let newId;
      if (isEdit) {
        newId = await apuracaoImpostosService.updateApuracao(id, payload, null);
        toast({ title: 'Sucesso', description: 'Apuração atualizada.' });
      } else {
        const res = await apuracaoImpostosService.createApuracao(payload, null);
        newId = res.id;
        toast({ title: 'Sucesso', description: 'Apuração criada.' });
      }
      navigate(`/fiscal/apuracao-impostos/${newId}`);
    } catch (e) {
      toast({ title: 'Erro', description: e.message || 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <Helmet><title>{isEdit ? 'Editar Apuração' : 'Nova Apuração'} | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title={isEdit ? "Editar Apuração" : "Nova Apuração de Impostos"}
          description="Lançamento e cálculo manual de impostos."
          icon={Calculator}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'Apurações', href: '/fiscal/apuracao-impostos' },
            { label: isEdit ? 'Editar' : 'Nova' }
          ]}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/apuracao-impostos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      <ApuracaoImpostosForm 
        formData={formData} 
        setFormData={setFormData} 
        dropdowns={dropdowns} 
      />

    </div>
  );
}