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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/tributosService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const TributosList = ({ clientId }) => {
  const navigate = useNavigate();
  const [tributos, setTributos] = useState([]);
  const [filteredTributos, setFilteredTributos] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTributo, setSelectedTributo] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadTributos();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(tributos, ['nome']);
    setFilteredTributos(filtered);
  }, [searchTerm, tributos, filterData]);

  const loadTributos = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar tributos');
      return;
    }
    
    setTributos(data || []);
  };

  const handleDelete = async () => {
    if (!selectedTributo) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedTributo.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir tributo');
      return;
    }
    
    showSuccess('Tributo excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedTributo(null);
    loadTributos();
  };

  const openDeleteDialog = (tributo) => {
    setSelectedTributo(tributo);
    setDeleteDialogOpen(true);
  };

  if (loading && tributos.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Tributos - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tributos</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tributos?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tributo
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredTributos.length === 0 ? (
          <EmptyState
            title="Nenhum tributo encontrado"
            description="Comece adicionando um novo tributo ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tributos?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tributo
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Alíquota (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTributos.map((tributo) => (
                  <TableRow key={tributo.id}>
                    <TableCell className="font-medium">{tributo.nome}</TableCell>
                    <TableCell>{tributo.aliquota || 0}%</TableCell>
                    <TableCell>
                      <Badge variant={tributo.ativo ? 'default' : 'secondary'}>
                        {tributo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/tributos?mode=edit&id=${tributo.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(tributo)}
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
              Tem certeza que deseja excluir o tributo "{selectedTributo?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTributo(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TributosList;