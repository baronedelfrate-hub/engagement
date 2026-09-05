import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Receipt, Building2, Package } from 'lucide-react';
import { validateNFeFields } from '@/lib/nfeFieldValidator';

const PedidosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
        const limit = 10;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('pedidos_venda')
            .select(`
                *,
                clientes (nome),
                empresas (razao_social),
                pedidos_venda_itens (count)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) throw error;
        
        setData(data || []);
        setPagination({ 
            page, 
            limit, 
            total: count || 0, 
            totalPages: Math.ceil((count || 0) / limit) 
        });
    } catch (error) {
        console.error(error);
        toast({ title: 'Erro', description: 'Falha ao carregar pedidos.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConvertToNFe = async (pedido) => {
      const { data: itens } = await supabase.from('pedidos_venda_itens').select('*').eq('pedido_id', pedido.id);
      const errors = validateNFeFields(pedido, itens || []);
      
      if (errors.length > 0) {
          toast({ 
              title: 'Erro de Validação NFe', 
              description: `Faltam dados obrigatórios. Verifique o pedido.`, 
              variant: 'destructive' 
          });
          navigate(`/vendas/pedidos/${pedido.id}`);
      } else {
          toast({ title: 'Redirecionando', description: 'Iniciando emissão de NFe...', variant: 'default' });
      }
  };

  const columns = [
    { header: 'Número', accessorKey: 'numero', sortable: true },
    { header: 'Data Emissão', accessorKey: 'data_emissao' },
    { 
        header: 'Cliente', 
        accessorKey: 'clientes.nome',
        cell: ({ row }) => row.clientes?.nome || 'Não Informado'
    },
    { 
        header: 'Empresa', 
        accessorKey: 'empresas.razao_social',
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-slate-400" />
                <span className="truncate max-w-[150px]" title={row.empresas?.razao_social}>
                    {row.empresas?.razao_social || 'Não Informada'}
                </span>
            </div>
        )
    },
    {
        header: 'Itens',
        accessorKey: 'pedidos_venda_itens',
        cell: ({ row }) => {
            const itensCount = row.pedidos_venda_itens?.[0]?.count || 0;
            return (
                <Badge variant={itensCount > 0 ? "secondary" : "outline"} className="flex items-center gap-1 w-max">
                    <Package className="w-3 h-3" />
                    {itensCount} {itensCount === 1 ? 'item' : 'itens'}
                </Badge>
            );
        }
    },
    { 
        header: 'Valor Total', 
        accessorKey: 'valor_total',
        cell: ({ row }) => `R$ ${parseFloat(row.valor_total || 0).toFixed(2)}`
    },
    { 
        header: 'Status', 
        accessorKey: 'status_pedido',
        cell: ({ row }) => {
            const statusConfig = {
                'draft': { label: 'Rascunho', color: 'bg-slate-100 text-slate-700' },
                'confirmed': { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
                'invoiced': { label: 'Faturado', color: 'bg-emerald-100 text-emerald-700' },
                'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
                'rascunho': { label: 'Rascunho', color: 'bg-slate-100 text-slate-700' }
            };
            const config = statusConfig[row.status_pedido || row.status] || { label: row.status_pedido, color: 'bg-gray-100 text-gray-700' };
            return (
                <span className={`px-2 py-1 rounded-full text-xs font-medium border border-transparent ${config.color}`}>
                    {config.label}
                </span>
            );
        }
    },
    {
        header: 'Ações NFe',
        id: 'acoes',
        cell: ({ row }) => {
            return (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => navigate(`/vendas/pedidos/${row.id}`)}>
                        <Edit className="h-4 w-4" />
                     </Button>
                     {(row.status_pedido === 'confirmed' || row.status === 'confirmado') && (
                        <Button variant="outline" size="sm" className="h-8 text-xs text-indigo-600 border-indigo-200 ml-2" onClick={() => handleConvertToNFe(row)}>
                            <Receipt className="h-3 w-3 mr-1" />
                            Gerar NFe
                        </Button>
                     )}
                </div>
            );
        }
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CRUDTable
        title="Pedidos de Venda"
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
        onPageChange={fetchData}
        onCreate={() => navigate('/vendas/pedidos/novo')}
        onEdit={(row) => navigate(`/vendas/pedidos/${row.id}`)}
        onDelete={async (id) => {
            const { error } = await supabase.from('pedidos_venda').delete().eq('id', id);
            if(!error) fetchData();
            else toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }}
      />
    </div>
  );
};

export default PedidosList;