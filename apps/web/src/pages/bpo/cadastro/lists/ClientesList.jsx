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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/clientesService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const ClientesList = ({ clientId }) => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadClientes();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(clientes, ['nome', 'email', 'cnpj_cpf', 'cidade']);
    setFilteredClientes(filtered);
  }, [searchTerm, clientes, filterData]);

  const loadClientes = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar clientes');
      return;
    }
    
    setClientes(data || []);
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedCliente.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir cliente');
      return;
    }
    
    showSuccess('Cliente excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedCliente(null);
    loadClientes();
  };

  const openDeleteDialog = (cliente) => {
    setSelectedCliente(cliente);
    setDeleteDialogOpen(true);
  };

  if (loading && clientes.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Clientes - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/clientes?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, CNPJ/CPF ou cidade..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredClientes.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Comece adicionando um novo cliente ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/clientes?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cliente
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.cnpj_cpf || '-'}</TableCell>
                    <TableCell>{cliente.email || '-'}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell>{cliente.cidade || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={cliente.status === 'ativo' ? 'default' : 'secondary'}>
                        {cliente.status || 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/clientes?mode=edit&id=${cliente.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(cliente)}
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
              Tem certeza que deseja excluir o cliente "{selectedCliente?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCliente(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClientesList;