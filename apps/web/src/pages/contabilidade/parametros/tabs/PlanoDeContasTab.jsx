import React, { useState } from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function PlanoDeContasTab() {
  const { data, saveItem, deleteItem } = useParametrosContabeis();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const filteredData = data.contas.filter(c => 
    c.codigo.toLowerCase().includes(search.toLowerCase()) || 
    c.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (item = null) => {
    setEditingItem(item || { codigo: '', descricao: '', tipo: 'Analítica', natureza: 'Devedora', ativa: true });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const success = await saveItem('pc_contas_contabeis', editingItem);
    if (success) setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar conta..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8 bg-background"
          />
        </div>
        <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Conta
        </Button>
      </div>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map(conta => (
              <TableRow key={conta.id}>
                <TableCell className="font-medium">{conta.codigo}</TableCell>
                <TableCell>{conta.descricao}</TableCell>
                <TableCell>{conta.tipo}</TableCell>
                <TableCell>{conta.natureza}</TableCell>
                <TableCell>
                  <Badge variant={conta.ativa ? 'default' : 'secondary'} className={conta.ativa ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : ''}>
                    {conta.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openModal(conta)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem('pc_contas_contabeis', conta.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Código</Label>
              <Input value={editingItem?.codigo || ''} onChange={e => setEditingItem({...editingItem, codigo: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input value={editingItem?.descricao || ''} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingItem?.tipo || 'Analítica'} 
                  onChange={e => setEditingItem({...editingItem, tipo: e.target.value})}
                >
                  <option value="Sintética">Sintética</option>
                  <option value="Analítica">Analítica</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Natureza</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingItem?.natureza || 'Devedora'} 
                  onChange={e => setEditingItem({...editingItem, natureza: e.target.value})}
                >
                  <option value="Devedora">Devedora</option>
                  <option value="Credora">Credora</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}