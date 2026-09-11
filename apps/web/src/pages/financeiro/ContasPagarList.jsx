import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, Trash, Loader2, AlertCircle, Layers, Search, Filter, Group } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import ContasPagarParcelasModal from './components/ContasPagarParcelasModal';
import { Input } from '@/components/ui/input';
import { formatDateOnly } from '@/lib/dateUtils';

const ContasPagarList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isParcelasModalOpen, setIsParcelasModalOpen] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
        // Query now explicitly fetches parcelamento columns (although * includes them, being explicit helps with intent)
        const { data: result, error } = await supabase
            .from('contas_pagar')
            .select(`*, fornecedor:fornecedores(nome), banco:bancos(nome), categoria:categorias(nome)`)
            .order('data_vencimento', { ascending: true });

        if (error) throw error;
        setData(result || []);
    } catch (error) {
      console.error('Error loading contas pagar:', error);
      setError(error.message);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, grupoId) => {
    let confirmMessage = 'Confirma exclusão deste título?';
    if (grupoId) {
        if (window.confirm('Este título faz parte de um parcelamento. Clique OK para excluir TODAS as parcelas do grupo, ou Cancelar para abortar.')) {
             try {
                const { error } = await supabase.from('contas_pagar').delete().eq('parcela_grupo_id', grupoId);
                if (error) throw error;
                toast({ title: "Grupo excluído com sucesso" });
                loadData();
            } catch(e) {
                toast({ title: "Erro", description: e.message, variant: "destructive" });
            }
        } else {
             if (window.confirm('Deseja excluir APENAS esta parcela?')) {
                 try {
                    const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
                    if (error) throw error;
                    toast({ title: "Parcela excluída" });
                    loadData();
                } catch(e) {
                    toast({ title: "Erro", description: e.message, variant: "destructive" });
                }
             }
        }
    } else {
        if (!window.confirm(confirmMessage)) return;
        try {
            const { error } = await supabase.from('contas_pagar').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Conta excluída" });
            loadData();
        } catch(e) {
            toast({ title: "Erro", description: e.message, variant: "destructive" });
        }
    }
  };

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
        (item.fornecedor?.nome || '').toLowerCase().includes(term) ||
        (item.numero || '').toLowerCase().includes(term) ||
        (item.categoria?.nome || '').toLowerCase().includes(term)
    );
  });

  const columns = [
    { 
      header: "Nº Título", 
      accessorKey: "numero", 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-mono text-muted-foreground">{row.numero}</span>
          {/* Correctly checking numero_parcelas > 1 to show badge */}
          {row.numero_parcelas > 1 && (
            <div className="flex gap-1 items-center mt-1">
                <Badge variant="secondary" className="w-fit text-[10px] bg-blue-900/30 text-blue-300">
                  {row.parcela_atual}/{row.numero_parcelas}
                </Badge>
                {row.intervalo_dias && (
                    <span className="text-[10px] text-muted-foreground">
                        {row.intervalo_dias}d
                    </span>
                )}
            </div>
          )}
        </div>
      )
    },
    { 
        header: "Fornecedor", 
        accessorKey: "fornecedor.nome", 
        cell: ({ row }) => <span className="text-muted-foreground font-medium">{row.fornecedor?.nome || '-'}</span>
    },
    { 
        header: "Classificação",
        id: "classificacao",
        cell: ({ row }) => (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
                {row.categoria && <Badge variant="secondary" className="bg-purple-900/20 text-[10px]">{row.categoria.nome}</Badge>}
                {row.banco && <Badge variant="outline" className="border-border text-[10px]">{row.banco.nome}</Badge>}
            </div>
        )
    },
    { header: "Valor", accessorKey: "valor_original", cell: ({ row }) => <span className="font-medium text-foreground">R$ {parseFloat(row.valor_original).toFixed(2)}</span> },
    { header: "Vencimento", accessorKey: "data_vencimento", cell: ({ row }) => <span className="text-muted-foreground">{formatDateOnly(row.data_vencimento)}</span> },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.status}</Badge>
    },
    {
      header: "Ações",
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/financeiro/contas-pagar/${row.id}`)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
            {row.parcela_grupo_id && (
                <DropdownMenuItem onClick={() => { setSelectedGrupoId(row.parcela_grupo_id); setIsParcelasModalOpen(true); }}>
                    <Layers className="mr-2 h-4 w-4" /> Ver Grupo ({row.numero_parcelas})
                </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDelete(row.id, row.parcela_grupo_id)} className="text-red-500 focus:text-red-600">
                <Trash className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const getRowClassName = (row) => {
    if (row.parcela_grupo_id) {
        // Simple hash for consistent colors per group
        const groupId = row.parcela_grupo_id;
        const hash = groupId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = [
            'border-l-sky-700', 
            'border-l-teal-700',
            'border-l-indigo-700',
            'border-l-fuchsia-700',
            'border-l-orange-700',
            'border-l-emerald-700'
        ];
        return `border-l-4 ${colors[hash % colors.length]}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Contas a Pagar" 
        description="Gestão de pagamentos e parcelamentos."
        action={<Button onClick={() => navigate('/financeiro/contas-pagar/novo')} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Novo Lançamento</Button>}
      />
      
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar fornecedor, título ou categoria..."
                className="pl-9 bg-background border-border"
            />
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Erro</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      
      {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground"/></div> : <DataTable columns={columns} data={filteredData} rowClassName={getRowClassName} />}
      
      <ContasPagarParcelasModal isOpen={isParcelasModalOpen} onClose={() => setIsParcelasModalOpen(false)} grupoId={selectedGrupoId} />
    </div>
  );
};

export default ContasPagarList;