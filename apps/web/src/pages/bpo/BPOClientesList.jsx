import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { formatBPODate } from '@/lib/bpoUtils';
import { Badge } from '@/components/ui/badge';

const BPOClientesList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: clients, error } = await supabase
        .from('bpo_clientes')
        .select(`
          *,
          cliente:clientes(id, nome),
          responsavel:users(nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(clients || []);
    } catch (error) {
      console.error('Error fetching BPO clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ativo': return 'success';
      case 'Em Onboarding': return 'warning';
      case 'Suspenso': return 'destructive';
      case 'Encerrado': return 'secondary';
      case 'Inativo': return 'secondary';
      default: return 'outline';
    }
  };

  const handleNavigateToFases = (clientId) => {
    if (!clientId) {
      console.warn('[BPOClientesList] Tentativa de navegação sem ID de cliente válido');
      return;
    }
    console.log('[BPOClientesList] Navegando para fases:', clientId);
    const targetPath = `/operacao/bpo-e5/clientes/${clientId}/fases`;
    console.log('[BPOClientesList] Rota:', targetPath);
    navigate(targetPath);
  };

  const columns = [
    { 
      header: 'Cliente', 
      accessorKey: 'cliente.nome',
      cell: ({ row }) => (
        <span 
          className="font-medium cursor-pointer text-primary hover:underline"
          onClick={() => handleNavigateToFases(row.cliente?.id)}
        >
          {row.cliente?.nome || 'N/A'}
        </span>
      )
    },
    { 
      header: 'Status BPO', 
      accessorKey: 'status_bpo',
      cell: ({ row }) => <Badge variant={getStatusBadge(row.status_bpo)}>{row.status_bpo}</Badge>
    },
    { 
      header: 'Responsável', 
      accessorKey: 'responsavel.nome',
      cell: ({ row }) => row.responsavel?.nome || '-'
    },
    { 
      header: 'Data Início', 
      accessorKey: 'data_inicio',
      cell: ({ row }) => formatBPODate(row.data_inicio)
    }
  ];

  return (
    <>
      <Helmet>
        <title>Clientes BPO - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Clientes BPO"
        description="Gestão de clientes e contratos de terceirização"
        action={
          <Button onClick={() => navigate('/operacao/bpo-e5/clientes-bpo/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente BPO
          </Button>
        }
      />

      <div className="p-6">
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          onEdit={(row) => handleNavigateToFases(row.cliente?.id)} 
          onDelete={async (id) => {
            if (window.confirm('Tem certeza? Isso apagará todo o histórico BPO deste cliente.')) {
                await supabase.from('bpo_clientes').delete().eq('id', id);
                fetchData();
            }
          }}
          filterColumn="cliente.nome"
          searchPlaceholder="Buscar cliente..."
        />
      </div>
    </>
  );
};

export default BPOClientesList;