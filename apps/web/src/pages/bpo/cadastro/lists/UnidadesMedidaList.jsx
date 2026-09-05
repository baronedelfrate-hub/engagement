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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/unidadesMedidaService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const UnidadesMedidaList = ({ clientId }) => {
  const navigate = useNavigate();
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [filteredUnidadesMedida, setFilteredUnidadesMedida] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUnidadeMedida, setSelectedUnidadeMedida] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadUnidadesMedida();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(unidadesMedida, ['nome', 'sigla']);
    setFilteredUnidadesMedida(filtered);
  }, [searchTerm, unidadesMedida, filterData]);

  const loadUnidadesMedida = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar unidades de medida');
      return;
    }
    
    setUnidadesMedida(data || []);
  };

  const handleDelete = async () => {
    if (!selectedUnidadeMedida) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedUnidadeMedida.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir unidade de medida');
      return;
    }
    
    showSuccess('Unidade de medida excluída com sucesso');
    setDeleteDialogOpen(false);
    setSelectedUnidadeMedida(null);
    loadUnidadesMedida();
  };

  const openDeleteDialog = (unidadeMedida) => {
    setSelectedUnidadeMedida(unidadeMedida);
    setDeleteDialogOpen(true);
  };

  if (loading && unidadesMedida.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Unidades de Medida - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Unidades de Medida</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/unidades-medida?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Unidade de Medida
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou sigla..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredUnidadesMedida.length === 0 ? (
          <EmptyState
            title="Nenhuma unidade de medida encontrada"
            description="Comece adicionando uma nova unidade de medida ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/unidades-medida?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Unidade de Medida
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnidadesMedida.map((unidadeMedida) => (
                  <TableRow key={unidadeMedida.id}>
                    <TableCell className="font-medium">{unidadeMedida.nome}</TableCell>
                    <TableCell>{unidadeMedida.sigla || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={unidadeMedida.ativo ? 'default' : 'secondary'}>
                        {unidadeMedida.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/unidades-medida?mode=edit&id=${unidadeMedida.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(unidadeMedida)}
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
              Tem certeza que deseja excluir a unidade de medida "{selectedUnidadeMedida?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUnidadeMedida(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UnidadesMedidaList;