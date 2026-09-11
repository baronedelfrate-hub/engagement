/*
 * Integração Test Scenario (Manual):
 * 1. Create new Pedido de Venda with Produto and Serviço
 * 2. Save pedido
 * 3. Navigate to Fiscal → Pedidos de Venda
 * 4. Verify pedido appears in list
 * 5. Click "Gerar NF"
 * 6. Verify modal shows both "Gerar NFe" and "Gerar NFS-e" buttons
 * 7. Click each button and verify notes are generated (redirects to form)
 * 8. Verify success messages appear
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import PageHeader from '@/components/PageHeader';
import { FileText, FileCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateOnly } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';
import PedidosVendaFiscalFilters from './components/PedidosVendaFiscalFilters';
import GerarNFModal from './components/GerarNFModal';

export default function PedidosVendaFiscalPage() {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    numero: '',
    cliente: '',
    status: 'all',
    data_inicio: '',
    data_fim: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('pedidos_venda')
        .select('*, clientes!inner(nome)')
        .order('data_emissao', { ascending: false })
        .limit(100); // Pagination could be implemented here

      if (filters.numero) {
        query = query.ilike('numero', `%${filters.numero}%`);
      }
      if (filters.cliente) {
        query = query.ilike('clientes.nome', `%${filters.cliente}%`);
      }
      if (filters.status !== 'all') {
        query = query.eq('status_pedido', filters.status);
      }
      if (filters.data_inicio) {
        query = query.gte('data_emissao', filters.data_inicio);
      }
      if (filters.data_fim) {
        query = query.lte('data_emissao', filters.data_fim);
      }

      const { data: pedidos, error } = await query;
      if (error) throw error;
      
      setData(pedidos || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Falha ao buscar pedidos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearFilters = () => {
    setFilters({
      numero: '', cliente: '', status: 'all', data_inicio: '', data_fim: ''
    });
    setTimeout(loadData, 0);
  };

  const handleOpenModal = (pedido) => {
    setSelectedPedido(pedido);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/30">Confirmado</Badge>;
      case 'invoiced': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/30">Faturado</Badge>;
      case 'draft': return <Badge variant="outline" className="text-muted-foreground">Rascunho</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelado</Badge>;
      default: return <Badge variant="secondary">{status || 'N/A'}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <Helmet><title>Pedidos de Venda Fiscais | ERP Platform</title></Helmet>
      
      <PageHeader 
        title="Pedidos de Venda (Fiscal)" 
        description="Visualize os pedidos confirmados e inicie o faturamento gerando NF-e ou NFS-e."
        icon={FileText}
        breadcrumbs={[{ label: 'Fiscal', href: '/fiscal/dashboard' }, { label: 'Pedidos de Venda' }]}
      />

      <PedidosVendaFiscalFilters 
        filters={filters} 
        setFilters={setFilters} 
        onSearch={loadData} 
        onClear={handleClearFilters}
      />

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data Emissão</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    Carregando pedidos...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum pedido encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-primary">{item.numero}</TableCell>
                  <TableCell>{item.clientes?.nome}</TableCell>
                  <TableCell>{formatDateOnly(item.data_emissao)}</TableCell>
                  <TableCell className="font-medium">R$ {(item.valor_total || 0).toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(item.status_pedido || item.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenModal(item)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <FileCheck className="w-4 h-4 mr-2" />
                      Gerar NF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GerarNFModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPedido(null);
        }}
        pedido={selectedPedido}
      />
    </div>
  );
}