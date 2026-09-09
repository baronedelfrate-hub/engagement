import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, Plus, Search, Edit, Trash2, Loader2, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

const BPOClientesCadastroList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('clientes_bpo')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: clientesData, error } = await query;

      if (error) throw error;

      setData(clientesData || []);
    } catch (error) {
      console.error("Erro ao buscar clientes BPO:", error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível carregar a lista de clientes BPO.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.nome?.toLowerCase().includes(search) ||
      item.cnpj_cpf?.toLowerCase().includes(search) ||
      item.email?.toLowerCase().includes(search)
    );
  });

  const handleDeleteClick = (cliente) => {
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clienteToDelete) return;
    
    setDeletingId(clienteToDelete.id);
    try {
      const { error } = await supabase
        .from('clientes_bpo')
        .delete()
        .eq('id', clienteToDelete.id);
      
      if (error) throw error;
      
      toast({ 
        title: 'Sucesso', 
        description: 'Cliente BPO removido com sucesso.' 
      });
      
      fetchData();
    } catch (error) {
      console.error("Erro ao deletar cliente BPO:", error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível remover o cliente BPO.', 
        variant: 'destructive' 
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setClienteToDelete(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-muted">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
        <span className="font-medium text-foreground">CLIENTES BPO</span>
        <ChevronRight className="h-4 w-4" />
        <span>Cadastro de Clientes</span>
      </div>

      <Card className="shadow-lg border-border">
        <CardHeader className="border-b border-border bg-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground dark:text-white">
                  Cadastro de Clientes BPO
                </CardTitle>
                <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                  Gerenciamento exclusivo de clientes BPO
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/clientes-bpo/cadastro-clientes/novo')}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente BPO
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ/CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground dark:text-muted-foreground text-lg">
                {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente BPO cadastrado.'}
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => navigate('/clientes-bpo/cadastro-clientes/novo')}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Primeiro Cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead className="font-semibold text-foreground">Nome</TableHead>
                    <TableHead className="font-semibold text-foreground">CNPJ/CPF</TableHead>
                    <TableHead className="font-semibold text-foreground">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Telefone</TableHead>
                    <TableHead className="font-semibold text-foreground">Cidade</TableHead>
                    <TableHead className="font-semibold text-foreground">Estado</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((cliente) => (
                    <TableRow 
                      key={cliente.id}
                      className="hover:bg-muted transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">
                        {cliente.nome}
                      </TableCell>
                      <TableCell className="font-mono text-foreground">
                        {cliente.cnpj_cpf || '-'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {cliente.email || '-'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {cliente.telefone || '-'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {cliente.cidade || '-'}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {cliente.estado || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={cliente.status === 'ativo' ? 'success' : 'secondary'}
                          className={cliente.status === 'ativo' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' 
                            : 'bg-muted text-foreground'
                          }
                        >
                          {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clientes-bpo/cadastro-clientes/${cliente.id}`)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(cliente)}
                            disabled={deletingId === cliente.id}
                            className="hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            {deletingId === cliente.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results Count */}
          {!loading && filteredData.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground dark:text-muted-foreground">
              Exibindo {filteredData.length} {filteredData.length === 1 ? 'cliente' : 'clientes'}
              {searchTerm && ` de ${data.length} total`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clienteToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingId}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BPOClientesCadastroList;