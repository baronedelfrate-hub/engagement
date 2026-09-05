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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/condicoesPagamentoService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const CondicoesPagamentoList = ({ clientId }) => {
  const navigate = useNavigate();
  const [condicoes, setCondicoes] = useState([]);
  const [filteredCondicoes, setFilteredCondicoes] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCondicao, setSelectedCondicao] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadCondicoes();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(condicoes, ['nome']);
    setFilteredCondicoes(filtered);
  }, [searchTerm, condicoes, filterData]);

  const loadCondicoes = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar condições de pagamento');
      return;
    }
    
    setCondicoes(data || []);
  };

  const handleDelete = async () => {
    if (!selectedCondicao) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedCondicao.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir condição de pagamento');
      return;
    }
    
    showSuccess('Condição de pagamento excluída com sucesso');
    setDeleteDialogOpen(false);
    setSelectedCondicao(null);
    loadCondicoes();
  };

  const openDeleteDialog = (condicao) => {
    setSelectedCondicao(condicao);
    setDeleteDialogOpen(true);
  };

  if (loading && condicoes.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Condições de Pagamento - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Condições de Pagamento</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/condicoes-pagamento?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Condição
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

        {filteredCondicoes.length === 0 ? (
          <EmptyState
            title="Nenhuma condição de pagamento encontrada"
            description="Comece adicionando uma nova condição de pagamento ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/condicoes-pagamento?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Condição
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Desconto (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCondicoes.map((condicao) => (
                  <TableRow key={condicao.id}>
                    <TableCell className="font-medium">{condicao.nome}</TableCell>
                    <TableCell>{condicao.dias || 0}</TableCell>
                    <TableCell>{condicao.percentual_desconto || 0}%</TableCell>
                    <TableCell>
                      <Badge variant={condicao.ativo ? 'default' : 'secondary'}>
                        {condicao.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/condicoes-pagamento?mode=edit&id=${condicao.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(condicao)}
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
              Tem certeza que deseja excluir a condição de pagamento "{selectedCondicao?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCondicao(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CondicoesPagamentoList;