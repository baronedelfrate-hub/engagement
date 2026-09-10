import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const TributosPage = () => {
  const { toast } = useToast();
  const [tributos, setTributos] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    tipo: 'Federal',
    aliquota: '0',
    ativo: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setFilteredData(tributos.filter(item =>
      item.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [searchTerm, tributos]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('tributos').select('*').order('nome', { ascending: true });
      if (error) throw error;
      setTributos(data || []);
    } catch (error) {
      console.error('Error loading tributos:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os tributos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({ nome: '', codigo: '', tipo: 'Federal', aliquota: '0', ativo: true });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Confirmar exclusão?')) {
      const { error } = await supabase.from('tributos').delete().eq('id', id);
      if (error) {
        toast({ title: 'Erro', description: error.message || 'Não foi possível excluir.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Sucesso', description: 'Registro removido.' });
      await loadData();
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast({ title: 'Erro', description: 'Preencha o nome.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('tributos').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tributos').insert(formData);
        if (error) throw error;
      }
      toast({ title: 'Sucesso', description: 'Salvo com sucesso.' });
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error('Error saving tributo:', error);
      toast({ title: 'Erro', description: error.message || 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { 
      header: 'Código', 
      accessor: 'codigo',
      render: (row) => <span className="text-foreground font-mono">{row.codigo}</span>
    },
    { 
      header: 'Nome', 
      accessor: 'nome',
      render: (row) => <span className="text-foreground font-medium">{row.nome}</span>
    },
    { 
      header: 'Tipo', 
      accessor: 'tipo',
      render: (row) => <span className="text-foreground">{row.tipo}</span>
    },
    { 
      header: 'Alíquota (%)', 
      render: (row) => <span className="text-emerald-700 font-bold">{row.aliquota}%</span> 
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
      <Helmet><title>Tributos | ERP</title></Helmet>
      <PageHeader 
        title={<span className="text-foreground">Tributos e Impostos</span>}
        description={<span className="text-muted-foreground">Configuração de alíquotas e tipos de impostos.</span>}
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Novo Tributo
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
        <DataTable columns={columns} data={filteredData} loading={loading} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} Tributo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-foreground">Nome</Label>
                  <Input className="bg-background border-border text-foreground" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="ICMS" />
                </div>
                <div>
                  <Label className="text-foreground">Código</Label>
                  <Input className="bg-background border-border text-foreground" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-foreground">Tipo</Label>
                    <Select value={formData.tipo} onValueChange={v => setFormData({...formData, tipo: v})}>
                        <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-background border-border text-foreground">
                            <SelectItem value="Federal">Federal</SelectItem>
                            <SelectItem value="Estadual">Estadual</SelectItem>
                            <SelectItem value="Municipal">Municipal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                  <Label className="text-foreground">Alíquota (%)</Label>
                  <Input className="bg-background border-border text-foreground" type="number" value={formData.aliquota} onChange={e => setFormData({...formData, aliquota: e.target.value})} />
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <Switch checked={formData.ativo} onCheckedChange={checked => setFormData({...formData, ativo: checked})} />
                <Label className="text-foreground">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border text-foreground hover:bg-muted" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TributosPage;