import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ArrowDownToLine, AlertCircle, Clock, Calculator, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../utils/FiscalDashboardUtils';

export default function FiscalDashboardIndicators({ data, loading }) {
  const { indicators } = data;

  const cards = [
    {
      title: 'Total NF-e Emitidas',
      value: indicators.totalNfe,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950/30',
      trend: indicators.variacaoNfe === null ? null : `${indicators.variacaoNfe >= 0 ? '+' : ''}${indicators.variacaoNfe}% vs mês ant.`,
      trendIcon: indicators.variacaoNfe >= 0 ? TrendingUp : TrendingDown,
      trendColor: indicators.variacaoNfe >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Total NFS-e Emitidas',
      value: indicators.totalNfse,
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-950/30',
      trend: indicators.variacaoNfse === null ? null : `${indicators.variacaoNfse >= 0 ? '+' : ''}${indicators.variacaoNfse}% vs mês ant.`,
      trendIcon: indicators.variacaoNfse >= 0 ? TrendingUp : TrendingDown,
      trendColor: indicators.variacaoNfse >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Total Notas Entrada',
      value: indicators.totalEntrada,
      icon: ArrowDownToLine,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/30',
      trend: indicators.variacaoEntrada === null ? null : `${indicators.variacaoEntrada >= 0 ? '+' : ''}${indicators.variacaoEntrada}% vs mês ant.`,
      trendIcon: indicators.variacaoEntrada >= 0 ? TrendingUp : TrendingDown,
      trendColor: indicators.variacaoEntrada >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Pendentes Manifestação',
      value: indicators.pendentesManifestacao,
      icon: AlertCircle,
      color: indicators.pendentesManifestacao > 0 ? 'text-amber-600' : 'text-muted-foreground',
      bgColor: indicators.pendentesManifestacao > 0 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-muted',
      isWarning: indicators.pendentesManifestacao > 0
    },
    {
      title: 'Pendentes Contabilidade',
      value: indicators.pendentesContabilidade,
      icon: Clock,
      color: indicators.pendentesContabilidade > 0 ? 'text-orange-600' : 'text-muted-foreground',
      bgColor: indicators.pendentesContabilidade > 0 ? 'bg-orange-100 dark:bg-orange-950/30' : 'bg-muted',
      isWarning: indicators.pendentesContabilidade > 0
    },
    {
      title: 'Impostos Apurados',
      value: formatCurrency(indicators.totalImpostos),
      icon: Calculator,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950/30'
      // Sem uma janela de comparação confiável (apuração é por período de referência,
      // não por data corrida) — sem tendência fake aqui.
    },
    {
      title: 'Pendências Fiscais',
      value: indicators.totalPendencias,
      icon: AlertTriangle,
      color: indicators.totalPendencias > 0 ? 'text-red-600' : 'text-muted-foreground',
      bgColor: indicators.totalPendencias > 0 ? 'bg-red-100 dark:bg-red-950/30' : 'bg-muted',
      isCritical: indicators.totalPendencias > 0
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(7)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
      {cards.map((card, index) => (
        <Card key={index} className={`border-l-4 ${card.isCritical ? 'border-l-red-500' : card.isWarning ? 'border-l-amber-500' : 'border-l-slate-200'} shadow-sm`}>
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-medium text-muted-foreground leading-tight">{card.title}</p>
              <div className={`p-1.5 rounded-md ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">{card.value}</h3>
              {card.trend && (
                <div className="flex items-center gap-1 mt-1">
                  <card.trendIcon className={`w-3 h-3 ${card.trendColor}`} />
                  <span className={`text-xs ${card.trendColor}`}>{card.trend}</span>
                </div>
              )}
              {card.isCritical && <span className="text-xs text-red-600 font-medium mt-1 block">Ação Necessária</span>}
              {card.isWarning && !card.isCritical && <span className="text-xs text-amber-600 font-medium mt-1 block">Atenção</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}