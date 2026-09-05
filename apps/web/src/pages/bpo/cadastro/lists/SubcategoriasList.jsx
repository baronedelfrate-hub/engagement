import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useBPOCadastro } from '@/hooks/useBPOCadastro';
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/subcategoriasService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const SubcategoriasList = ({ clientId }) => {
  const navigate = useNavigate();
  const [subcategorias, setSubcategorias] = useState([]);
  const [filteredSubcategorias, setFilteredSubcategorias] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadSubcategorias();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(subcategorias, ['nome', 'descricao']);
    setFilteredSubcategorias(filtered);
  }, [searchTerm, subcategorias, filterData]);

  const loadSubcategorias = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar subcategorias');
      return;
    }
    
    setSubcategorias(data || []);
  };

  const handleDelete = async () => {
    if (!selectedSubcategoria) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedSubcategoria.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir subcategoria');
      return;
    }
    
    showSuccess('Subcategoria excluída com sucesso');
    setDeleteDialogOpen(false);
    setSelectedSubcategoria(null);
    loadSubcategorias();
  };

  const openDeleteDialog = (subcategoria) => {
    setSelectedSubcategoria(subcategoria);
    setDeleteDialogOpen(true);
  };

  if (loading && subcategorias.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Subcategorias - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Subcategorias</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/subcategorias?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Subcategoria
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredSubcategorias.length === 0 ? (
          <EmptyState
            title="Nenhuma subcategoria encontrada"
            description="Comece adicionando uma nova subcategoria ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/subcategorias?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Subcategoria
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubcategorias.map((subcategoria) => (
                  <TableRow key={subcategoria.id}>
                    <TableCell className="font-medium">{subcategoria.nome}</TableCell>
                    <TableCell>{subcategoria.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={subcategoria.ativo ? 'default' : 'secondary'}>
                        {subcategoria.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/subcategorias?mode=edit&id=${subcategoria.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(subcategoria)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a subcategoria "{selectedSubcategoria?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedSubcategoria(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SubcategoriasList;