import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpCircle, CheckCircle2, Search, Play, Filter, MoreHorizontal, Pencil, Trash } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { useCobrancaIntegrated } from '@/hooks/useCobrancaIntegrated';
import CobrancaCardModalIntegrated from './cobranca/CobrancaCardModalIntegrated';
import { calculatePhaseFromDueDate } from '@/lib/cobrancaService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function ContasReceberList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateStatusCobranca } = useCobrancaIntegrated();

  const [contas, setContas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedForAction, setSelectedForAction] = useState(null);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('contas-receber-list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_receber' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('contas_receber')
            .select(`
                id,
                numero,
                cliente_id,
                data_emissao,
                data_vencimento,
                valor_original,
                valor_recebido,
                status,
                observacoes,
                status_cobranca,
                data_baixa,
                observacoes_cobranca,
                numero_parcelas,
                parcela_atual,
                parcela_grupo_id,
                intervalo_dias,
                cliente:clientes(nome),
                empresa:empresas(nome_fantasia, razao_social),
                banco:bancos(nome),
                categoria:categorias(nome),
                subcategoria:subcategorias(nome),
                centro_custo:centros_custo(nome),
                tipo_pagamento:tipos_pagamento(nome),
                condicao_pagamento:condicoes_pagamento(nome),
                tipo_documento:tipos_documento(nome),
                origem:origens(nome)
            `)
            .order('data_vencimento', { ascending: true });
            
        if (error) throw error;
        setContas(data || []);
    } catch (error) {
        console.error("Erro ao carregar:", error);
        toast({ title: "Erro", description: "Falha ao carregar lista: " + error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleStartCobranca = async (id) => {
    await updateStatusCobranca(id, 'em_cobranca');
    toast({ title: "Cobrança Iniciada", description: "O título foi enviado para o Kanban." });
  };
  
  const handleDelete = async (id) => {
    if(!window.confirm("Tem certeza que deseja excluir este título?")) return;
    try {
        const { error } = await supabase.from('contas_receber').delete().eq('id', id);
        if(error) throw error;
        toast({ title: "Sucesso", description: "Título excluído com sucesso." });
        loadData();
    } catch (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const filteredContas = contas.filter(conta => {
    const term = searchTerm.toLowerCase();
    return (
        (conta.cliente?.nome || '').toLowerCase().includes(term) ||
        (conta.numero || '').toLowerCase().includes(term) ||
        (conta.banco?.nome || '').toLowerCase().includes(term) ||
        (conta.categoria?.nome || '').toLowerCase().includes(term)
    );
  });

  const columns = [
    { 
        header: 'Nº Título', 
        accessorKey: 'numero', 
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="text-slate-200 font-mono">{row.numero}</span>
                {/* Parcelamento Badge logic */}
                {row.numero_parcelas > 1 ? (
                    <Badge variant="secondary" className="w-fit mt-1 text-[10px] bg-blue-900/30 text-blue-300 hover:bg-blue-900/40">
                        Parcela {row.parcela_atual}/{row.numero_parcelas}
                    </Badge>
                ) : (
                    <span className="text-[10px] text-slate-500 mt-1">Única</span>
                )}
            </div>
        )
    },
    { 
        header: 'Cliente', 
        accessorKey: 'cliente.nome', 
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="text-slate-300 font-medium">{row.cliente?.nome || '-'}</span>
                <span className="text-[10px] text-slate-500">{row.centro_custo?.nome}</span>
            </div>
        )
    },
    { 
        header: 'Classificação',
        id: 'classificacao',
        cell: ({ row }) => (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
                {row.categoria && <Badge variant="secondary" className="bg-slate-800 text-[10px]">{row.categoria.nome}</Badge>}
                {row.banco && <Badge variant="outline" className="border-slate-700 text-[10px]">{row.banco.nome}</Badge>}
            </div>
        )
    },
    { header: 'Vencimento', accessorKey: 'data_vencimento', cell: ({ row }) => <span className="text-slate-400 text-sm">{new Date(row.data_vencimento).toLocaleDateString()}</span> },
    {
        header: 'Status',
        id: 'status_cobranca',
        cell: ({ row }) => {
             const { dias_ate_vencimento } = calculatePhaseFromDueDate(row.data_vencimento, row.status_cobranca, row.data_baixa);
             
             let badgeColor = 'bg-slate-800 text-slate-400';
             if (row.status_cobranca === 'em_cobranca') badgeColor = 'bg-blue-900/30 text-blue-400 border-blue-800';
             if (row.status_cobranca === 'recuperado' || row.status === 'Pago') badgeColor = 'bg-emerald-900/30 text-emerald-400 border-emerald-800';

             let timeColor = 'text-emerald-500';
             if (dias_ate_vencimento < 1 && dias_ate_vencimento >= -5) timeColor = 'text-yellow-500';
             if (dias_ate_vencimento < -5) timeColor = 'text-red-500';

             return (
                 <div className="flex flex-col gap-1">
                    <Badge variant="outline" className={`${badgeColor} border w-fit`}>
                        {row.status === 'Pago' ? 'Pago' : (row.status_cobranca === 'nao_iniciada' ? 'Pendente' : row.status_cobranca === 'em_cobranca' ? 'Em Cobrança' : 'Recuperado')}
                    </Badge>
                    {row.status_cobranca !== 'recuperado' && row.status !== 'Pago' && (
                         <span className={`text-[10px] font-mono ${timeColor}`}>
                            {dias_ate_vencimento < 0 ? `${Math.abs(dias_ate_vencimento)}d atraso` : `${dias_ate_vencimento}d prazo`}
                         </span>
                    )}
                 </div>
             )
        }
    },
    { header: 'Valor', accessorKey: 'valor_original', cell: ({ row }) => <span className="font-bold text-emerald-400">R$ {parseFloat(row.valor_original || 0).toFixed(2)}</span> },
    {
        header: 'Ações',
        id: 'actions',
        cell: ({ row }) => (
            <div className="flex gap-2 justify-end items-center">
                 {row.status_cobranca === 'nao_iniciada' && row.status !== 'Pago' && (
                     <Button size="sm" variant="ghost" onClick={() => handleStartCobranca(row.id)} title="Iniciar Cobrança" className="h-8 w-8 text-blue-500 hover:text-blue-300">
                        <Play className="w-4 h-4" />
                    </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                    <DropdownMenuItem onClick={() => navigate(`/financeiro/contas-receber/${row.id}`)} className="focus:bg-slate-800 cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    {row.status_cobranca !== 'recuperado' && row.status !== 'Pago' && (
                         <DropdownMenuItem onClick={() => setSelectedForAction(row)} className="focus:bg-slate-800 cursor-pointer text-emerald-500 focus:text-emerald-400">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Registrar Pagamento
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleDelete(row.id)} className="focus:bg-red-900/30 text-red-500 focus:text-red-400 cursor-pointer">
                        <Trash className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )
    }
  ];

  return (
    <>
      <Helmet><title>Contas a Receber</title></Helmet>
      <PageHeader
        title="Contas a Receber"
        description="Controle financeiro e integração com cobrança."
        action={
          <Button onClick={() => navigate('/financeiro/contas-receber/novo')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Nova Conta
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Buscar por cliente, título, banco ou categoria..." 
                className="pl-9 bg-slate-900 border-slate-700"
            />
        </div>
        <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-900/20 rounded-full"><ArrowUpCircle className="h-6 w-6 text-emerald-500" /></div>
                    <div>
                        <span className="text-xs font-medium text-slate-400">Total a Receber</span>
                        <div className="text-xl font-bold text-emerald-500">
                            R$ {filteredContas.reduce((acc, curr) => acc + parseFloat(curr.valor_original || 0), 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <DataTable data={filteredContas} columns={columns} loading={loading} />

      {selectedForAction && (
        <CobrancaCardModalIntegrated 
            isOpen={!!selectedForAction} 
            card={selectedForAction} 
            onClose={() => setSelectedForAction(null)}
            onSuccess={() => { loadData(); setSelectedForAction(null); }}
        />
      )}
    </>
  );
}

export default ContasReceberList;