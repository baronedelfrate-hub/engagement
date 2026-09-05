import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, ListTree } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TipoProdutoList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('tipo_produto')
        .select('*')
        .order('nome');

      if (error) throw error;
      setData(result || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao carregar tipos de produto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('tipo_produto')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Tipo de produto excluído com sucesso", variant: "success" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao excluir tipo de produto", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-slate-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-900">
            <ListTree className="h-8 w-8 text-blue-600" />
            Tipos de Produto
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie as classificações de tipos de produtos e serviços.
          </p>
        </div>
        <Button onClick={() => navigate('/cadastros/tipo-produto/novo')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Novo Tipo de Produto
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b border-slate-200">
                <TableHead className="text-black font-semibold">Nome</TableHead>
                <TableHead className="text-black font-semibold">Descrição</TableHead>
                <TableHead className="text-center text-black font-semibold">Status</TableHead>
                <TableHead className="text-right text-black font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    Nenhum tipo de produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-medium text-black">{item.nome}</TableCell>
                    <TableCell className="text-black">{item.descricao || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.ativo ? 'success' : 'secondary'} className={item.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-black">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => navigate(`/cadastros/tipo-produto/${item.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Esta ação não pode ser desfeita. O tipo de produto será permanentemente excluído do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 text-black">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TipoProdutoList;