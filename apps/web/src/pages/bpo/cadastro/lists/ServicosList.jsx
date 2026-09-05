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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/servicosService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const ServicosList = ({ clientId }) => {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState([]);
  const [filteredServicos, setFilteredServicos] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadServicos();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(servicos, ['nome', 'descricao']);
    setFilteredServicos(filtered);
  }, [searchTerm, servicos, filterData]);

  const loadServicos = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar serviços');
      return;
    }
    
    setServicos(data || []);
  };

  const handleDelete = async () => {
    if (!selectedServico) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedServico.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir serviço');
      return;
    }
    
    showSuccess('Serviço excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedServico(null);
    loadServicos();
  };

  const openDeleteDialog = (servico) => {
    setSelectedServico(servico);
    setDeleteDialogOpen(true);
  };

  if (loading && servicos.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Serviços - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Serviços</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/servicos?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Serviço
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

        {filteredServicos.length === 0 ? (
          <EmptyState
            title="Nenhum serviço encontrado"
            description="Comece adicionando um novo serviço ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/servicos?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Serviço
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
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicos.map((servico) => (
                  <TableRow key={servico.id}>
                    <TableCell className="font-medium">{servico.nome}</TableCell>
                    <TableCell>{servico.descricao || '-'}</TableCell>
                    <TableCell>R$ {servico.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                    <TableCell>
                      <Badge variant={servico.status === 'ativo' ? 'default' : 'secondary'}>
                        {servico.status || 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/servicos?mode=edit&id=${servico.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(servico)}
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
              Tem certeza que deseja excluir o serviço "{selectedServico?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedServico(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServicosList;