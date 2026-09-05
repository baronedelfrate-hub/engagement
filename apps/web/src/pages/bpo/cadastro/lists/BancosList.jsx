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
import { fetchAll, deleteRecord } from '@/services/bpo/cadastro/bancosService';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';

const BancosList = ({ clientId }) => {
  const navigate = useNavigate();
  const [bancos, setBancos] = useState([]);
  const [filteredBancos, setFilteredBancos] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBanco, setSelectedBanco] = useState(null);
  
  const { loading, setLoading, searchTerm, handleSearch, showSuccess, showError, filterData, paginateData } = useBPOCadastro();

  useEffect(() => {
    loadBancos();
  }, [clientId]);

  useEffect(() => {
    const filtered = filterData(bancos, ['nome', 'codigo', 'agencia']);
    setFilteredBancos(filtered);
  }, [searchTerm, bancos, filterData]);

  const loadBancos = async () => {
    setLoading(true);
    const { data, error } = await fetchAll(clientId);
    setLoading(false);
    
    if (error) {
      showError('Erro ao carregar bancos');
      return;
    }
    
    setBancos(data || []);
  };

  const handleDelete = async () => {
    if (!selectedBanco) return;
    
    setLoading(true);
    const { error } = await deleteRecord(clientId, selectedBanco.id);
    setLoading(false);
    
    if (error) {
      showError('Erro ao excluir banco');
      return;
    }
    
    showSuccess('Banco excluído com sucesso');
    setDeleteDialogOpen(false);
    setSelectedBanco(null);
    loadBancos();
  };

  const openDeleteDialog = (banco) => {
    setSelectedBanco(banco);
    setDeleteDialogOpen(true);
  };

  if (loading && bancos.length === 0) {
    return <SkeletonLoader count={5} />;
  }

  return (
    <>
      <Helmet>
        <title>Bancos - Cadastro BPO</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Bancos</h1>
          <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/bancos?mode=new`)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Banco
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou agência..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredBancos.length === 0 ? (
          <EmptyState
            title="Nenhum banco encontrado"
            description="Comece adicionando um novo banco ao sistema."
            action={
              <Button onClick={() => navigate(`/cliente/${clientId}/cadastro/bancos?mode=new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Banco
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
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBancos.map((banco) => (
                  <TableRow key={banco.id}>
                    <TableCell className="font-medium">{banco.codigo}</TableCell>
                    <TableCell>{banco.nome}</TableCell>
                    <TableCell>{banco.agencia}</TableCell>
                    <TableCell>{banco.conta}</TableCell>
                    <TableCell>{banco.tipo_conta}</TableCell>
                    <TableCell>R$ {banco.saldo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Badge variant={banco.ativo ? 'default' : 'secondary'}>
                        {banco.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/cliente/${clientId}/cadastro/bancos?mode=edit&id=${banco.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(banco)}
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
              Tem certeza que deseja excluir o banco "{selectedBanco?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBanco(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BancosList;