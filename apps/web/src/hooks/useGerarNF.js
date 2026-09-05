import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export function useGerarNF(pedidoId) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasProducts, setHasProducts] = useState(false);
  const [hasServices, setHasServices] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!pedidoId) return;
    
    const checkItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('pedidos_venda_itens')
          .select('tipo_item, servico_id')
          .eq('pedido_id', pedidoId);
          
        if (err) throw err;
        
        if (data) {
          const prods = data.some(i => i.tipo_item === 'produto' || (!i.tipo_item && !i.servico_id));
          const servs = data.some(i => i.tipo_item === 'servico' || i.tipo_item === 'serviço' || i.servico_id);
          setHasProducts(prods);
          setHasServices(servs);
        }
      } catch (err) {
        console.error('Erro ao buscar itens do pedido:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkItems();
  }, [pedidoId]);

  const generateNFe = async () => {
    try {
      setIsLoading(true);
      // O fluxo real redireciona para o form de emissão com o pedido_id para revisão
      toast({ title: 'Sucesso', description: 'Redirecionando para geração de NF-e...' });
      navigate(`/fiscal/nfe-produtos/novo?pedido_id=${pedidoId}`);
    } catch (err) {
      setError(err.message);
      toast({ title: 'Erro', description: 'Falha ao iniciar geração de NF-e.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNFSe = async () => {
    try {
      setIsLoading(true);
      // O fluxo real redireciona para o form de emissão com o pedido_id para revisão
      toast({ title: 'Sucesso', description: 'Redirecionando para geração de NFS-e...' });
      navigate(`/fiscal/nfse-servicos/novo?pedido_id=${pedidoId}`);
    } catch (err) {
      setError(err.message);
      toast({ title: 'Erro', description: 'Falha ao iniciar geração de NFS-e.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    isLoading, 
    error, 
    generateNFe, 
    generateNFSe, 
    hasProducts, 
    hasServices 
  };
}