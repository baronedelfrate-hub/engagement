import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { FileText, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ManifestacaoNFFilters from './components/ManifestacaoNFFilters';
import ManifestacaoNFList from './components/ManifestacaoNFList';
import { manifestacaoNFService } from './services/manifestacaoNFService';
import { supabase } from '@/lib/customSupabaseClient';

export default function ManifestacaoNFPage() {
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);

  const [filters, setFilters] = useState({
    data_inicio: '',
    data_fim: '',
    fornecedor_id: 'all',
    chave_acesso: '',
    status_manifestacao: 'all',
    situacao_consulta: 'all',
    importado_entrada: 'all'
  });

  useEffect(() => {
    fetchDropdowns();
    loadData();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const { data: f } = await supabase.from('fornecedores').select('id, nome').eq('ativo', true).order('nome');
      if (f) setFornecedores(f);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await manifestacaoNFService.getManifestacoes(filters);
      setData(res || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao buscar notas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      data_inicio: '', data_fim: '', fornecedor_id: 'all', chave_acesso: '', 
      status_manifestacao: 'all', situacao_consulta: 'all', importado_entrada: 'all'
    });
    setTimeout(loadData, 0);
  };

  const handleSyncSefaz = async () => {
    setIsRefreshing(true);
    // Mock SEFAZ Sync. It would fetch from an API and create new records in notas_manifestacao
    toast({ title: 'Sincronização', description: 'Consultando novas notas na SEFAZ...' });
    setTimeout(() => {
      toast({ title: 'Sucesso', description: 'Sincronização concluída. 0 novas notas encontradas.' });
      setIsRefreshing(false);
      loadData();
    }, 2000);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet><title>Manifestação de NF-e | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Manifestação de Notas Fiscais" 
          description="Consulte notas emitidas contra seu CNPJ e realize a manifestação do destinatário."
          icon={FileText}
          breadcrumbs={[{ label: 'Fiscal', href: '/fiscal/dashboard' }, { label: 'Manifestação de NF' }]}
        />
        
        <Button onClick={handleSyncSefaz} disabled={isRefreshing} className="bg-slate-900 hover:bg-slate-800 text-white">
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sincronizar SEFAZ
        </Button>
      </div>

      <ManifestacaoNFFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApply={loadData} 
        onReset={handleResetFilters}
        fornecedores={fornecedores}
      />

      <ManifestacaoNFList 
        data={data} 
        loading={loading} 
        onRefresh={loadData}
      />
      
    </div>
  );
}