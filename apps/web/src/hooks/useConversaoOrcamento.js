import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useConversaoOrcamento = () => {
    const [isConverting, setIsConverting] = useState(false);
    const { toast } = useToast();

    const podeConverterOrcamento = (status) => {
        return status === 'aprovado' || status === 'pendente' || status === 'enviado';
    };

    const converterOrcamentoParaPedido = async (orcamentoId) => {
        setIsConverting(true);
        try {
            // 1. Fetch Orcamento
            const { data: orcamento, error: orcErr } = await supabase
                .from('orcamentos')
                .select('*')
                .eq('id', orcamentoId)
                .single();

            if (orcErr) throw orcErr;

            // 2. Fetch Itens
            const { data: itens, error: itensErr } = await supabase
                .from('orcamento_itens')
                .select('*')
                .eq('orcamento_id', orcamentoId);

            if (itensErr) throw itensErr;

            // 3. Create Pedido
            const novoPedido = {
                numero: `PV-${Date.now().toString().slice(-6)}`,
                cliente_id: orcamento.cliente_id,
                data_emissao: new Date().toISOString().split('T')[0],
                valor_total: orcamento.valor_total,
                status_pedido: 'draft',
                observacoes: orcamento.observacoes,
                orcamento_id: orcamento.id,
                convertido_de_orcamento: true,
                endereco_entrega_mesmo_cliente: true,
                tipo_frete: 'SEM_FRETE',
                valor_frete: 0,
                numero_parcelas: 1
            };

            const { data: pedidoCriado, error: pedidoErr } = await supabase
                .from('pedidos_venda')
                .insert([novoPedido])
                .select()
                .single();

            if (pedidoErr) throw pedidoErr;

            // 4. Create Pedido Itens (Copying all classification and tax fields)
            if (itens && itens.length > 0) {
                const novosItens = itens.map(item => ({
                    pedido_id: pedidoCriado.id,
                    produto_id: item.produto_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    desconto: item.desconto,
                    valor_total: item.valor_total,
                    descricao: item.descricao,
                    ncm: item.ncm,
                    cfop: item.cfop,
                    acrescimo: item.acrescimo,
                    aliquota_icms: item.aliquota_icms,
                    valor_icms: item.valor_icms,
                    aliquota_ipi: item.aliquota_ipi,
                    valor_ipi: item.valor_ipi,
                    aliquota_pis: item.aliquota_pis,
                    valor_pis: item.valor_pis,
                    aliquota_cofins: item.aliquota_cofins,
                    valor_cofins: item.valor_cofins,
                    // Classification fields
                    categoria_id: item.categoria_id,
                    subcategoria_id: item.subcategoria_id,
                    centro_custos_id: item.centro_custos_id,
                    projeto_id: item.projeto_id
                }));

                const { error: insertItensErr } = await supabase
                    .from('pedidos_venda_itens')
                    .insert(novosItens);

                if (insertItensErr) throw insertItensErr;
            }

            // 5. Update Orcamento status
            await supabase
                .from('orcamentos')
                .update({ 
                    status_conversao: 'convertido', 
                    data_conversao: new Date().toISOString(), 
                    pedido_venda_id: pedidoCriado.id 
                })
                .eq('id', orcamentoId);

            toast({ title: 'Sucesso', description: 'Orçamento convertido em Pedido de Venda com sucesso! As classificações foram preservadas.', variant: 'success' });
            return pedidoCriado.id;

        } catch (error) {
            console.error('Erro na conversão:', error);
            toast({ title: 'Erro', description: 'Falha ao converter orçamento.', variant: 'destructive' });
            return null;
        } finally {
            setIsConverting(false);
        }
    };

    return { podeConverterOrcamento, converterOrcamentoParaPedido, isConverting };
};