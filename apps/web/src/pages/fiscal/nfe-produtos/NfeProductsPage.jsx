import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import NfeFilters from './components/NfeFilters';
import NfeListView from './components/NfeListView';
import { nfeService } from './services/nfeService';
import { supabase } from '@/lib/customSupabaseClient';
import SearchPedidoModal from '../components/SearchPedidoModal';

export default function NfeProductsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    data_inicio: '',
    data_fim: '',
    cliente_id: 'all',
    status: 'all',
    integrado_financeiro: 'all',
    integrado_contabil: 'all'
  });

  useEffect(() => {
    fetchDropdowns();
    loadData();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const { data: c } = await supabase.from('clientes').select('id, nome').order('nome');
      if (c) setClientes(c);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await nfeService.fetchNfeList(filters);
      setData(res || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao buscar NF-e.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      data_inicio: '', data_fim: '', cliente_id: 'all', status: 'all', 
      integrado_financeiro: 'all', integrado_contabil: 'all'
    });
    setTimeout(loadData, 0);
  };

  const handlePedidoSelected = (pedido) => {
    navigate(`/fiscal/nfe-produtos/novo?pedido_id=${pedido.id}`);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet><title>NF-e (Produtos) | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="NF-e (Produtos)" 
          description="Emissão e gestão de Notas Fiscais Eletrônicas de produtos (Modelo 55)."
          icon={FileText}
          breadcrumbs={[{ label: 'Fiscal', href: '/fiscal/dashboard' }, { label: 'NF-e Produtos' }]}
        />
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSearchModalOpen(true)} className="bg-white">
            <Search className="w-4 h-4 mr-2" /> Buscar Pedido
          </Button>
          <Button onClick={() => navigate('/fiscal/nfe-produtos/novo')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Nova NF-e
          </Button>
        </div>
      </div>

      <NfeFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApply={loadData} 
        onReset={handleResetFilters}
        clientes={clientes}
      />

      <NfeListView 
        data={data} 
        loading={loading} 
      />
      
      <SearchPedidoModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelect={handlePedidoSelected}
        type="produto"
      />
    </div>
  );
}