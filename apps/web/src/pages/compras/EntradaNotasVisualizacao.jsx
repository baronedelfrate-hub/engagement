import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import FormularioEntradaManualModal from '@/pages/compras/notas-fiscais/components/FormularioEntradaManualModal';

const EntradaNotasVisualizacao = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState(null);

  const loadData = () => {
    setLoading(true);
    // Using NOTAS_FISCAIS_ENTRADA as the source of truth for "Entrada de Notas"
    const data = storage.get('NOTAS_FISCAIS_ENTRADA') || [];
    // Sort by newest
    const sorted = data.sort((a, b) => new Date(b.data_emissao) - new Date(a.data_emissao));
    setNotas(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta nota? Isso pode afetar contas a pagar vinculadas.')) {
      storage.delete('NOTAS_FISCAIS_ENTRADA', id);
      // Optional: Delete related Payables? For safety, we keep them or manual cleanup might be needed.
      // Just deleting the note for now as requested.
      toast({ title: "Sucesso", description: "Nota excluída com sucesso." });
      loadData();
    }
  };

  const handleEdit = (nota) => {
    setSelectedNota(nota);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedNota(null);
    setIsModalOpen(true);
  };

  const columns = [
    {
      header: 'Número',
      accessor: 'numero',
      render: (row) => <span className="font-mono font-bold">{row.numero}</span>
    },
    {
      header: 'Fornecedor',
      accessor: 'emitente_nome',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.emitente_nome}</span>
          <span className="text-xs text-muted-foreground">{row.emitente_cnpj}</span>
        </div>
      )
    },
    {
      header: 'Emissão',
      accessor: 'data_emissao',
      render: (row) => new Date(row.data_emissao).toLocaleDateString()
    },
    {
      header: 'Valor',
      accessor: 'valor_total',
      render: (row) => (
        <span className="font-bold text-emerald-600">
          R$ {parseFloat(row.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="Editar">
            <Edit className="h-4 w-4 text-amber-500" />
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
        notaToEdit={selectedNota}
      />
    </>
  );
};

export default EntradaNotasVisualizacao;