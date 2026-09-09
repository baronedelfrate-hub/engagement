import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function TransferenciasForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);

  const [formData, setFormData] = useState({
    produtoId: '',
    quantidade: '',
    origem: '',
    destino: '',
    data: new Date().toISOString().split('T')[0],
    status: 'Concluído' // Simplification: auto-conclude
  });

  useEffect(() => {
    setProdutos(storage.get('PRODUTOS'));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Just record the transfer document. 
    // In a real system with multi-warehouse, we'd decrease stock in Origin Warehouse and increase in Dest Warehouse.
    // Since our Produto entity only has one 'estoque' and one 'localizacao' field currently, 
    // this is mostly for record keeping or updating the main 'localizacao' text if it's a full move.
    
    storage.add('TRANSFERENCIAS', formData);
    
    // Optional: Update product location if it's a full move (logic assumption)
    // or just log it. We will just log it to TRANSFERENCIAS storage as requested.
    
    toast({ title: "Transferência Registrada", description: "Movimentação salva com sucesso." });
    navigate('/estoque/transferencias');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Helmet><title>Nova Transferência - ERP Platform</title></Helmet>
      <PageHeader title="Nova Transferência" showBack />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Produto</Label>
                  <select
                    name="produtoId"
                    value={formData.produtoId}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Local: {p.localizacao || 'N/A'})</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Local de Origem</Label>
                  <Input name="origem" value={formData.origem} onChange={handleChange} placeholder="Ex: Armazém A" required />
                </div>
                <div className="space-y-2">
                  <Label>Local de Destino</Label>
                  <Input name="destino" value={formData.destino} onChange={handleChange} placeholder="Ex: Loja 1" required />
                </div>

                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" name="quantidade" value={formData.quantidade} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" name="data" value={formData.data} onChange={handleChange} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque/transferencias')}>Cancelar</Button>
                <Button type="submit">Salvar Transferência</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </>
  );
}

export default TransferenciasForm;