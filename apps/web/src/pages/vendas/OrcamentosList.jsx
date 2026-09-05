import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import CRUDTable from '@/components/CRUDTable';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useConversaoOrcamento } from '@/hooks/useConversaoOrcamento';
import ConversaoDialog from '@/components/ConversaoDialog';

const OrcamentosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Conversion Hook & State
  const { podeConverterOrcamento, converterOrcamentoParaPedido, isConverting } = useConversaoOrcamento();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('orcamentos')
            .select('*, cliente:clientes(nome)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        setData(data || []);
    } catch (error) {
        console.error(error);
        toast({ title: 'Erro', description: 'Falha ao carregar orçamentos.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConvertClick = (orcamento) => {
      setSelectedOrcamento(orcamento);
      setDialogOpen(true);
  };

  const handleConfirmConvert = async () => {
      if (!selectedOrcamento) return;
      const novoPedidoId = await converterOrcamentoParaPedido(selectedOrcamento.id);
      if (novoPedidoId) {
          setDialogOpen(false);
          navigate(`/vendas/pedidos/${novoPedidoId}`);
      }
  };

  const columns = [
    { header: 'Número', accessorKey: 'numero', sortable: true },
    { header: 'Cliente', accessorKey: 'cliente.nome', cell: ({ row }) => row.cliente?.nome || '-' },
    { header: 'Data Emissão', accessorKey: 'data_emissao', cell: ({ row }) => new Date(row.data_emissao).toLocaleDateString() },
    { 
        header: 'Valor Total', 
        accessorKey: 'valor_total',
        cell: ({ row }) => `R$ ${parseFloat(row.valor_total || 0).toFixed(2)}`
    },
    { 
        header: 'Status', 
        accessorKey: 'status',
        cell: ({ row }) => {
            const colors = {
                'pendente': 'secondary',
                'aprovado': 'success',
                'rejeitado': 'destructive',
                'enviado': 'primary'
            };
            return (
                <div className="flex flex-col gap-1 items-start">
                    <Badge variant={colors[row.status] || 'outline'}>{row.status}</Badge>
                    {row.status_conversao === 'convertido' && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">Convertido</Badge>
                    )}
                </div>
            );
        }
    },
    {
        header: 'Conversão',
        id: 'acoes_conversao',
        cell: ({ row }) => {
            if (row.status_conversao !== 'convertido' && podeConverterOrcamento(row.status)) {
                return (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={(e) => { e.stopPropagation(); handleConvertClick(row); }}
                    >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Para Pedido
                    </Button>
                );
            }
            return null;
        }
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Orçamentos de Venda"
        columns={columns}
        data={data}
        loading={loading}
        onCreate={() => navigate('/vendas/orcamentos/novo')}
        onEdit={(row) => navigate(`/vendas/orcamentos/${row.id}`)}
        onDelete={async (id) => {
            const { error } = await supabase.from('orcamentos').delete().eq('id', id);
            if (!error) fetchData();
            else toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }}
      />

      <ConversaoDialog 
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmConvert}
        isLoading={isConverting}
        titulo="Converter para Pedido de Venda"
        mensagem={`Deseja converter o orçamento ${selectedOrcamento?.numero} em um novo Pedido de Venda? Todos os itens serão copiados.`}
        botaoConfirmar="Converter Orçamento"
      />
    </div>
  );
};

export default OrcamentosList;