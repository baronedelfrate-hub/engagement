import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDateOnly } from '@/lib/dateUtils';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Histórico real: as baixas conciliadas com o extrato (mais recentes primeiro).
const HistoricoConciliacoes = () => {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('movimentacao_baixas')
      .select('id, valor_baixa, data_baixa, data_conciliacao, banco:bancos(nome), movimentacao:movimentacao_financeira(tipo, numero_titulo, cliente:clientes(nome), fornecedor:fornecedores(nome))')
      .eq('status_conciliacao', 'Conciliado')
      .order('data_conciliacao', { ascending: false })
      .order('id', { ascending: false })
      .limit(300)
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setLinhas(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <Helmet><title>Histórico de Conciliações</title></Helmet>
      <PageHeader title="Histórico de Conciliações" description="Baixas já conciliadas com o extrato bancário (as 300 mais recentes)." />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">Não foi possível carregar o histórico: {error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted font-medium text-foreground">
                  <tr>
                    <th className="p-4 text-left">Conciliada em</th>
                    <th className="p-4 text-left">Data da baixa</th>
                    <th className="p-4 text-left">Banco</th>
                    <th className="p-4 text-left">Título</th>
                    <th className="p-4 text-left">Cliente / fornecedor</th>
                    <th className="p-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {linhas.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-muted-foreground">Nenhuma conciliação registrada ainda.</td></tr>
                  ) : linhas.map((b) => {
                    const pagar = b.movimentacao?.tipo === 'pagar';
                    const nome = pagar ? b.movimentacao?.fornecedor?.nome : b.movimentacao?.cliente?.nome;
                    return (
                      <tr key={b.id} className="hover:bg-muted">
                        <td className="p-4">{b.data_conciliacao ? formatDateOnly(b.data_conciliacao) : '—'}</td>
                        <td className="p-4">{b.data_baixa ? formatDateOnly(b.data_baixa) : '—'}</td>
                        <td className="p-4">{b.banco?.nome || '—'}</td>
                        <td className="p-4 font-mono text-xs">{b.movimentacao?.numero_titulo || '—'}</td>
                        <td className="p-4">{nome || '—'}</td>
                        <td className={`p-4 text-right font-medium ${pagar ? 'text-red-600' : 'text-emerald-600'}`}>{pagar ? '-' : ''}{brl(b.valor_baixa)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default HistoricoConciliacoes;
