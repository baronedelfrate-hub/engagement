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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/fornecedoresService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const FornecedoresList = ({ clientId }) => {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState([]);
  const [filteredFornecedores, setFilteredFornecedores] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadFornecedores();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(fornecedores, ['nome', 'email', 'cnpj', 'cidade']);
    setFilteredFornecedores(filtered);
  }, [searchTerm, fornecedores, filterData]);

  const loadFornecedores = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar fornecedores');
      return;
    }
    
    setFornecedores(data || []);
  };

  const handleDelete = async () => {
    if (!selectedFornecedor) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedFornecedor.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir fornecedor');
      return;
    }
    
    showSuccess('Fornecedor excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedFornecedor(null);
    loadFornecedores();
  };

  const openDeleteDialog = (fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setDeleteDialogOpen(true);
  };

  if (loading && fornecedores.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Fornecedores - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Fornecedores</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/fornecedores?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, CNPJ ou cidade..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredFornecedores.length === 0 ? (
          <EmptyState
            title="Nenhum fornecedor encontrado"
            description="Comece adicionando um novo fornecedor ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/fornecedores?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Fornecedor
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                    <TableCell>{fornecedor.cnpj || '-'}</TableCell>
                    <TableCell>{fornecedor.email || '-'}</TableCell>
                    <TableCell>{fornecedor.telefone || '-'}</TableCell>
                    <TableCell>{fornecedor.cidade || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={fornecedor.status === 'ativo' ? 'default' : 'secondary'}>
                        {fornecedor.status || 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/fornecedores?mode=edit&id=${fornecedor.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(fornecedor)}
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
              Tem certeza que deseja excluir o fornecedor "{selectedFornecedor?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFornecedor(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FornecedoresList;