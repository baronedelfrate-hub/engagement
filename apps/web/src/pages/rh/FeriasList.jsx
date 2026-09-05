import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X as XIcon, CalendarDays } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SearchBar from '@/components/SearchBar';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function FeriasList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ferias, setFerias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setFerias(storage.get('RH_FERIAS'));
    setUsuarios(storage.get('USUARIOS'));
  };

  const getUserName = (id) => {
    const user = usuarios.find(u => u.id === id);
    return user ? user.nome_completo : 'Usuário não encontrado';
  };

  const handleEdit = (id) => {
    navigate(`/rh/ferias/${id}`);
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir solicitação?')) {
      storage.delete('RH_FERIAS', id);
      loadData();
      toast({ title: "Excluído" });
    }
  };

  const changeStatus = (item, newStatus) => {
      storage.update('RH_FERIAS', item.id, { 
          status: newStatus,
          aprovado_por: 'Admin (Atual)' // Mock current user
      });
      loadData();
      toast({ title: `Solicitação ${newStatus}` });
  };

  const filteredData = ferias.filter(item => 
    getUserName(item.usuario_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Report: Scheduled vacations (Approved and future/present)
  const scheduledVacations = ferias.filter(f => f.status === 'Aprovado');

  const columns = [
    { header: 'Funcionário', render: (item) => getUserName(item.usuario_id) },
    { header: 'Início', render: (item) => new Date(item.data_inicio).toLocaleDateString() },
    { header: 'Fim', render: (item) => new Date(item.data_fim).toLocaleDateString() },
    { 
        header: 'Status', 
        render: (item) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold 
                ${item.status === 'Aprovado' ? 'bg-green-100 text-green-700' : 
                  item.status === 'Rejeitado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {item.status}
            </span>
        ) 
    },
    {
        header: 'Ações',
        render: (item) => item.status === 'Solicitado' ? (
            <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => changeStatus(item, 'Aprovado')} title="Aprovar"><Check className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => changeStatus(item, 'Rejeitado')} title="Rejeitar"><XIcon className="h-4 w-4" /></Button>
            </div>
        ) : <span className="text-xs text-slate-400">Finalizado</span>
    }
  ];

  return (
    <>
      <Helmet><title>Férias - RH</title></Helmet>
      <PageHeader
        title="Gestão de Férias"
        description="Solicitações e aprovações"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsReportsOpen(true)} className="gap-2">
                <CalendarDays className="h-4 w-4" /> Agendadas
            </Button>
            <Button onClick={() => navigate('/rh/ferias/novo')} className="gap-2">
              <Plus className="h-4 w-4" /> Solicitar Férias
            </Button>
          </div>
        }
      />
      <div className="mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar funcionário..." />
      </div>
      <DataTable
        data={filteredData}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="Nenhuma solicitação encontrada"
      />

      <Dialog open={isReportsOpen} onOpenChange={setIsReportsOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Férias Agendadas (Aprovadas)</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
                {scheduledVacations.length > 0 ? scheduledVacations.map(f => (
                    <div key={f.id} className="border-b pb-2">
                        <div className="font-medium text-sm">{getUserName(f.usuario_id)}</div>
                        <div className="text-xs text-slate-500">
                            {new Date(f.data_inicio).toLocaleDateString()} até {new Date(f.data_fim).toLocaleDateString()}
                        </div>
                    </div>
                )) : <p className="text-center text-slate-500">Nenhuma férias agendada.</p>}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FeriasList;