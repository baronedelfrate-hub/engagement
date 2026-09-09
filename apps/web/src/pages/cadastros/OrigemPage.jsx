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

const OrigemPage = () => {
  const { toast } = useToast();
  const [origens, setOrigens] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    ativo: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setFilteredData(origens.filter(item => 
      item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [searchTerm, origens]);

  const loadData = () => {
    setOrigens(storage.get('ORIGENS') || []);
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({ nome: '', codigo: '', ativo: true });
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Confirmar exclusão?')) {
      storage.delete('ORIGENS', id);
      toast({ title: 'Sucesso', description: 'Registro removido.' });
      loadData();
    }
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.codigo) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    if (editingId) storage.update('ORIGENS', editingId, { ...formData, atualizado_por: 'ADM001' });
    else storage.add('ORIGENS', { ...formData, criado_por: 'ADM001' });
    
    toast({ title: 'Sucesso', description: 'Salvo com sucesso.' });
    setIsModalOpen(false);
    loadData();
  };

  const columns = [
    { 
      header: 'Código', 
      accessor: 'codigo', 
      render: (row) => <span className="font-mono text-xs text-foreground bg-muted border border-border px-2 py-1 rounded">{row.codigo}</span> 
    },
    { 
      header: 'Nome', 
      accessor: 'nome',
      render: (row) => <span className="text-foreground font-medium">{row.nome}</span>
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
      <Helmet><title>Origens de Mercadoria | ERP</title></Helmet>
      <PageHeader 
        title={<span className="text-foreground">Origens de Mercadoria</span>}
        description={<span className="text-muted-foreground">Classificação fiscal da origem dos produtos (0, 1, 2...).</span>}
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Nova Origem
          </Button>
        }
      />

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          className="pl-10 w-full md:w-1/3 bg-background border-border text-foreground placeholder:text-muted-foreground" 
          placeholder="Buscar..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        <DataTable columns={columns} data={filteredData} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Nova'} Origem</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label className="text-foreground">Código (ex: 0 - Nacional)</Label>
              <Input className="bg-background border-border text-foreground" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} />
            </div>
            <div>
              <Label className="text-foreground">Descrição</Label>
              <Input className="bg-background border-border text-foreground" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
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

export default OrigemPage;