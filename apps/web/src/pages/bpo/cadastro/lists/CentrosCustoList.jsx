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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/centrosCustoService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const CentrosCustoList = ({ clientId }) => {
  const navigate = useNavigate();
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [filteredCentrosCusto, setFilteredCentrosCusto] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCentroCusto, setSelectedCentroCusto] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadCentrosCusto();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(centrosCusto, ['nome', 'codigo', 'descricao']);
    setFilteredCentrosCusto(filtered);
  }, [searchTerm, centrosCusto, filterData]);

  const loadCentrosCusto = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar centros de custo');
      return;
    }
    
    setCentrosCusto(data || []);
  };

  const handleDelete = async () => {
    if (!selectedCentroCusto) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedCentroCusto.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir centro de custo');
      return;
    }
    
    showSuccess('Centro de custo excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedCentroCusto(null);
    loadCentrosCusto();
  };

  const openDeleteDialog = (centroCusto) => {
    setSelectedCentroCusto(centroCusto);
    setDeleteDialogOpen(true);
  };

  if (loading && centrosCusto.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Centros de Custo - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Centros de Custo</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/centros-custo?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Centro de Custo
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou descrição..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredCentrosCusto.length === 0 ? (
          <EmptyState
            title="Nenhum centro de custo encontrado"
            description="Comece adicionando um novo centro de custo ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/centros-custo?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Centro de Custo
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCentrosCusto.map((centroCusto) => (
                  <TableRow key={centroCusto.id}>
                    <TableCell className="font-medium">{centroCusto.codigo}</TableCell>
                    <TableCell>{centroCusto.nome}</TableCell>
                    <TableCell>{centroCusto.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={centroCusto.ativo ? 'default' : 'secondary'}>
                        {centroCusto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/centros-custo?mode=edit&id=${centroCusto.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(centroCusto)}
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
              Tem certeza que deseja excluir o centro de custo "{selectedCentroCusto?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCentroCusto(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CentrosCustoList;