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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/tiposPagamentoService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const TiposPagamentoList = ({ clientId }) => {
  const navigate = useNavigate();
  const [tiposPagamento, setTiposPagamento] = useState([]);
  const [filteredTiposPagamento, setFilteredTiposPagamento] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTipoPagamento, setSelectedTipoPagamento] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadTiposPagamento();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(tiposPagamento, ['nome', 'descricao']);
    setFilteredTiposPagamento(filtered);
  }, [searchTerm, tiposPagamento, filterData]);

  const loadTiposPagamento = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar tipos de pagamento');
      return;
    }
    
    setTiposPagamento(data || []);
  };

  const handleDelete = async () => {
    if (!selectedTipoPagamento) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedTipoPagamento.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir tipo de pagamento');
      return;
    }
    
    showSuccess('Tipo de pagamento excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedTipoPagamento(null);
    loadTiposPagamento();
  };

  const openDeleteDialog = (tipoPagamento) => {
    setSelectedTipoPagamento(tipoPagamento);
    setDeleteDialogOpen(true);
  };

  if (loading && tiposPagamento.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Tipos de Pagamento - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Tipos de Pagamento</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-pagamento?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tipo de Pagamento
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

        {filteredTiposPagamento.length === 0 ? (
          <EmptyState
            title="Nenhum tipo de pagamento encontrado"
            description="Comece adicionando um novo tipo de pagamento ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-pagamento?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tipo de Pagamento
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
                {filteredTiposPagamento.map((tipoPagamento) => (
                  <TableRow key={tipoPagamento.id}>
                    <TableCell className="font-medium">{tipoPagamento.nome}</TableCell>
                    <TableCell>{tipoPagamento.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={tipoPagamento.ativo ? 'default' : 'secondary'}>
                        {tipoPagamento.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/tipos-pagamento?mode=edit&id=${tipoPagamento.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(tipoPagamento)}
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
              Tem certeza que deseja excluir o tipo de pagamento "{selectedTipoPagamento?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTipoPagamento(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TiposPagamentoList;