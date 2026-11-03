import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { atualizarQuadro, excluirQuadro } from '@/lib/tarefasService';

// Editar o nome/descrição e apagar um quadro. qtdTarefas (opcional) avisa quantas tarefas serão apagadas junto.
const MenuQuadro = ({ quadro, qtdTarefas, onAtualizado, onExcluido, variante = 'outline' }) => {
  const { toast } = useToast();
  const [editando, setEditando] = useState(null);
  const [apagando, setApagando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const parar = (e) => e.stopPropagation();

  const salvar = async () => {
    if (!editando.nome.trim()) { toast({ title: 'Dê um nome ao quadro', variant: 'destructive' }); return; }
    setOcupado(true);
    try {
      await atualizarQuadro(quadro.id, { nome: editando.nome.trim(), descricao: editando.descricao?.trim() || null });
      setEditando(null);
      toast({ title: 'Quadro atualizado' });
      onAtualizado?.();
    } catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(false); }
  };

  const apagar = async () => {
    setOcupado(true);
    try {
      await excluirQuadro(quadro.id);
      setApagando(false);
      toast({ title: 'Quadro apagado' });
      onExcluido?.();
    } catch (e) { toast({ title: 'Não foi possível apagar', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(false); }
  };

  return (
    <span onClick={parar}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variante} size="sm" className="gap-1" aria-label="Opções do quadro"><MoreHorizontal className="h-4 w-4" /> Opções</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditando({ nome: quadro.nome || '', descricao: quadro.descricao || '' })}><Pencil className="h-4 w-4" /> Editar quadro</DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setApagando(true)}><Trash2 className="h-4 w-4" /> Apagar quadro</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent onClick={parar}>
          <DialogHeader><DialogTitle>Editar quadro</DialogTitle></DialogHeader>
          {editando && (
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={3} value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button><Button onClick={salvar} disabled={ocupado}>{ocupado && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={apagando} onOpenChange={setApagando}>
        <DialogContent onClick={parar}>
          <DialogHeader>
            <DialogTitle>Apagar o quadro "{quadro.nome}"?</DialogTitle>
            <DialogDescription>
              {qtdTarefas > 0 ? `Isso apaga também as ${qtdTarefas} tarefa(s) do quadro, com os comentários.` : 'O quadro e as colunas dele serão apagados.'} Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setApagando(false)}>Cancelar</Button><Button variant="destructive" onClick={apagar} disabled={ocupado}>{ocupado && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Apagar quadro</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
};

export default MenuQuadro;
