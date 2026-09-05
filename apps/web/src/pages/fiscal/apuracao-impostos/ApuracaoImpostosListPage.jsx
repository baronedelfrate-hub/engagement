import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Calculator, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ApuracaoImpostosFilters from './components/ApuracaoImpostosFilters';
import ApuracaoImpostosSummary from './components/ApuracaoImpostosSummary';
import ApuracaoImpostosTable from './components/ApuracaoImpostosTable';
import { apuracaoImpostosService } from '@/lib/apuracaoImpostosService';

export default function ApuracaoImpostosListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    periodoRaw: '',
    periodo: '',
    tipo_imposto: 'Todos',
    status: 'Todos'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apuracaoImpostosService.fetchApuracoes(filters);
      setData(res || []);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao buscar apurações.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({ periodoRaw: '', periodo: '', tipo_imposto: 'Todos', status: 'Todos' });
    setTimeout(loadData, 0);
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta apuração?')) {
      try {
        await apuracaoImpostosService.deleteApuracao(id);
        toast({ title: 'Sucesso', description: 'Apuração excluída.' });
        loadData();
      } catch (e) {
        toast({ title: 'Erro', description: 'Falha ao excluir.', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet><title>Apuração de Impostos | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Apuração de Impostos" 
          description="Gestão e controle de impostos apurados."
          icon={Calculator}
          breadcrumbs={[{ label: 'Fiscal', href: '/fiscal/dashboard' }, { label: 'Apuração de Impostos' }]}
        />
        
        <Button onClick={() => navigate('/fiscal/apuracao-impostos/novo')} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Nova Apuração
        </Button>
      </div>

      <ApuracaoImpostosFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApply={loadData} 
        onReset={handleResetFilters}
      />

      <ApuracaoImpostosSummary data={data} />

      <ApuracaoImpostosTable 
        data={data} 
        loading={loading} 
        onDelete={handleDelete}
      />
      
    </div>
  );
}