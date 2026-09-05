import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';

function TipoPagamentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    if (id) {
      const tipo = storage.getById('TIPO_PAGAMENTO', id);
      if (tipo) {
        setFormData(tipo);
      }
    }
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (id) {
      storage.update('TIPO_PAGAMENTO', id, formData);
      toast({
        title: "Tipo de pagamento atualizado",
        description: "Os dados do tipo de pagamento foram atualizados com sucesso.",
      });
    } else {
      storage.add('TIPO_PAGAMENTO', formData);
      toast({
        title: "Tipo de pagamento criado",
        description: "O novo tipo de pagamento foi cadastrado com sucesso.",
      });
    }
    
    navigate('/cadastros/tipo-pagamento');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Helmet>
        <title>{id ? 'Editar' : 'Novo'} Tipo de Pagamento - ERP Platform</title>
        <meta name="description" content={`${id ? 'Edit existing' : 'Create new'} payment type in your ERP financial system`} />
      </Helmet>

      <PageHeader
        title={id ? 'Editar Tipo de Pagamento' : 'Novo Tipo de Pagamento'}
        description={id ? 'Atualize as informações do tipo de pagamento' : 'Cadastre um novo tipo de pagamento'}
        showBack
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    placeholder="Ex: Dinheiro, Cartão, PIX"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/cadastros/tipo-pagamento')}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {id ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default TipoPagamentoForm;