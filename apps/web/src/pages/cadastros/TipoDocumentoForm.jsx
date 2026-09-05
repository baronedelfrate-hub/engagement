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

function TipoDocumentoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: '',
    descricao: ''
  });

  useEffect(() => {
    if (id) {
      const tipo = storage.getById('TIPO_DOCUMENTO', id);
      if (tipo) {
        setFormData(tipo);
      }
    }
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (id) {
      storage.update('TIPO_DOCUMENTO', id, formData);
      toast({
        title: "Tipo de documento atualizado",
        description: "Os dados do tipo de documento foram atualizados com sucesso.",
      });
    } else {
      storage.add('TIPO_DOCUMENTO', formData);
      toast({
        title: "Tipo de documento criado",
        description: "O novo tipo de documento foi cadastrado com sucesso.",
      });
    }
    
    navigate('/cadastros/tipo-documento');
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
        <title>{id ? 'Editar' : 'Novo'} Tipo de Documento - ERP Platform</title>
        <meta name="description" content={`${id ? 'Edit existing' : 'Create new'} document type in your ERP system`} />
      </Helmet>

      <PageHeader
        title={id ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}
        description={id ? 'Atualize as informações do tipo de documento' : 'Cadastre um novo tipo de documento'}
        showBack
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informações do Tipo de Documento</CardTitle>
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
                    placeholder="Ex: Nota Fiscal, Recibo, Contrato"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Input
                    id="categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    placeholder="Ex: Fiscal, Administrativo"
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
                <Button type="button" variant="outline" onClick={() => navigate('/cadastros/tipo-documento')}>
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

export default TipoDocumentoForm;