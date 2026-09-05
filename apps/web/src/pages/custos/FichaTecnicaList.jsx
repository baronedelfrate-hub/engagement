import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function FichaTecnicaList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fichas, setFichas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = storage.get('FICHA_TECNICA');
    setFichas(data);
    const prod = storage.get('PRODUTOS');
    setProdutos(prod);
    prepareChartData(data, prod);
  };

  const prepareChartData = (fichas, produtos) => {
      const data = fichas.map(f => {
          const linkedProd = produtos.find(p => p.codigo === f.codigo);
          return {
              name: f.codigo,
              Custo: parseFloat(f.custo_unitario_final || 0),
              PrecoVenda: linkedProd ? parseFloat(linkedProd.preco || 0) : 0,
              Margem: linkedProd ? (parseFloat(linkedProd.preco) - parseFloat(f.custo_unitario_final)) : 0
          };
      }).filter(i => i.PrecoVenda > 0).slice(0, 10); // Top 10 for readability
      setChartData(data);
  };

  const handleEdit = (id) => {
    navigate(`/custos/ficha-tecnica/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir esta ficha técnica?')) {
      storage.delete('FICHA_TECNICA', id);
      loadData();
      toast({ title: "Excluído", description: "Registro removido." });
    }
  };

  const exportCSV = () => {
    const headers = ['Codigo', 'Nome', 'Versao', 'Custo Final', 'Rendimento'];
    const rows = fichas.map(f => [
        f.codigo,
        f.nome,
        f.versao,
        parseFloat(f.custo_unitario_final).toFixed(2),
        f.rendimento + '%'
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
  };

  const filteredFichas = fichas.filter(item =>
    item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { header: 'Código', accessor: 'codigo' },
    { header: 'Produto / Nome', accessor: 'nome' },
    { header: 'Versão', render: (item) => <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{item.versao}</span> },
    { header: 'Rendimento', render: (item) => `${item.rendimento}%` },
    { header: 'Custo Unit.', render: (item) => `R$ ${parseFloat(item.custo_unitario_final || 0).toFixed(2)}` }
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
            <Button onClick={() => navigate('/custos/ficha-tecnica/novo')} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Ficha
            </Button>
          </div>
        }
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por código ou nome..." />
      </div>
      <DataTable
        data={filteredFichas}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
                <p className="text-xs text-slate-500 mt-2 text-center">
                    *Comparação baseada no código do produto vinculado na ficha técnica e no cadastro de produtos.
                </p>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FichaTecnicaList;