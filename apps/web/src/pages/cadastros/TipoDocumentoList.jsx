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

function TipoDocumentoList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tipos, setTipos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = () => {
    const data = storage.get('TIPO_DOCUMENTO');
    setTipos(data || []);
  };

  const handleEdit = (id) => {
    navigate(`/cadastros/tipo-documento/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de documento?')) {
      storage.delete('TIPO_DOCUMENTO', id);
      loadTipos();
      toast({
        title: "Tipo de documento excluído",
        description: "O tipo de documento foi removido com sucesso.",
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
      render: (row) => <span className="text-black font-mono">{row.codigo}</span>
    },
    { 
      header: 'Nome', 
      accessor: 'nome',
      render: (row) => <span className="text-black font-medium">{row.nome}</span>
    },
    { 
      header: 'Categoria', 
      accessor: 'categoria',
      render: (row) => <span className="text-black">{row.categoria}</span>
    },
    { 
      header: 'Descrição', 
      accessor: 'descricao',
      render: (row) => <span className="text-black">{row.descricao}</span>
    }
  ];

  return (
    <div className="p-8 min-h-screen bg-slate-50">
      <Helmet>
        <title>Tipo de Documento - ERP Platform</title>
        <meta name="description" content="Manage and view all document types in your ERP system" />
      </Helmet>

      <PageHeader
        title={<span className="text-slate-900">Tipo de Documento</span>}
        description={<span className="text-slate-500">Gerencie os tipos de documento</span>}
        action={
          <Button onClick={() => navigate('/cadastros/tipo-documento/novo')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Novo Tipo de Documento
          </Button>
        }
      />

      <div className="mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nome ou código..."
          className="bg-white border-slate-300 text-black placeholder:text-slate-500"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <DataTable
          data={filteredTipos}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyMessage={<span className="text-slate-500">Nenhum tipo de documento cadastrado</span>}
        />
      </div>
    </div>
  );
}

export default TipoDocumentoList;