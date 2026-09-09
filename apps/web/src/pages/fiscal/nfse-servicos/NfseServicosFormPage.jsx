import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Save, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { nfseServicosService } from './services/nfseServicosService';
import NfseServicosForm from './components/NfseServicosForm';
import { useNfseDropdowns } from '@/hooks/useNfseDropdowns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const INITIAL_STATE = {
  empresa_id: '', cliente_id: '', municipio_id: '', servico_id: '',
  numero: '', serie: '1', rps: '', data_emissao: new Date().toISOString().split('T')[0],
  codigo_servico: '', descricao_servico: '', quantidade: 1, valor_servico: 0,
  aliquota: 0, valor_imposto: 0, retencoes: 0, valor_liquido: 0,
  condicao_pagamento_id: '', observacoes: '', status: 'Em digitação',
  municipio_incidencia_iss_nome: '',
  municipio_incidencia_iss_uf: '',
  municipio_incidencia_iss_codigo_ibge: ''
};

const INITIAL_VINCULACOES = {
  pedido_venda_id: null,
  proposta_id: null,
  contrato_id: null
};

export default function NfseServicosFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const pedidoIdUrl = searchParams.get('pedido_id');
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [vinculacoes, setVinculacoes] = useState(INITIAL_VINCULACOES);
  
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const { dropdowns, loading: loadingDropdowns } = useNfseDropdowns();

  useEffect(() => {
    if (isEdit) {
      loadData();
    } else if (pedidoIdUrl) {
      loadPedidoData(pedidoIdUrl);
    }
  }, [id, isEdit, pedidoIdUrl]);

  const loadPedidoData = async (pedidoId) => {
    setLoadingData(true);
    try {
      console.log('Carregando dados do pedido:', pedidoId);
      const { data, error } = await supabase
        .from('pedidos_venda')
        .select(`
          *,
          clientes(id, cidade, estado),
          pedidos_venda_itens(
            *,
            servicos(nome, codigo_servico_lc116, aliquota_issqn)
          )
        `)
        .eq('id', pedidoId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        const servicos = data.pedidos_venda_itens?.filter(
          i => i.tipo_item === 'servico' || i.tipo_item === 'serviço' || i.servico_id
        ) || [];
        
        const valorTotalServicos = servicos.reduce((acc, curr) => acc + (parseFloat(curr.valor_total) || 0), 0);
        const descricoes = servicos.map(s => s.descricao || s.servicos?.nome || 'Serviço prestado').join(' | ');
        const aliquota = servicos[0]?.servicos?.aliquota_issqn || 0;
        const codServico = servicos[0]?.servicos?.codigo_servico_lc116 || '';
        const servicoId = servicos[0]?.servico_id || '';

        if (servicos.length === 0) {
          toast({ title: 'Aviso', description: 'Nenhum item de serviço encontrado neste pedido.', variant: 'destructive' });
        }

        let municipioData = {};
        if (data.clientes?.cidade && data.clientes?.estado) {
          const { data: munData } = await supabase
            .from('fiscal_municipios_ibge')
            .select('id, codigo_ibge, nome_municipio, uf')
            .ilike('nome_municipio', data.clientes.cidade)
            .eq('ativo', true)
            .limit(1)
            .maybeSingle();

          if (munData) {
            municipioData = {
              municipio_id: munData.id,
              municipio_incidencia_iss_codigo_ibge: munData.codigo_ibge,
              municipio_incidencia_iss_nome: munData.nome_municipio,
              municipio_incidencia_iss_uf: munData.uf
            };
          } else {
            toast({ 
              title: 'Município não encontrado', 
              description: `Não foi possível localizar o município "${data.clientes.cidade}" automaticamente. Por favor, selecione manualmente.`,
              variant: 'default' 
            });
          }
        }

        setFormData(prev => ({
          ...prev,
          cliente_id: data.cliente_id || '',
          empresa_id: data.empresa_id || '',
          condicao_pagamento_id: data.condicao_pagamento_id || '',
          quantidade: 1,
          valor_servico: valorTotalServicos,
          valor_liquido: valorTotalServicos,
          descricao_servico: descricoes || `Faturamento referente ao pedido ${data.numero}`,
          aliquota: aliquota,
          codigo_servico: codServico,
          servico_id: servicoId,
          observacoes: data.observacoes || `Ref. Pedido de Venda: ${data.numero}`,
          ...municipioData
        }));
        
        setVinculacoes(prev => ({
          ...prev,
          pedido_venda_id: data.id
        }));
      }
    } catch (err) {
      console.error('Error loading pedido:', err);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados do pedido.', variant: 'destructive' });
    } finally {
      setLoadingData(false);
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    setSaveError(null);
    try {
      const data = await nfseServicosService.fetchNfseServico(id);
      const { vinculacoes: vinc, historico, empresas, clientes, servicos, condicoes_pagamento, ...rest } = data;
      
      setFormData({
        ...INITIAL_STATE,
        ...rest,
        municipio_id: rest.municipio_id || '',
        municipio_incidencia_iss_nome: rest.municipio_incidencia_iss_nome || '',
        municipio_incidencia_iss_uf: rest.municipio_incidencia_iss_uf || '',
        municipio_incidencia_iss_codigo_ibge: rest.municipio_incidencia_iss_codigo_ibge || ''
      });
      
      if (vinc) {
        setVinculacoes({
          pedido_venda_id: vinc.pedido_venda_id,
          proposta_id: vinc.proposta_id,
          contrato_id: vinc.contrato_id
        });
      }
    } catch (e) {
      console.error('[NfseServicosFormPage] Error loading data:', e);
      toast({ title: 'Erro Crítico', description: 'Falha ao carregar os dados da NFS-e. Redirecionando...', variant: 'destructive' });
      navigate('/fiscal/nfse-servicos');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const errors = nfseServicosService.validateNfseData(formData);
    
    if (!formData.municipio_id) {
      errors.push('Município de incidência é obrigatório. Por favor, selecione um município válido na lista.');
    } else if (formData.municipio_incidencia_iss_codigo_ibge && formData.municipio_incidencia_iss_codigo_ibge.length !== 7) {
      errors.push('O código IBGE do município selecionado é inválido. Selecione novamente.');
    }
    
    return errors;
  };

  const handleSave = async () => {
    setSaveError(null);
    const errors = validateForm();

    if (errors.length > 0) {
      setSaveError(errors.join(' | '));
      toast({ title: 'Verifique os erros no formulário:', description: errors[0], variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let newId;
      if (isEdit) {
        newId = await nfseServicosService.updateNfseServico(id, formData, vinculacoes, null);
        toast({ title: 'Sucesso', description: 'NFS-e atualizada e salva com sucesso.' });
      } else {
        const nfse = await nfseServicosService.createNfseServico(formData, vinculacoes, null);
        newId = nfse.id;
        toast({ title: 'Sucesso', description: 'Nova NFS-e gerada com sucesso.' });
      }
      
      navigate(`/fiscal/nfse-servicos/${newId}`);
    } catch (e) {
      console.error('[NfseServicosFormPage] Error saving:', e);
      const errorMsg = e.message || 'Falha de conexão com o servidor ao salvar NFS-e.';
      setSaveError(errorMsg);
      toast({ title: 'Erro de Gravação', description: errorMsg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isPageLoading = loadingData || loadingDropdowns;

  if (isPageLoading) return <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" /><p className="text-muted-foreground">Carregando dados da NFS-e...</p></div>;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Helmet><title>{isEdit ? 'Editar NFS-e' : 'Nova NFS-e'} | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title={isEdit ? `Editar NFS-e ${formData.numero}` : "Emissão de NFS-e"}
          description="Preencha os dados para emissão da nota fiscal de prestação de serviços."
          icon={FileText}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'NFS-e Serviços', href: '/fiscal/nfse-servicos' },
            { label: isEdit ? 'Editar' : 'Nova' }
          ]}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/fiscal/nfse-servicos')} disabled={saving}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Salvar Nota')}
          </Button>
        </div>
      </div>

      {saveError && (
        <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-400">Falha ao salvar</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <NfseServicosForm 
        formData={formData} 
        setFormData={setFormData} 
        vinculacoes={vinculacoes}
        setVinculacoes={setVinculacoes}
        dropdowns={dropdowns} 
      />

    </div>
  );
}