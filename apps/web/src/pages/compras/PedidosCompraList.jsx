import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, BarChart2, RefreshCw, Filter, X, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDateOnly } from '@/lib/dateUtils';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function PedidosCompraList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState([]);
  const [filteredPedidos, setFilteredPedidos] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFornecedor, setSelectedFornecedor] = useState('all');

  const [fornecedores, setFornecedores] = useState([]);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!pedidos.length) {
      setFilteredPedidos([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = pedidos.filter(pedido => {
      const fornecedorName = (getFornecedorName(pedido.fornecedor_id) || '').toLowerCase();
      const numero = (pedido.numero || '').toLowerCase();
      const id = (pedido.id || '').toLowerCase();

      const matchesSearch = fornecedorName.includes(term) || numero.includes(term) || id.includes(term);
      const matchesFornecedor = selectedFornecedor === 'all' || pedido.fornecedor_id === selectedFornecedor;

      return matchesSearch && matchesFornecedor;
    });
    setFilteredPedidos(filtered);
  }, [searchTerm, selectedFornecedor, pedidos, fornecedores]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [{ data: pedidosData, error: pedidosError }, { data: fornecedoresData }] = await Promise.all([
        supabase.from('pedidos_compra').select('*').order('created_at', { ascending: false }),
        supabase.from('fornecedores').select('id, nome'),
      ]);
      if (pedidosError) throw pedidosError;

      setPedidos(pedidosData || []);
      setFornecedores(fornecedoresData || []);
    } catch (error) {
      console.error('[PedidosCompraList] Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar os pedidos de compra.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFornecedorName = (id) => {
    const fornecedor = fornecedores.find(f => f.id === id);
    return fornecedor ? (fornecedor.nome || 'Fornecedor sem nome') : 'Fornecedor não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/compras/pedidos/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido de compra?')) {
      try {
        const { error } = await supabase.from('pedidos_compra').delete().eq('id', id);
        if (error) throw error;
        loadData();
        toast({
          title: "Pedido excluído",
          description: "O pedido de compra foi removido com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: error.message || "Ocorreu um erro ao tentar excluir o pedido.",
          variant: "destructive"
        });
      }
    }
  };

  // Reports Logic
  const totalByFornecedor = pedidos.reduce((acc, curr) => {
    const name = getFornecedorName(curr.fornecedor_id);
    acc[name] = (acc[name] || 0) + parseFloat(curr.valor_total || 0);
    return acc;
  }, {});

  const columns = [
    { header: 'Nº Pedido', accessor: 'numero' },
    {
      header: 'Fornecedor',
      render: (item) => getFornecedorName(item.fornecedor_id)
    },
    {
      header: 'Data Pedido',
      render: (item) => formatDateOnly(item.data_pedido)
    },
    {
      header: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium
                ${item.status === 'Concluido' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' :
            item.status === 'Em_Entrada' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800' :
              'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'}`}>
          {item.status || 'Aberto'}
        </span>
      )
    },
    {
      header: 'Total',
      render: (item) => `R$ ${parseFloat(item.valor_total || 0).toFixed(2)}`
    },
    {
      header: 'Ações',
      render: (item) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)} title="Editar">
            <Pencil className="h-4 w-4 text-blue-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Excluir">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <Helmet>
        <title>Pedidos de Compra - ERP Platform</title>
        <meta name="description" content="Manage purchase orders in your ERP system" />
      </Helmet>

      <PageHeader
        title="Pedidos de Compra"
        description="Gerencie seus pedidos de compra e aquisições"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} title="Recarregar dados">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" onClick={() => setIsReportsOpen(true)} className="gap-2">
              <BarChart2 className="h-4 w-4" /> Relatórios
            </Button>
            <Button onClick={() => navigate('/compras/pedidos/novo')} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          </div>
        }
      />

      <div className="bg-card p-4 rounded-xl shadow-sm border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por número ou ID..."
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedFornecedor} onValueChange={setSelectedFornecedor}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Fornecedores</SelectItem>
                {fornecedores.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFornecedor !== 'all' && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedFornecedor('all')}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        data={filteredPedidos}
        columns={columns}
        loading={isLoading}
        emptyMessage="Nenhum pedido de compra encontrado"
      />

      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent className="max-w-lg bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle>Relatórios de Compras</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <h3 className="font-bold mb-3 text-sm">Total Comprado por Fornecedor</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {Object.entries(totalByFornecedor).length > 0 ? Object.entries(totalByFornecedor).map(([name, total]) => (
                  <div key={name} className="flex justify-between text-sm border-b border-border pb-1">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-mono font-bold">R$ {total.toFixed(2)}</span>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Sem dados.</p>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PedidosCompraList;
