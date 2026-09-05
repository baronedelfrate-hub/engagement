import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import NfseServicosFilters from './components/NfseServicosFilters';
import NfseServicosListView from './components/NfseServicosListView';
import { nfseServicosService } from './services/nfseServicosService';
import { supabase } from '@/lib/customSupabaseClient';
import SearchPedidoModal from '../components/SearchPedidoModal';

export default function NfseServicosPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const [dropdowns, setDropdowns] = useState({ clientes: [], servicos: [], municipios: [] });

  const [filters, setFilters] = useState({
    search: '',
    data_inicio: '',
    data_fim: '',
    valor_min: '',
    valor_max: '',
    cliente_id: 'all',
    servico_id: 'all',
    municipio_id: 'all',
    status: 'all',
    integrado_contabil: 'all'
  });

  useEffect(() => {
    fetchDropdowns();
    loadData();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [cli, srv, mun] = await Promise.all([
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('servicos').select('id, nome').order('nome'),
        supabase.from('municipios').select('id, nome, uf').order('nome')
      ]);
      setDropdowns({
        clientes: cli.data || [],
        servicos: srv.data || [],
        municipios: mun.data || []
      });
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let res = await nfseServicosService.fetchNfseServicos(filters);
      
      if (filters.valor_min || filters.valor_max) {
        res = res.filter(item => {
          const val = item.valor_liquido || item.valor_servico;
          if (filters.valor_min && val < parseFloat(filters.valor_min)) return false;
          if (filters.valor_max && val > parseFloat(filters.valor_max)) return false;
          return true;
        });
      }

      setData(res || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao buscar NFS-e.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '', data_inicio: '', data_fim: '', valor_min: '', valor_max: '', 
      cliente_id: 'all', servico_id: 'all', municipio_id: 'all', status: 'all', integrado_contabil: 'all'
    });
    setTimeout(loadData, 0);
  };

  const handlePedidoSelected = (pedido) => {
    navigate(`/fiscal/nfse-servicos/novo?pedido_id=${pedido.id}`);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet><title>NFS-e (Serviços) | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="NFS-e (Serviços)" 
          description="Gestão de Notas Fiscais de Serviços Eletrônicas."
          icon={FileText}
          breadcrumbs={[{ label: 'Fiscal', href: '/fiscal/dashboard' }, { label: 'NFS-e Serviços' }]}
        />
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSearchModalOpen(true)} className="bg-white">
            <Search className="w-4 h-4 mr-2" /> Buscar Pedido
          </Button>
          <Button onClick={() => navigate('/fiscal/nfse-servicos/novo')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Nova NFS-e
          </Button>
        </div>
      </div>

      <NfseServicosFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApply={loadData} 
        onReset={handleResetFilters}
        clientes={dropdowns.clientes}
        servicos={dropdowns.servicos}
        municipios={dropdowns.municipios}
      />

      <NfseServicosListView 
        data={data} 
        loading={loading} 
        onRefresh={loadData}
      />

      <SearchPedidoModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handlePedidoSelected}
        type="servico"
      />
    </div>
  );
}