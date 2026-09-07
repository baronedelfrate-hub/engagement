import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Link as LinkIcon, FileText, ShoppingCart, BookOpen, CalendarCheck } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

export default function PendenciasVinculosModal({ open, onOpenChange, pendenciaId, empresaId, onLink }) {
  const [activeTab, setActiveTab] = useState('documentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && empresaId) {
      fetchItems();
    }
  }, [open, activeTab, empresaId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let data = [];
      if (activeTab === 'documentos') {
        const res = await supabase.from('documentos_contabilidade').select('id, numero, tipo, descricao, data_envio').eq('empresa_id', empresaId).limit(20);
        data = res.data || [];
      } else if (activeTab === 'nf') {
        const res = await supabase.from('nfe_produtos').select('id, numero, data_emissao, valor_total').eq('empresa_id', empresaId).limit(20);
        data = res.data || [];
      } else if (activeTab === 'lancamentos') {
        const res = await supabase.from('lancamentos_contabeis').select('id, descricao, data, status').eq('empresa_id', empresaId).limit(20);
        data = res.data || [];
      } else if (activeTab === 'fechamentos') {
        const res = await supabase.from('fechamentos_contabeis').select('id, periodo, status').eq('empresa_id', empresaId).limit(20);
        data = res.data || [];
      }
      setItems(data);
      setSelectedItems([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleConfirm = () => {
    if (selectedItems.length > 0) {
      onLink(activeTab, selectedItems);
    }
  };

  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    return Object.values(item).some(val => String(val).toLowerCase().includes(search));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vincular Documentos / Registros</DialogTitle>
          <DialogDescription>Selecione os itens relacionados a esta pendência.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documentos" className="flex gap-2"><FileText className="w-4 h-4"/> Documentos</TabsTrigger>
            <TabsTrigger value="nf" className="flex gap-2"><ShoppingCart className="w-4 h-4"/> Notas Fiscais</TabsTrigger>
            <TabsTrigger value="lancamentos" className="flex gap-2"><BookOpen className="w-4 h-4"/> Lançamentos</TabsTrigger>
            <TabsTrigger value="fechamentos" className="flex gap-2"><CalendarCheck className="w-4 h-4"/> Fechamentos</TabsTrigger>
          </TabsList>

          <div className="mt-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar registros..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 border border-border rounded-md overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-muted">
                    <Checkbox 
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleToggleSelect(item.id)}
                    />
                    <div className="flex-1 text-sm">
                      {activeTab === 'documentos' && <><span className="font-medium text-foreground">{item.numero || 'S/N'}</span> - {item.descricao}</>}
                      {activeTab === 'nf' && <><span className="font-medium text-foreground">NF {item.numero}</span> - R$ {item.valor_total}</>}
                      {activeTab === 'lancamentos' && <><span className="font-medium text-foreground">{item.data}</span> - {item.descricao}</>}
                      {activeTab === 'fechamentos' && <><span className="font-medium text-foreground">Período {item.periodo}</span> - {item.status}</>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={selectedItems.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
            <LinkIcon className="w-4 h-4 mr-2" /> Vincular Selecionados ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}