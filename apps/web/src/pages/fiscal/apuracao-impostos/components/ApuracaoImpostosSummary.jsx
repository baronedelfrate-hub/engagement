import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator, Clock, CheckCircle2, Send, DollarSign, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/apuracaoUtils';

export default function ApuracaoImpostosSummary({ data }) {
  
  const summary = useMemo(() => {
    const s = {
      total: 0,
      emAberto: 0,
      emConferencia: 0,
      fechado: 0,
      enviado: 0,
      pago: 0
    };

    data.forEach(item => {
      const val = parseFloat(item.valor_apurado) || 0;
      s.total += val;
      if (item.status === 'Em aberto') s.emAberto += val;
      if (item.status === 'Em conferência') s.emConferencia += val;
      if (item.status === 'Fechado') s.fechado += val;
      if (item.status === 'Enviado à contabilidade') s.enviado += val;
      if (item.status === 'Pago') s.pago += val;
    });

    return s;
  }, [data]);

  const calcPerc = (val) => summary.total > 0 ? Math.round((val / summary.total) * 100) : 0;

  const cards = [
    { title: 'Total Apurado', value: summary.total, icon: Calculator, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { title: 'Em Aberto', value: summary.emAberto, perc: calcPerc(summary.emAberto), icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
    { title: 'Em Conferência', value: summary.emConferencia, perc: calcPerc(summary.emConferencia), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    { title: 'Fechado', value: summary.fechado, perc: calcPerc(summary.fechado), icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    { title: 'Enviado (Contab.)', value: summary.enviado, perc: calcPerc(summary.enviado), icon: Send, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { title: 'Pago', value: summary.pago, perc: calcPerc(summary.pago), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((c, i) => (
        <Card key={i} className="shadow-sm border-border">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-muted-foreground">{c.title}</span>
              <div className={`p-1.5 rounded-md ${c.bg} ${c.color}`}>
                <c.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{formatCurrency(c.value)}</h3>
              {c.perc !== undefined && (
                <p className="text-[10px] text-muted-foreground mt-1">{c.perc}% do total</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}