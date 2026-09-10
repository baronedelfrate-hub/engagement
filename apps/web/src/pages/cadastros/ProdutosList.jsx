import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Loader2
} from 'lucide-react';
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
import { formatCurrency } from '@/lib/produtosUtils';

const ProdutosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [tiposMap, setTiposMap] = useState({});
  const [tiposList, setTiposList] = useState([]);
  const [categoriasMap, setCategoriasMap] = useState({});
  const [categoriasList, setCategoriasList] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    tipo: 'all',
    status: 'all',
    categoria: 'all'
  });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiposRes, categoriasRes] = await Promise.all([
        supabase.from('tipo_produto').select('id, nome'),
        supabase.from('categorias').select('id, nome'),
      ]);

      if (tiposRes.data) {
        const map = {};
        tiposRes.data.forEach(t => { map[t.id] = t.nome; });
        setTiposMap(map);
        setTiposList(tiposRes.data);
      }
      if (categoriasRes.data) {
        const map = {};
        categoriasRes.data.forEach(c => { map[c.id] = c.nome; });
        setCategoriasMap(map);
        setCategoriasList(categoriasRes.data);
      }

      let query = supabase.from('produtos').select('*').order('nome', { ascending: true });
      if (filters.tipo !== 'all') query = query.eq('tipo_produto_id', filters.tipo);
      if (filters.status !== 'all') query = query.eq('ativo', filters.status === 'Ativo');
      if (filters.categoria !== 'all') query = query.eq('categoria_id', filters.categoria);
      if (filters.search) {
        query = query.or(`nome.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,codigo_barras.ilike.%${filters.search}%`);
      }

      const { data: produtosData, error } = await query;
      if (error) throw error;
      setData(produtosData || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({ title: "Erro", description: error.message || "Não foi possível carregar os produtos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('produtos').delete().eq('id', deleteId);
    if (error) {
      toast({ title: "Erro", description: error.message || "Não foi possível excluir.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Produto excluído com sucesso" });
      fetchData();
    }
    setDeleteId(null);
  };

  const getTipoName = (id) => tiposMap[id] || '-';
  const getCategoriaName = (id) => categoriasMap[id] || '-';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 min-h-screen bg-muted">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
            <Package className="h-8 w-8 text-blue-600" />
            Produtos e Serviços
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu catálogo de produtos, estoques e serviços.
          </p>
        </div>
        <Button onClick={() => navigate('/cadastros/produtos/novo')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>

      <div className="bg-background rounded-lg border border-border shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou EAN..."
              className="pl-9 text-foreground bg-background border-border"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <Select
            value={filters.tipo}
            onValueChange={(val) => setFilters(prev => ({ ...prev, tipo: val }))}
          >
            <SelectTrigger className="bg-background text-foreground border-border">
              <SelectValue placeholder="Tipo de Produto" />
            </SelectTrigger>
            <SelectContent className="bg-background text-foreground">
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {tiposList.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
          >
            <SelectTrigger className="bg-background text-foreground border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background text-foreground">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.categoria}
            onValueChange={(val) => setFilters(prev => ({ ...prev, categoria: val }))}
          >
            <SelectTrigger className="bg-background text-foreground border-border">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="bg-background text-foreground">
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {categoriasList.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="border-b border-border">
                <TableHead className="text-foreground font-semibold">Produto</TableHead>
                <TableHead className="text-foreground font-semibold">Código Interno</TableHead>
                <TableHead className="text-foreground font-semibold">Tipo</TableHead>
                <TableHead className="text-foreground font-semibold">Categoria</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Preço Venda</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Estoque</TableHead>
                <TableHead className="text-center text-foreground font-semibold">Status</TableHead>
                <TableHead className="text-right text-foreground font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id} className="border-b border-border hover:bg-muted">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{item.nome}</span>
                        {item.codigo_barras && (
                          <span className="text-xs text-muted-foreground font-normal">EAN: {item.codigo_barras}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{item.sku || '-'}</TableCell>
                    <TableCell className="text-foreground">{getTipoName(item.tipo_produto_id)}</TableCell>
                    <TableCell className="text-foreground">{getCategoriaName(item.categoria_id)}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(item.preco_venda)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {item.controla_estoque ? (
                        <span className={item.estoque_atual <= (item.estoque_minimo || 0) ? "text-red-600 font-bold" : ""}>
                          {item.estoque_atual} {item.unidade_medida}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={item.ativo ? 'success' : 'secondary'} className={item.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-foreground'}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/30" onClick={() => navigate(`/cadastros/produtos/${item.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30" onClick={() => setDeleteId(item.id)}>
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
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação não pode ser desfeita. O produto será permanentemente excluído do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProdutosList;
