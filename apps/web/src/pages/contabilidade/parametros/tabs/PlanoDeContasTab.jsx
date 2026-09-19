import React, { useState } from 'react';
import { useParametrosContabeis } from '@/contexts/ParametrosContabeisContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GRUPOS_DRE_LABELS, nivelDoCodigo } from '@/lib/planoContas';
import ImportarPlanoContasDialog from './ImportarPlanoContasDialog';

const TIPOS = ['Receita', 'Custo', 'Despesa', 'Ativo', 'Passivo', 'Patrimônio'];
const CONTA_NOVA = { codigo: '', nome: '', tipo: 'Despesa', natureza: 'Devedora', analitica: true, ativa: true };
const CLASSE_SELECT = 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm';

export default function PlanoDeContasTab() {
  const { data, empresaId, empresas, saveConta, deleteItem, importarPlanoExcel } = useParametrosContabeis();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const termo = search.toLowerCase();
  const filteredData = data.contas.filter(c =>
    (c.codigo || '').toLowerCase().includes(termo) || (c.nome || '').toLowerCase().includes(termo)
  );

  const empresaSelecionada = empresaId !== 'all';
  const empresaNome = empresas.find(e => e.id === empresaId)?.razao_social;

  const openModal = (item = null) => {
    setEditingItem(item ? { ...item } : { ...CONTA_NOVA });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSalvando(true);
    const success = await saveConta(editingItem);
    setSalvando(false);
    if (success) setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!empresaSelecionada} title={empresaSelecionada ? '' : 'Selecione uma empresa'}>
            <Upload className="w-4 h-4 mr-2" /> Importar Excel
          </Button>
          <Button onClick={() => openModal()} disabled={!empresaSelecionada} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Conta
          </Button>
        </div>
      </div>

      {!empresaSelecionada && (
        <p className="text-sm text-muted-foreground">Selecione uma empresa acima para ver, importar ou cadastrar contas do plano.</p>
      )}

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Linha da DRE</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map(conta => (
              <TableRow key={conta.id}>
                <TableCell className="font-medium font-mono text-xs" style={{ paddingLeft: `${(nivelDoCodigo(conta.codigo) - 1) * 14 + 12}px` }}>
                  {conta.codigo}
                </TableCell>
                <TableCell className={conta.analitica === false ? 'font-semibold' : ''}>{conta.nome}</TableCell>
                <TableCell>{conta.tipo || '—'}</TableCell>
                <TableCell>{conta.natureza || '—'}</TableCell>
                <TableCell>{conta.analitica === false ? 'Sintética' : 'Analítica'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{conta.grupo_dre ? GRUPOS_DRE_LABELS[conta.grupo_dre] || conta.grupo_dre : '—'}</TableCell>
                <TableCell>
                  <Badge variant={conta.ativa ? 'default' : 'secondary'} className={conta.ativa ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400' : ''}>
                    {conta.ativa ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openModal(conta)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteItem('contas_contabeis', conta.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>
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
              <Input value={editingItem?.codigo || ''} onChange={e => setEditingItem({ ...editingItem, codigo: e.target.value })} placeholder="Ex.: 5.1.13" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Input value={editingItem?.nome || ''} onChange={e => setEditingItem({ ...editingItem, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <select className={CLASSE_SELECT} value={editingItem?.tipo || 'Despesa'} onChange={e => setEditingItem({ ...editingItem, tipo: e.target.value })}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Natureza</Label>
                <select className={CLASSE_SELECT} value={editingItem?.natureza || 'Devedora'} onChange={e => setEditingItem({ ...editingItem, natureza: e.target.value })}>
                  <option value="Devedora">Devedora</option>
                  <option value="Credora">Credora</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Conta</Label>
                <select className={CLASSE_SELECT} value={editingItem?.analitica === false ? 'sintetica' : 'analitica'} onChange={e => setEditingItem({ ...editingItem, analitica: e.target.value === 'analitica' })}>
                  <option value="analitica">Analítica (recebe lançamentos)</option>
                  <option value="sintetica">Sintética (só agrupa)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Situação</Label>
                <select className={CLASSE_SELECT} value={editingItem?.ativa === false ? 'inativa' : 'ativa'} onChange={e => setEditingItem({ ...editingItem, ativa: e.target.value === 'ativa' })}>
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportarPlanoContasDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        empresaNome={empresaNome}
        onImportar={importarPlanoExcel}
      />
    </div>
  );
}
