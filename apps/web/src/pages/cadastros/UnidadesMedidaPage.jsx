import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

const UnidadesMedidaPage = () => {
  const { toast } = useToast();
  const [unidades, setUnidades] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    simbolo: '',
    fator_conversao: '1',
    ativo: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = unidades.filter(item => 
      item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.simbolo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, unidades]);

  const loadData = () => {
    const data = storage.get('UNIDADES_MEDIDA') || [];
    setUnidades(data);
    setFilteredData(data);
  };

  const handleOpenModal = (unidade = null) => {
    if (unidade) {
      setEditingId(unidade.id);
      setFormData(unidade);
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        simbolo: '',
        fator_conversao: '1',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta unidade?')) {
      storage.delete('UNIDADES_MEDIDA', id);
      toast({ title: 'Sucesso', description: 'Unidade removida com sucesso.' });
      loadData();
    }
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.simbolo) {
      toast({ title: 'Erro', description: 'Nome e Símbolo são obrigatórios.', variant: 'destructive' });
      return;
    }

    if (editingId) {
      storage.update('UNIDADES_MEDIDA', editingId, { ...formData, atualizado_por: 'ADM001' });
      toast({ title: 'Sucesso', description: 'Unidade atualizada.' });
    } else {
      storage.add('UNIDADES_MEDIDA', { ...formData, criado_por: 'ADM001' });
      toast({ title: 'Sucesso', description: 'Unidade cadastrada.' });
    }
    setIsModalOpen(false);
    loadData();
  };

  const columns = [
    { 
      header: 'Símbolo', 
      accessor: 'simbolo', 
      render: (row) => <span className="font-bold bg-blue-100 px-2 py-1 rounded text-blue-800 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">{row.simbolo}</span>
    },
    { 
      header: 'Nome', 
      accessor: 'nome',
      render: (row) => <span className="text-foreground font-medium">{row.nome}</span>
    },
    { 
      header: 'Fator Conversão', 
      accessor: 'fator_conversao',
      render: (row) => <span className="text-foreground">{row.fator_conversao}</span>
    },
    { header: 'Status', render: (row) => (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${row.ativo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-muted text-foreground'}`}>
            {row.ativo ? 'Ativo' : 'Inativo'}
        </span>
    )},
    { header: 'Ações', render: (row) => (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/30"><Edit className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></Button>
      </div>
    )}
  ];

  return (
    <div className="p-8 min-h-screen bg-muted">
      <Helmet><title>Unidades de Medida | ERP</title></Helmet>
      <PageHeader 
        title={<span className="text-foreground">Unidades de Medida</span>}
        description={<span className="text-muted-foreground">Gerencie as unidades para produtos e serviços.</span>}
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Nova Unidade
          </Button>
        }
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-10 w-full md:w-1/3 bg-background border-border text-foreground placeholder:text-muted-foreground" 
          placeholder="Buscar por nome ou símbolo..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <DataTable columns={columns} data={filteredData} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Unidade' : 'Nova Unidade'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Label className="text-foreground">Nome (ex: Quilograma)</Label>
                <Input className="bg-background border-border text-foreground" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>
              <div className="col-span-1">
                <Label className="text-foreground">Símbolo</Label>
                <Input className="bg-background border-border text-foreground" value={formData.simbolo} onChange={e => setFormData({...formData, simbolo: e.target.value})} placeholder="KG" />
              </div>
            </div>
            <div>
                <Label className="text-foreground">Fator de Conversão (Base)</Label>
                <Input className="bg-background border-border text-foreground" type="number" step="0.01" value={formData.fator_conversao} onChange={e => setFormData({...formData, fator_conversao: e.target.value})} />
                <p className="text-xs text-muted-foreground mt-1">Usado para converter quantidades em relatórios.</p>
            </div>
            <div className="flex items-center space-x-2">
                <Switch checked={formData.ativo} onCheckedChange={checked => setFormData({...formData, ativo: checked})} />
                <Label className="text-foreground">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border text-foreground hover:bg-muted" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnidadesMedidaPage;