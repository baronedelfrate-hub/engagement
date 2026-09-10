import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Download, BarChart3, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function FichaTecnicaList() {
  const { toast } = useToast();
  const [fichas, setFichas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fichas_custo')
        .select('*, produtos(nome, sku, preco_venda)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      setFichas(data || []);
      prepareChartData(data || []);
    } catch (error) {
      console.error('[FichaTecnicaList] Erro ao carregar dados:', error);
      toast({ title: "Erro", description: "Não foi possível carregar as fichas técnicas.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (fichas) => {
    const data = fichas
      .filter(f => f.produtos?.preco_venda > 0)
      .map(f => ({
        name: f.numero || f.produtos?.sku,
        Custo: parseFloat(f.valor_total || 0),
        PrecoVenda: parseFloat(f.produtos.preco_venda || 0),
        Margem: parseFloat(f.produtos.preco_venda || 0) - parseFloat(f.valor_total || 0)
      }))
      .slice(0, 10); // Top 10 for readability
    setChartData(data);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Excluir esta ficha técnica?')) {
      const { error } = await supabase.from('fichas_custo').delete().eq('id', id);
      if (error) {
        toast({ title: "Erro", description: error.message || "Não foi possível excluir.", variant: "destructive" });
        return;
      }
      loadData();
      toast({ title: "Excluído", description: "Registro removido." });
    }
  };

  const exportCSV = () => {
    const headers = ['Numero', 'Produto', 'Status', 'Custo Total'];
    const rows = fichas.map(f => [
      f.numero,
      f.produtos?.nome || '-',
      f.status,
      parseFloat(f.valor_total || 0).toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fichas_tecnicas.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredFichas = fichas.filter(item =>
    item.produtos?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.numero?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Número', accessor: 'numero' },
    { header: 'Produto', render: (item) => item.produtos?.nome || '-' },
    { header: 'Status', render: (item) => <span className="bg-muted px-2 py-1 rounded text-xs font-mono">{item.status || '-'}</span> },
    { header: 'Data Criação', render: (item) => item.data_criacao ? new Date(item.data_criacao).toLocaleDateString() : '-' },
    { header: 'Custo Total', render: (item) => `R$ ${parseFloat(item.valor_total || 0).toFixed(2)}` },
    {
      header: 'Ações',
      render: (item) => (
        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Excluir">
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      )
    }
  ];

  return (
    <>
      <Helmet><title>Ficha Técnica - Custos</title></Helmet>
      <PageHeader
        title="Fichas Técnicas"
        description="Gestão de custos padrão e engenharia de produto"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsReportsOpen(true)} className="gap-2">
              <BarChart3 className="h-4 w-4" /> Análise de Margem
            </Button>
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        }
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por número ou produto..." />
      </div>
      <DataTable
        data={filteredFichas}
        columns={columns}
        loading={loading}
        emptyMessage="Nenhuma ficha técnica cadastrada"
      />

      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Análise de Margem (Custo Padrão vs Preço Venda)</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(val) => `R$ ${val.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Custo" fill="#ef4444" name="Custo Padrão" />
                  <Bar dataKey="PrecoVenda" fill="#3b82f6" name="Preço Venda" />
                  <Bar dataKey="Margem" fill="#22c55e" name="Margem Bruta" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              *Comparação baseada no produto vinculado na ficha técnica.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FichaTecnicaList;
