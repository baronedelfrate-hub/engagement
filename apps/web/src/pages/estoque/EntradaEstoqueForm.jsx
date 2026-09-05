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

function EntradaEstoqueForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);

  const [formData, setFormData] = useState({
    produtoId: '',
    quantidade: '',
    data: new Date().toISOString().split('T')[0],
    documentoOrigem: ''
  });

  useEffect(() => {
    setProdutos(storage.get('PRODUTOS'));
    if (id) {
      const entry = storage.getById('ENTRADA_ESTOQUE', id);
      if (entry) setFormData(entry);
    }
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (id) {
      storage.update('ENTRADA_ESTOQUE', id, formData);
      toast({ title: "Sucesso", description: "Entrada atualizada." });
    } else {
      storage.add('ENTRADA_ESTOQUE', formData);
      toast({ title: "Sucesso", description: "Entrada criada." });
    }
    navigate('/estoque/entrada');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Helmet>
        <title>{id ? 'Editar' : 'Nova'} Entrada - ERP Platform</title>
      </Helmet>

      <PageHeader
        title={id ? 'Editar Entrada' : 'Nova Entrada de Estoque'}
        showBack
      />

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
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    name="quantidade"
                    value={formData.quantidade}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    name="data"
                    value={formData.data}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Documento de Origem</Label>
                  <Input
                    name="documentoOrigem"
                    value={formData.documentoOrigem}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque/entrada')}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </motion.div>
    </>
  );
}

export default EntradaEstoqueForm;