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

function TipoDocumentoList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tipos, setTipos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTipos();
  }, []);

  const loadTipos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tipos_documento')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      setTipos(data || []);
    } catch (error) {
      console.error('Error loading tipos de documento:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os tipos de documento.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/cadastros/tipo-documento/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de documento?')) {
      const { error } = await supabase.from('tipos_documento').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      await loadTipos();
      toast({
        title: "Tipo de documento excluído",
        description: "O tipo de documento foi removido com sucesso.",
      });
    }
  };

  const filteredTipos = tipos.filter(tipo =>
    tipo.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipo.sigla?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: 'Sigla',
      accessor: 'sigla',
      render: (row) => <span className="text-foreground font-mono">{row.sigla}</span>
    },
    {
      header: 'Nome',
      accessor: 'nome',
      render: (row) => <span className="text-foreground font-medium">{row.nome}</span>
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
    <div className="p-8 min-h-screen bg-muted">
      <Helmet>
        <title>Tipo de Documento - ERP Platform</title>
        <meta name="description" content="Manage and view all document types in your ERP system" />
      </Helmet>

      <PageHeader
        title={<span className="text-foreground">Tipo de Documento</span>}
        description={<span className="text-muted-foreground">Gerencie os tipos de documento</span>}
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
          placeholder="Buscar por nome ou sigla..."
          className="bg-background border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <DataTable
          data={filteredTipos}
          columns={columns}
          onEdit={(row) => handleEdit(row.id)}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage={<span className="text-muted-foreground">Nenhum tipo de documento cadastrado</span>}
        />
      </div>
    </div>
  );
}

export default TipoDocumentoList;