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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/tiposDocumentoService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const TiposDocumentoList = ({ clientId }) => {
  const navigate = useNavigate();
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [filteredTiposDocumento, setFilteredTiposDocumento] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipoDocumento, setSelectedTipoDocumento] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadTiposDocumento();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(tiposDocumento, ['nome', 'sigla']);
    setFilteredTiposDocumento(filtered);
  }, [searchTerm, tiposDocumento, filterData]);

  const loadTiposDocumento = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar tipos de documento');
      return;
    }
    
    setTiposDocumento(data || []);
  };

  const handleDelete = async () => {
    if (!selectedTipoDocumento) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedTipoDocumento.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir tipo de documento');
      return;
    }
    
    showSuccess('Tipo de documento excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedTipoDocumento(null);
    loadTiposDocumento();
  };

  const openDeleteDialog = (tipoDocumento) => {
    setSelectedTipoDocumento(tipoDocumento);
    setDeleteDialogOpen(true);
  };

  if (loading && tiposDocumento.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Tipos de Documento - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tipos de Documento</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-documento?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo de Documento
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

        {filteredTiposDocumento.length === 0 ? (
          <EmptyState
            title="Nenhum tipo de documento encontrado"
            description="Comece adicionando um novo tipo de documento ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-documento?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tipo de Documento
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
                {filteredTiposDocumento.map((tipoDocumento) => (
                  <TableRow key={tipoDocumento.id}>
                    <TableCell className="font-medium">{tipoDocumento.nome}</TableCell>
                    <TableCell>{tipoDocumento.sigla || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={tipoDocumento.ativo ? 'default' : 'secondary'}>
                        {tipoDocumento.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-documento?mode=edit&id=${tipoDocumento.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(tipoDocumento)}
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
              Tem certeza que deseja excluir o tipo de documento "{selectedTipoDocumento?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTipoDocumento(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TiposDocumentoList;