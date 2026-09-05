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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/tiposProdutoService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const TiposProdutoList = ({ clientId }) => {
  const navigate = useNavigate();
  const [tiposProduto, setTiposProduto] = useState([]);
  const [filteredTiposProduto, setFilteredTiposProduto] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipoProduto, setSelectedTipoProduto] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadTiposProduto();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(tiposProduto, ['nome', 'descricao']);
    setFilteredTiposProduto(filtered);
  }, [searchTerm, tiposProduto, filterData]);

  const loadTiposProduto = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar tipos de produto');
      return;
    }
    
    setTiposProduto(data || []);
  };

  const handleDelete = async () => {
    if (!selectedTipoProduto) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedTipoProduto.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir tipo de produto');
      return;
    }
    
    showSuccess('Tipo de produto excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedTipoProduto(null);
    loadTiposProduto();
  };

  const openDeleteDialog = (tipoProduto) => {
    setSelectedTipoProduto(tipoProduto);
    setDeleteDialogOpen(true);
  };

  if (loading && tiposProduto.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Tipos de Produto - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tipos de Produto</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tipo-produto?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo de Produto
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

        {filteredTiposProduto.length === 0 ? (
          <EmptyState
            title="Nenhum tipo de produto encontrado"
            description="Comece adicionando um novo tipo de produto ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tipo-produto?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tipo de Produto
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
                {filteredTiposProduto.map((tipoProduto) => (
                  <TableRow key={tipoProduto.id}>
                    <TableCell className="font-medium">{tipoProduto.nome}</TableCell>
                    <TableCell>{tipoProduto.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={tipoProduto.ativo ? 'default' : 'secondary'}>
                        {tipoProduto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/tipo-produto?mode=edit&id=${tipoProduto.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(tipoProduto)}
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
              Tem certeza que deseja excluir o tipo de produto "{selectedTipoProduto?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTipoProduto(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TiposProdutoList;