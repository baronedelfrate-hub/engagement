import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function TipoPagamentoList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tipos, setTipos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = () => {
    const data = storage.get('TIPO_PAGAMENTO');
    setTipos(data || []);
  };

  const handleEdit = (id) => {
    navigate(`/cadastros/tipo-pagamento/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de pagamento?')) {
      storage.delete('TIPO_PAGAMENTO', id);
      loadTipos();
      toast({
        title: "Tipo de pagamento excluído",
        description: "O tipo de pagamento foi removido com sucesso.",
      });
    }
  };

  const filteredTipos = tipos.filter(tipo =>
    tipo.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { 
      header: 'Código', 
      accessor: 'codigo',
      render: (row) => <span className="text-foreground font-mono">{row.codigo}</span>
    },
    { 
      header: 'Nome', 
      accessor: 'nome',
      render: (row) => <span className="text-foreground font-medium">{row.nome}</span>
    },
    { 
      header: 'Descrição', 
      accessor: 'descricao',
      render: (row) => <span className="text-foreground">{row.descricao}</span>
    }
  ];

  return (
    <div className="p-8 min-h-screen bg-muted">
      <Helmet>
        <title>Tipo de Pagamento - ERP Platform</title>
        <meta name="description" content="Manage and view all payment types in your ERP financial system" />
      </Helmet>

      <PageHeader
        title={<span className="text-foreground">Tipo de Pagamento</span>}
        description={<span className="text-muted-foreground">Gerencie os tipos de pagamento</span>}
        action={
          <Button onClick={() => navigate('/cadastros/tipo-pagamento/novo')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Novo Tipo de Pagamento
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome ou código..."
          className="bg-background border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <DataTable
          data={filteredTipos}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage={<span className="text-muted-foreground">Nenhum tipo de pagamento cadastrado</span>}
        />
      </div>
    </div>
  );
}

export default TipoPagamentoList;