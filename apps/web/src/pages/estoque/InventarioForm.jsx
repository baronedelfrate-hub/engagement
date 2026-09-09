import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function InventarioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);

  const [formData, setFormData] = useState({
    produtoId: '',
    quantidadeContada: '',
    quantidadeSistema: '',
    diferenca: '',
    dataContagem: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setProdutos(storage.get('PRODUTOS'));
    if (id) {
      const item = storage.getById('INVENTARIO', id);
      if (item) setFormData(item);
    }
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (id) {
      storage.update('INVENTARIO', id, formData);
      toast({ title: "Sucesso", description: "Inventário atualizado." });
    } else {
      storage.add('INVENTARIO', formData);
      toast({ title: "Sucesso", description: "Inventário registrado." });
    }
    navigate('/estoque/inventario');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Optional manual calculation if user wants, but strict requirement said no automation.
      // However, updating "diferenca" manually is tedious. I'll leave it manual as requested "No automation or calculations needed"
      // to fully respect the constraint, although usually this is calculated.
      return newData;
    });
  };

  return (
    <>
      <Helmet><title>{id ? 'Editar' : 'Novo'} Inventário - ERP Platform</title></Helmet>
      <PageHeader title={id ? 'Editar Inventário' : 'Novo Inventário'} showBack />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <select
                    name="produtoId"
                    value={formData.produtoId}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Contada</Label>
                  <Input type="number" name="quantidadeContada" value={formData.quantidadeContada} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Sistema</Label>
                  <Input type="number" name="quantidadeSistema" value={formData.quantidadeSistema} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Diferença</Label>
                  <Input type="number" name="diferenca" value={formData.diferenca} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label>Data da Contagem</Label>
                  <Input type="date" name="dataContagem" value={formData.dataContagem} onChange={handleChange} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque/inventario')}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </>
  );
}

export default InventarioForm;