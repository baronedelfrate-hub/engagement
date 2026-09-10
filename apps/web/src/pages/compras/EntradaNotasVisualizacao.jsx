import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import FormularioEntradaManualModal from '@/pages/compras/notas-fiscais/components/FormularioEntradaManualModal';

const EntradaNotasVisualizacao = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notas, setNotas] = useState([]);
  const [fornecedoresMap, setFornecedoresMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notasRes, fornecedoresRes] = await Promise.all([
        supabase.from('notas_fiscais_entrada').select('*').order('data_emissao', { ascending: false }),
        supabase.from('fornecedores').select('id, nome, fantasia, cnpj'),
      ]);
      if (notasRes.error) throw notasRes.error;
      const map = {};
      (fornecedoresRes.data || []).forEach(f => { map[f.id] = f; });
      setFornecedoresMap(map);
      setNotas(notasRes.data || []);
    } catch (error) {
      console.error('[EntradaNotasVisualizacao] Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar as notas fiscais.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta nota? Isso pode afetar contas a pagar vinculadas.')) {
      const { error } = await supabase.from('notas_fiscais_entrada').delete().eq('id', id);
      if (error) {
        toast({ title: "Erro", description: error.message || "Não foi possível excluir.", variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: "Nota excluída com sucesso." });
      loadData();
    }
  };

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const columns = [
    {
      header: 'Número',
      accessor: 'numero_nfe',
      render: (row) => <span className="font-mono font-bold">{row.numero_nfe}</span>
    },
    {
      header: 'Fornecedor',
      render: (row) => {
        const f = fornecedoresMap[row.fornecedor_id];
        return (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{f?.fantasia || f?.nome || '-'}</span>
            <span className="text-xs text-muted-foreground">{f?.cnpj}</span>
          </div>
        );
      }
    },
    {
      header: 'Emissão',
      accessor: 'data_emissao',
      render: (row) => row.data_emissao ? new Date(row.data_emissao).toLocaleDateString() : '-'
    },
    {
      header: 'Valor',
      accessor: 'valor_total',
      render: (row) => (
        <span className="font-bold text-emerald-600">
          R$ {parseFloat(row.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const colors = {
          'Pendente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400',
          'Concluida': 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400',
          'Rejeitada': 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400',
          'Em_Entrada': 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
        };
        return <Badge className={`${colors[row.status] || 'bg-muted'} border-none`}>{row.status}</Badge>;
      }
    },
    {
      header: 'Ações',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/compras/entrada-notas/${row.id}`)} title="Visualizar Detalhes">
            <Eye className="h-4 w-4 text-blue-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)} title="Excluir">
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Histórico de Notas</h2>
        <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Nova Entrada
        </Button>
      </div>

      <DataTable
        data={notas}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhuma nota fiscal encontrada."
      />

      <FormularioEntradaManualModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </>
  );
};

export default EntradaNotasVisualizacao;
