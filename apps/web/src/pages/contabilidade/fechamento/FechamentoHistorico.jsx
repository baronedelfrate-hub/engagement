import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, CheckCircle2, AlertCircle, RefreshCcw, Activity } from 'lucide-react';
import { formatDateTime } from '@/lib/fechamentoUtils';

export default function FechamentoHistorico({ historico }) {
  
  const getActionIcon = (acao) => {
    switch (acao?.toLowerCase()) {
      case 'criado': return <Activity className="w-4 h-4 text-blue-500" />;
      case 'status alterado': return <RefreshCcw className="w-4 h-4 text-orange-500" />;
      case 'etapa concluída': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'reabertura': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'etapa reaberta': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!historico || historico.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 rounded-lg">
        Nenhum histórico registrado.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
      {historico.map((item, idx) => (
        <div key={item.id || idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-[-11px] md:left-1/2">
            {getActionIcon(item.acao)}
          </div>
          
          <Card className="w-[calc(100%-2rem)] md:w-[calc(50%-2rem)] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  {item.acao}
                  {item.etapa_numero && <Badge variant="outline" className="text-[10px]">Etapa {item.etapa_numero}</Badge>}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(item.data_acao)}
                </span>
              </div>
              
              {item.status_anterior && item.status_novo && item.status_anterior !== item.status_novo && (
                <div className="text-xs flex items-center gap-2 mt-2 mb-2 bg-slate-50 p-2 rounded border border-slate-100">
                  <Badge variant="secondary" className="font-normal">{item.status_anterior}</Badge>
                  <span className="text-slate-400">→</span>
                  <Badge variant="secondary" className="bg-slate-200 font-normal">{item.status_novo}</Badge>
                </div>
              )}

              {item.observacoes && (
                <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-md">
                  {item.observacoes}
                </p>
              )}

              <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
                <User className="w-3 h-3" />
                <span>{item.usuario?.nome || 'Usuário do Sistema'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}