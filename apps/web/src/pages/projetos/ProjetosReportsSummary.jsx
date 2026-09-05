import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, DollarSign, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const ProjetosReportsSummary = ({ stats }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const cards = [
    {
      title: "Total de Projetos",
      value: stats.total,
      icon: <Briefcase className="h-5 w-5 text-blue-600" />,
      bgColor: "bg-blue-100",
      textColor: "text-blue-600"
    },
    {
      title: "Orçamento Total",
      value: formatCurrency(stats.budget),
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      bgColor: "bg-emerald-100",
      textColor: "text-emerald-600"
    },
    {
      title: "Em Andamento",
      value: stats.inProgress,
      icon: <Clock className="h-5 w-5 text-indigo-600" />,
      bgColor: "bg-indigo-100",
      textColor: "text-indigo-600"
    },
    {
      title: "Concluídos",
      value: stats.completed,
      icon: <CheckCircle2 className="h-5 w-5 text-slate-600" />,
      bgColor: "bg-slate-100",
      textColor: "text-slate-600"
    },
    {
      title: "Atrasados",
      value: stats.overdue,
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      bgColor: "bg-red-100",
      textColor: "text-red-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className={`p-3 rounded-full ${card.bgColor}`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</h3>
            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProjetosReportsSummary;