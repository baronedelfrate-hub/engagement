import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Plus, Download, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import RHDocumentUploader from '@/components/RHDocumentUploader';
import { formatDateOnly } from '@/lib/dateUtils';

const RHConvencaoColetiva = () => {
  const { toast } = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgreement, setNewAgreement] = useState({ sindicato: '', data_inicio: '', data_fim: '', arquivo_url: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: res, error } = await supabase
      .from('rh_convencao_coletiva')
      .select('*')
      .order('data_inicio', { ascending: false });
    
    if (res) setData(res);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!newAgreement.sindicato || !newAgreement.data_inicio || !newAgreement.data_fim) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const { error } = await insertWithCompanyId('rh_convencao_coletiva', newAgreement);
    
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Convenção cadastrada." });
      setIsModalOpen(false);
      setNewAgreement({ sindicato: '', data_inicio: '', data_fim: '', arquivo_url: '' });
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir convenção?')) {
      await supabase.from('rh_convencao_coletiva').delete().eq('id', id);
      fetchData();
    }
  };

  const columns = [
    { header: 'Sindicato', accessorKey: 'sindicato' },
    { header: 'Início', accessorKey: 'data_inicio', cell: ({ row }) => formatDateOnly(row.data_inicio) },
    { header: 'Fim', accessorKey: 'data_fim', cell: ({ row }) => formatDateOnly(row.data_fim) },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }) => <Badge variant={row.status === 'Ativo' ? 'success' : 'secondary'}>{row.status}</Badge>
    },
    {
      header: 'Ações',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.arquivo_url && (
            <Button variant="ghost" size="icon" onClick={() => window.open(row.arquivo_url, '_blank')}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <Helmet><title>Convenções Coletivas - RH</title></Helmet>
      <PageHeader 
        title="Convenções Coletivas" 
        description="Gestão de acordos e convenções sindicais"
        action={
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Convenção</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Convenção Coletiva</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sindicato</Label>
                  <Input value={newAgreement.sindicato} onChange={e => setNewAgreement({...newAgreement, sindicato: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início Vigência</Label>
                    <Input type="date" value={newAgreement.data_inicio} onChange={e => setNewAgreement({...newAgreement, data_inicio: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim Vigência</Label>
                    <Input type="date" value={newAgreement.data_fim} onChange={e => setNewAgreement({...newAgreement, data_fim: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Arquivo (PDF)</Label>
                  <RHDocumentUploader onUploadComplete={(url) => setNewAgreement({...newAgreement, arquivo_url: url})} />
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable columns={columns} data={data} loading={loading} searchColumn="sindicato" />
    </div>
  );
};

export default RHConvencaoColetiva;