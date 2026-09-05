import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Building2, MapPin } from 'lucide-react';
import { erpServices } from '@/lib/erpServices';
import CRUDTable from '@/components/CRUDTable';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

const EmpresasList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { success, data, error } = await erpServices.empresas.list({ limit: 100 });
        if (success) {
            setEmpresas(data || []);
            setFilteredData(data || []);
        } else {
            throw new Error(error);
        }
    } catch (error) {
        console.error("Erro ao carregar empresas:", error);
        toast({ title: 'Erro', description: 'Falha ao carregar empresas.', variant: 'destructive' });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (term) => {
    if (!term) {
        setFilteredData(empresas);
        return;
    }
    const filtered = empresas.filter(emp => 
      emp.razao_social?.toLowerCase().includes(term.toLowerCase()) ||
      emp.nome_fantasia?.toLowerCase().includes(term.toLowerCase()) ||
      emp.cnpj?.includes(term)
    );
    setFilteredData(filtered);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return;
    
    const { success, error } = await erpServices.empresas.delete(id);
    if (success) {
        fetchData();
        toast({ title: 'Sucesso', description: 'Empresa excluída com sucesso.' });
    } else {
        toast({ title: 'Erro', description: error || 'Falha ao excluir empresa.', variant: 'destructive' });
    }
  };

  const columns = [
    { 
      header: 'Razão Social / Fantasia', 
      accessorKey: 'razao_social',
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-black">
            <div className="h-10 w-10 rounded bg-blue-50 flex items-center justify-center text-blue-700 font-bold shrink-0 border border-blue-100">
               {row.logo ? <img src={row.logo} alt="Logo" className="h-10 w-10 rounded object-cover"/> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium text-black">{row.nome_fantasia || row.razao_social}</p>
              <p className="text-xs text-slate-500">{row.razao_social}</p>
            </div>
        </div>
      )
    },
    { 
      header: 'CNPJ', 
      accessorKey: 'cnpj',
      cell: ({ row }) => <span className="text-black font-mono">{row.cnpj}</span>
    },
    { 
      header: 'Cidade/UF', 
      accessorKey: 'cidade',
      cell: ({ row }) => (
        <div className="flex items-center text-black">
            <MapPin className="h-3 w-3 mr-1 text-slate-400" /> {row.cidade} {row.estado ? `- ${row.estado}` : ''}
        </div>
      )
    },
    { 
      header: 'Contato', 
      accessorKey: 'email',
      cell: ({ row }) => (
        <div className="flex flex-col text-xs text-black">
            <span>{row.email}</span>
            <span className="text-slate-500">{row.telefone}</span>
        </div>
      )
    },
    { 
      header: 'Status', 
      accessorKey: 'ativo',
      cell: ({ row }) => (
        <Badge variant={row.ativo ? 'success' : 'secondary'} className={row.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}>
          {row.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    }
  ];

  return (
    <>
      <Helmet><title>Cadastro de Empresas | ERP</title></Helmet>
      <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50">
        <CRUDTable 
          title={<span className="text-slate-900">Empresas</span>}
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={{ page: 1, limit: filteredData.length, total: filteredData.length, totalPages: 1 }}
          onPageChange={() => {}}
          onSearch={handleSearch}
          onCreate={() => navigate('/cadastros/empresas/novo')}
          onEdit={(row) => navigate(`/cadastros/empresas/${row.id}`)}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
};

export default EmpresasList;