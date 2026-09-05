import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash, MoreHorizontal } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import DataTable from '@/components/DataTable';

function SubcategoriasList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subcategorias, setSubcategorias] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .select(`
          id,
          nome,
          descricao,
          categoria_id,
          categorias (
            id,
            nome
          )
        `)
        .order('nome', { ascending: true });
        
      if (error) throw error;
      setSubcategorias(data || []);
    } catch (error) {
      console.error('Error loading subcategorias:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar subcategorias.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/cadastros/subcategorias/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta subcategoria?')) {
      try {
        const { error } = await supabase.from('subcategorias').delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Sucesso", description: "Subcategoria excluída com sucesso." });
        loadData();
      } catch (error) {
        toast({ title: "Erro", description: "Falha ao excluir subcategoria.", variant: "destructive" });
      }
    }
  };

  const filteredSubcategorias = subcategorias.filter(subcategoria => {
    const catName = subcategoria.categorias?.nome || '';
    return (
      (subcategoria.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      catName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const columns = [
    { 
      header: 'Nome', 
      accessor: 'nome',
      render: (row) => <span className="text-black font-medium">{row.nome}</span>
    },
    { 
      header: 'Categoria Pai', 
      id: 'categoria_nome',
      render: (row) => row.categorias?.nome ? (
        <span className="text-blue-600 font-medium">{row.categorias.nome}</span>
      ) : (
        <span className="text-slate-500 italic">N/A</span>
      )
    },
    { 
      header: 'Descrição', 
      accessor: 'descricao',
      render: (row) => <span className="text-black">{row.descricao || '-'}</span>
    },
    {
      header: 'Ações',
      id: 'actions',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-black hover:bg-slate-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-200 text-black">
              <DropdownMenuItem onClick={() => handleEdit(row.id)} className="cursor-pointer hover:bg-slate-50">
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(row.id)} className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <Helmet>
        <title>Subcategorias - ERP Platform</title>
        <meta name="description" content="Manage and view all subcategories" />
      </Helmet>

      <PageHeader
        title={<span className="text-slate-900">Subcategorias</span>}
        description={<span className="text-slate-500">Gerencie suas subcategorias</span>}
        action={
          <Button onClick={() => navigate('/cadastros/subcategorias/novo')} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" />
            Nova Subcategoria
          </Button>
        }
      />

      <div className="mb-6 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
         <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome ou categoria pai..."
          className="pl-9 bg-white border-slate-300 text-black placeholder:text-slate-500"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <DataTable
          data={filteredSubcategorias}
          columns={columns}
          loading={loading}
          emptyMessage={<span className="text-slate-500">Nenhuma subcategoria encontrada</span>}
        />
      </div>
    </div>
  );
}

export default SubcategoriasList;