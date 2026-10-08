import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link as LinkIcon, FileText, CreditCard, Landmark, Users } from 'lucide-react';

export default function DocumentLinkingModal({ open, onOpenChange, onLink }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('nf');

  const [baixas, setBaixas] = useState([]);

  // Pagamentos e recebimentos reais: as baixas dos títulos. NFs e folha ainda não têm origem para vincular aqui.
  useEffect(() => {
    if (!open) return;
    supabase
      .from('movimentacao_baixas')
      .select('id, valor_baixa, data_baixa, movimentacao:movimentacao_financeira(tipo, numero_titulo, cliente:clientes(nome), fornecedor:fornecedores(nome))')
      .order('data_baixa', { ascending: false })
      .limit(300)
      .then(({ data }) => {
        setBaixas((data || []).map((b) => {
          const pagar = b.movimentacao?.tipo === 'pagar';
          return {
            id: b.id,
            tipo: pagar ? 'pagamento' : 'recebimento',
            numero: b.movimentacao?.numero_titulo || '',
            fornecedor: pagar ? (b.movimentacao?.fornecedor?.nome || 'Sem fornecedor') : undefined,
            cliente: pagar ? undefined : (b.movimentacao?.cliente?.nome || 'Sem cliente'),
            valor: Number(b.valor_baixa || 0),
            data: b.data_baixa ? b.data_baixa.split('-').reverse().join('/') : ''
          };
        }));
      });
  }, [open]);

  const termo = searchTerm.toLowerCase();
  const filteredDocs = baixas.filter((d) =>
    d.tipo === activeTab &&
    (d.numero.toLowerCase().includes(termo) || (d.fornecedor || d.cliente || '').toLowerCase().includes(termo))
  );
  const handleSelect = (doc) => {
    onLink(doc);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular Documento Origem</DialogTitle>
          <DialogDescription>
            Busque e selecione um documento fiscal ou financeiro para vincular a este lançamento.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="nf" className="flex gap-2"><FileText className="w-4 h-4"/> NFs</TabsTrigger>
            <TabsTrigger value="pagamento" className="flex gap-2"><CreditCard className="w-4 h-4"/> Pagamentos</TabsTrigger>
            <TabsTrigger value="recebimento" className="flex gap-2"><Landmark className="w-4 h-4"/> Recebimentos</TabsTrigger>
            <TabsTrigger value="folha" className="flex gap-2"><Users className="w-4 h-4"/> Folha</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por número ou nome..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="border border-border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {activeTab === 'nf' || activeTab === 'folha' ? 'Ainda não há documentos desta origem para vincular aqui.' : 'Nenhum documento encontrado.'}
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                  <tr>
                    <th className="px-4 py-2">Número</th>
                    <th className="px-4 py-2">{activeTab === 'recebimento' ? 'Cliente' : 'Fornecedor/Desc'}</th>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                    <th className="px-4 py-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-muted">
                      <td className="px-4 py-2 font-medium text-foreground">{doc.numero}</td>
                      <td className="px-4 py-2 text-muted-foreground">{doc.fornecedor || doc.cliente || doc.descricao}</td>
                      <td className="px-4 py-2 text-muted-foreground">{doc.data}</td>
                      <td className="px-4 py-2 text-right text-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(doc.valor)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button size="sm" variant="ghost" className="h-8 text-blue-600" onClick={() => handleSelect(doc)}>
                          <LinkIcon className="w-4 h-4 mr-1" /> Vincular
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}