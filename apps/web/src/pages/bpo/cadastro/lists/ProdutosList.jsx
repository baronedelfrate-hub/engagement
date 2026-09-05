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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/produtosService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const ProdutosList = ({ clientId }) => {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadProdutos();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(produtos, ['nome', 'sku', 'descricao']);
    setFilteredProdutos(filtered);
  }, [searchTerm, produtos, filterData]);

  const loadProdutos = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar produtos');
      return;
    }
    
    setProdutos(data || []);
  };

  const handleDelete = async () => {
    if (!selectedProduto) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedProduto.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir produto');
      return;
    }
    
    showSuccess('Produto excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedProduto(null);
    loadProdutos();
  };

  const openDeleteDialog = (produto) => {
    setSelectedProduto(produto);
    setDeleteDialogOpen(true);
  };

  if (loading && produtos.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Produtos - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/produtos?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou descrição..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredProdutos.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Comece adicionando um novo produto ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/produtos?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Preço Custo</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.sku || '-'}</TableCell>
                    <TableCell>R$ {produto.preco_custo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                    <TableCell>R$ {produto.preco_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                    <TableCell>{produto.estoque_atual || 0}</TableCell>
                    <TableCell>{produto.unidade_medida || 'UN'}</TableCell>
                    <TableCell>
                      <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/produtos?mode=edit&id=${produto.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(produto)}
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
              Tem certeza que deseja excluir o produto "{selectedProduto?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProduto(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProdutosList;