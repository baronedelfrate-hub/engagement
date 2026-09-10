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
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';

function PedidosCompraForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();

  const [fornecedores, setFornecedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    numero: '',
    fornecedor_id: '',
    data_pedido: new Date().toISOString().split('T')[0],
    data_entrega: '',
    valor_total: '',
    status: 'Aberto',
    observacoes: '',
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const { data: fornecedoresData } = await supabase.from('fornecedores').select('id, nome').order('nome');
        setFornecedores(fornecedoresData || []);

        if (id) {
          const { data: pedido, error: pedidoError } = await supabase
            .from('pedidos_compra')
            .select('*')
            .eq('id', id)
            .single();
          if (pedidoError || !pedido) {
            setError('Pedido de compra não encontrado.');
            toast({ title: 'Erro', description: 'Pedido de compra não encontrado.', variant: 'destructive' });
          } else {
            setFormData({
              numero: pedido.numero || '',
              fornecedor_id: pedido.fornecedor_id || '',
              data_pedido: pedido.data_pedido || '',
              data_entrega: pedido.data_entrega || '',
              valor_total: pedido.valor_total ?? '',
              status: pedido.status || 'Aberto',
              observacoes: pedido.observacoes || '',
            });
          }
        }
      } catch (e) {
        console.error('[PedidosCompraForm] Erro ao carregar dados:', e);
        setError('Erro ao carregar dados: ' + e.message);
        toast({ title: 'Erro', description: 'Erro ao carregar dados.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [id, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fornecedor_id) {
      toast({ title: 'Erro', description: 'Selecione um fornecedor.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        numero: formData.numero || `PC-${Date.now().toString().slice(-6)}`,
        fornecedor_id: formData.fornecedor_id,
        data_pedido: formData.data_pedido || null,
        data_entrega: formData.data_entrega || null,
        valor_total: parseFloat(formData.valor_total) || 0,
        status: formData.status,
        observacoes: formData.observacoes || null,
      };

      if (!id) {
        const { error } = await insertWithCompanyId('pedidos_compra', payload);
        if (error) throw error;
        toast({ title: 'Pedido criado', description: 'O novo pedido de compra foi cadastrado com sucesso.' });
      } else {
        const { error } = await supabase.from('pedidos_compra').update(payload).eq('id', id);
        if (error) throw error;
        toast({ title: 'Pedido atualizado', description: 'Os dados do pedido de compra foram atualizados com sucesso.' });
      }
      navigate('/compras/pedidos');
    } catch (error) {
      console.error('[PedidosCompraForm] Erro ao salvar:', error);
      toast({ title: 'Erro ao salvar', description: error.message || 'Não foi possível salvar o pedido.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] animate-in fade-in">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Carregando dados do pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[50vh] text-destructive animate-in fade-in">
        <AlertTriangle className="h-16 w-16 mb-6 opacity-80" />
        <h3 className="text-2xl font-bold mb-2">Erro ao Carregar</h3>
        <p className="text-lg mb-6 opacity-90">{error}</p>
        <Button onClick={() => navigate('/compras/pedidos')} variant="outline">
          Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      <Helmet>
        <title>{id ? 'Editar' : 'Novo'} Pedido de Compra - ERP Platform</title>
      </Helmet>

      <PageHeader
        title={id ? `Pedido de Compra #${formData.numero || id.slice(0, 8)}` : 'Novo Pedido de Compra'}
        description={`Gerencie os detalhes deste pedido. Status atual: ${formData.status}`}
        showBack
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número do Pedido</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="Ex: PO-2025-001 (gerado automaticamente se vazio)"
                    className="bg-background text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornecedor_id">Fornecedor *</Label>
                  <select
                    id="fornecedor_id"
                    name="fornecedor_id"
                    value={formData.fornecedor_id}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  >
                    <option value="Aberto">Aberto</option>
                    <option value="Em_Entrada">Em Entrada</option>
                    <option value="Concluido">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_pedido">Data do Pedido *</Label>
                  <Input
                    id="data_pedido"
                    name="data_pedido"
                    type="date"
                    value={formData.data_pedido}
                    onChange={handleChange}
                    required
                    className="bg-background text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_entrega">Previsão de Entrega</Label>
                  <Input
                    id="data_entrega"
                    name="data_entrega"
                    type="date"
                    value={formData.data_entrega}
                    onChange={handleChange}
                    className="bg-background text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor_total">Valor Total (R$) *</Label>
                  <Input
                    id="valor_total"
                    name="valor_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_total}
                    onChange={handleChange}
                    required
                    className="bg-background text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Adicione observações adicionais sobre o pedido..."
                  className="bg-background text-foreground"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end sticky bottom-6 bg-background/90 backdrop-blur-sm p-4 rounded-lg border border-border shadow-lg z-10">
            <Button type="button" variant="outline" onClick={() => navigate('/compras/pedidos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]">
              {isSaving ? 'Salvando...' : (id ? 'Atualizar Pedido' : 'Finalizar Pedido')}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default PedidosCompraForm;
