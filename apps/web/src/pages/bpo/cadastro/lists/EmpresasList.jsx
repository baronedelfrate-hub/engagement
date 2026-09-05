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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/empresasService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const EmpresasList = ({ clientId }) => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [filteredEmpresas, setFilteredEmpresas] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData } = useBPOCadastro();

  useEffect(() => {
    loadEmpresas();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(empresas, ['razao_social', 'nome_fantasia', 'cnpj', 'email']);
    setFilteredEmpresas(filtered);
  }, [searchTerm, empresas, filterData]);

  const loadEmpresas = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar empresas');
      return;
    }
    
    setEmpresas(data || []);
  };

  const handleDelete = async () => {
    if (!selectedEmpresa) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedEmpresa.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir empresa');
      return;
    }
    
    showSuccess('Empresa excluída com sucesso');
    setDeleteDialogOpen(false);
    setSelectedEmpresa(null);
    loadEmpresas();
  };

  const openDeleteDialog = (empresa) => {
    setSelectedEmpresa(empresa);
    setDeleteDialogOpen(true);
  };

  if (loading && empresas.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Empresas - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Empresas</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/empresas?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razão social, nome fantasia, CNPJ ou email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredEmpresas.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa encontrada"
            description="Comece adicionando uma nova empresa ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/empresas?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Empresa
              </Button>
            }
          />
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.razao_social}</TableCell>
                    <TableCell>{empresa.nome_fantasia || '-'}</TableCell>
                    <TableCell>{empresa.cnpj || '-'}</TableCell>
                    <TableCell>{empresa.email || '-'}</TableCell>
                    <TableCell>{empresa.telefone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={empresa.ativo ? 'default' : 'secondary'}>
                        {empresa.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/empresas?mode=edit&id=${empresa.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(empresa)}
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
              Tem certeza que deseja excluir a empresa "{selectedEmpresa?.razao_social}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedEmpresa(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmpresasList;