import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Link as LinkIcon, FileText, CreditCard, Landmark, Users } from 'lucide-react';

export default function DocumentLinkingModal({ open, onOpenChange, onLink }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('nf');

  const mockDocuments = [
    { id: 'NF-1020', tipo: 'nf', numero: '1020', fornecedor: 'Tech Corp', valor: 1500.00, data: '2023-10-15' },
    { id: 'NF-1021', tipo: 'nf', numero: '1021', fornecedor: 'Office Supplies', valor: 350.50, data: '2023-10-16' },
    { id: 'PAG-550', tipo: 'pagamento', numero: '550', fornecedor: 'Tech Corp', valor: 1500.00, data: '2023-10-20' },
    { id: 'REC-900', tipo: 'recebimento', numero: '900', cliente: 'Acme LLC', valor: 5000.00, data: '2023-10-21' },
    { id: 'FOLHA-10', tipo: 'folha', numero: 'Out/2023', descricao: 'Folha Salarial', valor: 25000.00, data: '2023-10-31' },
  ];

  const filteredDocs = mockDocuments.filter(d => 
    d.tipo === activeTab && 
    (d.numero.includes(searchTerm) || (d.fornecedor && d.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())))
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
                Nenhum documento encontrado.
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