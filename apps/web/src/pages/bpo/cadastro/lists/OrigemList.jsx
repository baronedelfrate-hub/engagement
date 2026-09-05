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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/origemService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const OrigemList = ({ clientId }) => {
  const navigate = useNavigate();
  const [origens, setOrigens] = useState([]);
  const [filteredOrigens, setFilteredOrigens] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrigem, setSelectedOrigem] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadOrigens();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(origens, ['nome', 'descricao']);
    setFilteredOrigens(filtered);
  }, [searchTerm, origens, filterData]);

  const loadOrigens = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar origens');
      return;
    }
    
    setOrigens(data || []);
  };

  const handleDelete = async () => {
    if (!selectedOrigem) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedOrigem.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir origem');
      return;
    }
    
    showSuccess('Origem excluída com sucesso');
    setDeleteDialogOpen(false);
    setSelectedOrigem(null);
    loadOrigens();
  };

  const openDeleteDialog = (origem) => {
    setSelectedOrigem(origem);
    setDeleteDialogOpen(true);
  };

  if (loading && origens.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Origem - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Origem</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/origem?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Origem
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

        {filteredOrigens.length === 0 ? (
          <EmptyState
            title="Nenhuma origem encontrada"
            description="Comece adicionando uma nova origem ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/origem?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Origem
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
                {filteredOrigens.map((origem) => (
                  <TableRow key={origem.id}>
                    <TableCell className="font-medium">{origem.nome}</TableCell>
                    <TableCell>{origem.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={origem.ativo ? 'default' : 'secondary'}>
                        {origem.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/origem?mode=edit&id=${origem.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(origem)}
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
              Tem certeza que deseja excluir a origem "{selectedOrigem?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedOrigem(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrigemList;