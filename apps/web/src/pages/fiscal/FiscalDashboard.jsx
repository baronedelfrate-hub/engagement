import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import FiscalDashboardQuickActions from './components/FiscalDashboardQuickActions';
import FiscalDashboardFilters from './components/FiscalDashboardFilters';
import FiscalDashboardIndicators from './components/FiscalDashboardIndicators';
import FiscalDashboardGrids from './components/FiscalDashboardGrids';
import { useFiscalDashboard } from './hooks/useFiscalDashboard';
import { Building2, Settings, MapPin, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const FiscalDashboard = () => {
  const { data, filters, setFilters, loading, dropdowns } = useFiscalDashboard();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet>
        <title>Dashboard Fiscal | ERP Platform</title>
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Dashboard Fiscal" 
          description="Gestão completa de notas emitidas, recebidas, manifestações e obrigações fiscais."
          icon={Building2}
        />
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/fiscal-municipios-setup')}
          className="shrink-0"
        >
          <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
          Configurar Municípios Fiscais
        </Button>
      </div>

      {/* Quick Setup Section */}
      <Card className="bg-blue-50/50 border-blue-200 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                Setup Necessário: Municípios IBGE
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Para emitir NFS-e corretamente, certifique-se de que a tabela de municípios do IBGE está sincronizada e validada.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/fiscal-municipios-setup')}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 w-full sm:w-auto"
          >
            Sincronizar Municípios Fiscais
          </Button>
        </CardContent>
      </Card>

      <FiscalDashboardQuickActions />
      
      <FiscalDashboardFilters 
        filters={filters} 
        setFilters={setFilters} 
        dropdowns={dropdowns} 
      />
      
      <FiscalDashboardIndicators 
        data={data} 
        loading={loading} 
      />
      
      <FiscalDashboardGrids 
        data={data} 
        loading={loading} 
      />

    </div>
  );
};

export default FiscalDashboard;