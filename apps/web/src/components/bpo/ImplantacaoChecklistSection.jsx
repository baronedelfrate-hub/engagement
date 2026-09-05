import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useImplantacaoChecklist } from '@/hooks/useImplantacaoChecklist';
import { Loader2, CheckSquare } from 'lucide-react';

const ITEMS = [
  { key: 'item_1_checked', label: 'Implantação e/ou ajustes de sistema (se houver necessidade)' },
  { key: 'item_2_checked', label: 'Realizar parametrizações necessárias' },
  { key: 'item_3_checked', label: 'Definir e padronizar os tipos de documentos a serem pagos e recebidos' },
  { key: 'item_4_checked', label: 'Alinhar e padronizar o meio de recebimento dos documentos a serem pagos' }
];

export default function ImplantacaoChecklistSection({ clienteFasesId }) {
  const { checklist, updateChecklistItem, isLoading } = useImplantacaoChecklist(clienteFasesId);

  if (!clienteFasesId) return null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <CheckSquare className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-800">Checklist de Implantação</h3>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Marque as tarefas concluídas nesta fase. O salvamento é automático.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm font-medium">Carregando checklist...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {ITEMS.map((item) => (
            <div key={item.key} className="flex items-start space-x-3 p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-200 transition-colors">
              <Checkbox 
                id={`checklist-${item.key}`} 
                checked={checklist[item.key]} 
                onCheckedChange={(checked) => updateChecklistItem(item.key, checked)}
                className="mt-0.5 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
              />
              <Label 
                htmlFor={`checklist-${item.key}`} 
                className="text-sm font-medium leading-relaxed cursor-pointer text-slate-700 select-none flex-1"
              >
                {item.label}
              </Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}