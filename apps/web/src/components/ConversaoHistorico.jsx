import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ConversaoHistorico = ({ orcamentoId, pedidoId }) => {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistorico = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('conversoes_historico')
          .select(`
            *,
            orcamentos:orcamento_id(numero),
            pedidos_venda:pedido_venda_id(numero)
          `)
          .order('data_conversao', { ascending: false });

        if (orcamentoId) {
          query = query.eq('orcamento_id', orcamentoId);
        } else if (pedidoId) {
          query = query.eq('pedido_venda_id', pedidoId);
        } else {
          setHistorico([]);
          return;
        }

        const { data, error } = await query;
        if (!error && data) {
          setHistorico(data);
        }
      } catch (error) {
        console.error('Error fetching historico:', error);
      } finally {
        setLoading(false);
      }
    };

    if (orcamentoId || pedidoId) {
      fetchHistorico();
    }
  }, [orcamentoId, pedidoId]);

  if (loading) return null;
  if (!historico || historico.length === 0) return null;

  return (
    <Card className="mt-6 mb-6 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2 bg-slate-50 dark:bg-slate-900/50">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <History className="h-4 w-4" />
          Histórico de Conversões
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo de Conversão</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">
                    {new Date(h.data_conversao).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      {h.tipo_conversao === 'orcamento_para_pedido' ? (
                        <><span className="text-blue-600 font-medium">Orçamento</span> <ArrowRightLeft className="h-3 w-3" /> <span className="text-emerald-600 font-medium">Pedido</span></>
                      ) : (
                        <><span className="text-emerald-600 font-medium">Pedido</span> <ArrowRightLeft className="h-3 w-3" /> <span className="text-blue-600 font-medium">Orçamento</span></>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {h.orcamentos?.numero} ↔ {h.pedidos_venda?.numero}
                  </TableCell>
                  <TableCell className="text-right">
                     {h.tipo_conversao === 'orcamento_para_pedido' ? (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/vendas/pedidos/${h.pedido_venda_id}`)} className="h-8">
                            <ExternalLink className="h-4 w-4 mr-1" /> Ver Pedido
                        </Button>
                     ) : (
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/vendas/orcamentos/${h.orcamento_id}`)} className="h-8">
                            <ExternalLink className="h-4 w-4 mr-1" /> Ver Orçamento
                        </Button>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversaoHistorico;