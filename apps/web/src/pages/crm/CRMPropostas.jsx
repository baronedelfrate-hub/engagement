import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useCRM } from '@/contexts/CRMContext';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus } from 'lucide-react';

const STATUS_OPTIONS = ['LEAD', 'PROPOSTA', 'NEGOCIACAO', 'GANHA', 'ENVIADO_FATURAMENTO'];

const CRMPropostas = () => {
  const { propostas, clientes, createProposta, loading } = useCRM();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    numero: `PRP-${Date.now().toString().slice(-6)}`,
    valor_total: '',
    status: 'LEAD',
    data_emissao: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.valor_total) return;
    
    const result = await createProposta(formData);
    if (result) {
      setIsOpen(false);
      setFormData({
        cliente_id: '',
        numero: `PRP-${Date.now().toString().slice(-6)}`,
        valor_total: '',
        status: 'LEAD',
        data_emissao: new Date().toISOString().split('T')[0]
      });
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'GANHA': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400';
      case 'LEAD': return 'bg-muted text-foreground';
      case 'ENVIADO_FATURAMENTO': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400';
      default: return 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400';
    }
  };

  return (
    <>
      <Helmet><title>Propostas | CRM</title></Helmet>
      <PageHeader 
        title="Propostas CRM" 
        description="Gestão de propostas comerciais." 
        icon={FileText}
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Proposta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Proposta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={formData.cliente_id} onValueChange={(val) => setFormData({...formData, cliente_id: val})}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={formData.valor_total} 
                      onChange={(e) => setFormData({...formData, valor_total: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input 
                      type="date" 
                      value={formData.data_emissao} 
                      onChange={(e) => setFormData({...formData, data_emissao: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit">Salvar Proposta</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-background rounded-xl shadow-sm border border-border mt-6 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : propostas.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma proposta encontrada.</TableCell></TableRow>
            ) : (
              propostas.map((prop) => (
                <TableRow key={prop.id}>
                  <TableCell className="font-medium text-foreground">{prop.numero || '-'}</TableCell>
                  <TableCell>{prop.cliente?.nome || 'Cliente Desconhecido'}</TableCell>
                  <TableCell>{new Date(prop.data_emissao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.valor_total || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(prop.status)} variant="outline">
                      {prop.status ? prop.status.replace(/_/g, ' ') : 'LEAD'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default CRMPropostas;