import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, MessageSquare, BarChart2, RefreshCw, Filter, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { generatePDF, generateWhatsAppLink } from '@/lib/documents';
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
  
  // Search & Filters
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
      const fornecedorName = (getFornecedorName(pedido.fornecedorId) || '').toLowerCase();
      const numero = (pedido.numeroPedido || '').toLowerCase();
      const id = (pedido.id || '').toLowerCase();
      
      const matchesSearch = fornecedorName.includes(term) || numero.includes(term) || id.includes(term);
      const matchesFornecedor = selectedFornecedor === 'all' || pedido.fornecedorId === selectedFornecedor;

      return matchesSearch && matchesFornecedor;
    });
    setFilteredPedidos(filtered);
  }, [searchTerm, selectedFornecedor, pedidos, fornecedores]);

  const loadData = () => {
    setIsLoading(true);
    try {
      console.log('Loading Purchase Orders...');
      const pedidosData = storage.get('PEDIDOS_COMPRA') || [];
      const fornecedoresData = storage.get('FORNECEDORES') || [];
      
      setPedidos(pedidosData);
      setFornecedores(fornecedoresData);
    } catch (error) {
      console.error('Error loading data:', error);
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
    return fornecedor ? (fornecedor.nome || fornecedor.razao_social || 'Fornecedor sem nome') : 'Fornecedor não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/compras/pedidos/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido de compra?')) {
      try {
        storage.delete('PEDIDOS_COMPRA', id);
        loadData();
        toast({
          title: "Pedido excluído",
          description: "O pedido de compra foi removido com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: "Ocorreu um erro ao tentar excluir o pedido.",
          variant: "destructive"
        });
      }
    }
  };

  const handlePDF = (pedido) => {
    try {
      const fornecedorName = getFornecedorName(pedido.fornecedorId);
      generatePDF('Pedido Compra', pedido, fornecedorName);
      toast({ title: "PDF Gerado", description: "O download iniciará em instantes." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro no PDF", description: "Não foi possível gerar o PDF.", variant: "destructive" });
    }
  };

  const handleWhatsApp = (pedido) => {
    try {
      const fornecedorName = getFornecedorName(pedido.fornecedorId);
      const link = generateWhatsAppLink('Pedido Compra', pedido, fornecedorName);
      window.open(link, '_blank');
    } catch (error) {
      console.error(error);
      toast({ title: "Erro no WhatsApp", description: "Não foi possível gerar o link.", variant: "destructive" });
    }
  };

  // Reports Logic
  const totalByFornecedor = pedidos.reduce((acc, curr) => {
    const name = getFornecedorName(curr.fornecedorId);
    const total = (curr.itens || []).reduce((s, i) => s + parseFloat(i.valorTotal || 0), 0);
    acc[name] = (acc[name] || 0) + total;
    return acc;
  }, {});

  const divergentOrders = pedidos.filter(p => p.divergencias && p.divergencias.length > 0);

  const columns = [
    { header: 'Nº Pedido', accessor: 'numeroPedido' },
    { 
      header: 'Fornecedor', 
      render: (item) => getFornecedorName(item.fornecedorId)
    },
    { 
      header: 'Data Emissão', 
      render: (item) => item.dataEmissao ? new Date(item.dataEmissao).toLocaleDateString() : '-'
    },
    {
        header: 'Status',
        render: (item) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium 
                ${item.status === 'Recebido' ? 'bg-green-100 text-green-700 border border-green-200' : 
                  item.status === 'Parcialmente Recebido' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                  'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                {item.status || 'Aberto'}
            </span>
        )
    },
    {
      header: 'Total',
      render: (item) => `R$ ${(item.itens || []).reduce((acc, curr) => acc + parseFloat(curr.valorTotal || 0), 0).toFixed(2)}`
    },
    {
      header: 'Docs',
      render: (item) => (
        <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50/20" onClick={(e) => { e.stopPropagation(); handlePDF(item); }}>
                <FileText className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50/20" onClick={(e) => { e.stopPropagation(); handleWhatsApp(item); }}>
                <MessageSquare className="h-4 w-4" />
            </Button>
        </div>
      )
    }
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
                            <SelectItem key={f.id} value={f.id}>{f.nome || f.razao_social}</SelectItem>
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
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={isLoading}
          emptyMessage="Nenhum pedido de compra encontrado"
      />

      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent className="max-w-3xl bg-card text-card-foreground">
            <DialogHeader>
                <DialogTitle>Relatórios de Compras</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
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
                <div className="border border-red-200 rounded-lg p-4 bg-red-50/10 dark:bg-red-900/10">
                    <h3 className="font-bold mb-3 text-sm text-red-600 dark:text-red-400">Compras com Divergência</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {divergentOrders.length > 0 ? divergentOrders.map(p => (
                            <div key={p.id} className="text-sm border-b border-red-100 dark:border-red-900/30 pb-2 mb-2">
                                <div className="font-medium text-red-600 dark:text-red-400">Pedido #{p.numeroPedido}</div>
                                <p className="text-xs text-red-500/70">{getFornecedorName(p.fornecedorId)}</p>
                                <ul className="list-disc list-inside text-xs text-red-500 mt-1">
                                    {p.divergencias.map((d, i) => (
                                        <li key={i}>{d.justificativa}</li>
                                    ))}
                                </ul>
                            </div>
                        )) : <p className="text-xs text-muted-foreground">Nenhuma divergência registrada.</p>}
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PedidosCompraList;