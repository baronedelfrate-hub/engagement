import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

function CondicaoPagamentoList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [condicoes, setCondicoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCondicoes();
  }, []);

  const loadCondicoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('condicoes_pagamento')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      setCondicoes(data || []);
    } catch (error) {
      console.error('Error loading condicoes de pagamento:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as condições de pagamento.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/cadastros/condicao-pagamento/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta condição de pagamento?')) {
      const { error } = await supabase.from('condicoes_pagamento').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      await loadCondicoes();
      toast({
        title: "Condição de pagamento excluída",
        description: "A condição de pagamento foi removida com sucesso.",
      });
    }
  };

  const filteredCondicoes = condicoes.filter(condicao =>
    condicao.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Nome', accessor: 'nome' },
    { 
      header: 'Prazo (dias)', 
      render: (row) => row.dias ?? '-'
    },
    { 
      header: 'Desconto', 
      render: (row) => row.percentual_desconto ? `${row.percentual_desconto}%` : '-'
    },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.ativo ? 'default' : 'secondary'}>
          {row.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    }
  ];

  return (
    <div>
      <Helmet>
        <title>Condição de Pagamento - Engagement Soluções</title>
        <meta name="description" content="Manage and view all payment conditions in your ERP financial system" />
      </Helmet>

      <PageHeader
        title="Condição de Pagamento"
        description="Gerencie as condições de pagamento"
        action={
          <Button onClick={() => navigate('/cadastros/condicao-pagamento/novo')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Condição de Pagamento
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome..."
        />
      </div>

      <div className="rounded-lg overflow-hidden border border-border bg-card">
        <DataTable
          data={filteredCondicoes}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="Nenhuma condição de pagamento cadastrada"
        />
      </div>
    </div>
  );
}

export default CondicaoPagamentoList;