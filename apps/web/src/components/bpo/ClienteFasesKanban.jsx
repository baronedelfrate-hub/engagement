import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PHASE_NAMES, STATUS_COLORS } from '@/lib/bpoE5PhaseConfig';
import { Edit, Calendar, User, AlertCircle } from 'lucide-react';
import { isRequiredFileUploaded } from '@/lib/bpoE5FileValidator';
import { motion } from 'framer-motion';

export default function ClienteFasesKanban({ fases, arquivos, onEditFase }) {
  console.log('[ClienteFasesKanban] Kanban renderizado, Fases:', fases?.length);

  if (!fases || fases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
        <AlertCircle className="h-10 w-10 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-800">Nenhuma fase encontrada</h3>
        <p className="text-slate-500 text-sm mt-1">As fases do BPO ainda não foram inicializadas para este cliente.</p>
      </div>
    );
  }

  // Define accent colors corresponding to each BPO phase
  const getPhaseAccentColor = (faseId) => {
    switch(faseId) {
      case 'B1': return 'border-blue-500 bg-blue-50';
      case 'B2': return 'border-emerald-500 bg-emerald-50';
      case 'B3': return 'border-yellow-500 bg-yellow-50';
      case 'B4': return 'border-orange-500 bg-orange-50';
      case 'B5': return 'border-purple-500 bg-purple-50';
      default: return 'border-slate-300 bg-slate-50';
    }
  };

  const renderFaseCard = (faseId, index) => {
    const faseData = fases.find(f => f.fase === faseId);
    if (!faseData) return null;

    const faseArquivos = arquivos?.[faseData.id] || [];
    const statusColor = STATUS_COLORS[faseData.status] || STATUS_COLORS['Pendente'];
    const phaseAccent = getPhaseAccentColor(faseData.fase);

    return (
      <motion.div
        key={faseData.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className="flex-1 min-w-[300px] md:min-w-[320px]"
      >
        <Card 
          className={`h-full border-t-4 shadow-sm flex flex-col hover:shadow-md transition-all duration-200 ${phaseAccent.split(' ')[0]} bg-white cursor-pointer`}
          onClick={() => onEditFase(faseData)}
        >
          <CardHeader className={`p-4 border-b border-slate-100 ${phaseAccent.split(' ')[1]}`}>
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="font-bold border-slate-300 text-slate-800 bg-white shadow-sm">
                {faseData.fase}
              </Badge>
              <Badge variant="outline" className={statusColor}>
                {faseData.status}
              </Badge>
            </div>
            <CardTitle className="text-base text-slate-800 font-semibold leading-tight">
              {PHASE_NAMES[faseData.fase]}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 flex-1 flex flex-col">
            <div className="space-y-2 mb-4 flex-1">
              <div className="flex items-center text-xs text-slate-500">
                <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>
                  {faseData.data_inicio ? new Date(faseData.data_inicio).toLocaleDateString() : 'A iniciar'} 
                  {' - '} 
                  {faseData.data_conclusao ? new Date(faseData.data_conclusao).toLocaleDateString() : 'Em aberto'}
                </span>
              </div>
              <div className="flex items-center text-xs text-slate-500">
                <User className="w-4 h-4 mr-1.5 text-slate-400" />
                <span>Responsável: Não atribuído</span>
              </div>
            </div>

            <div className="space-y-3 mb-4 border-t border-slate-100 pt-4">
              <div className="flex items-start space-x-2">
                <Checkbox checked={faseData.status === 'Em andamento' || faseData.status === 'Concluído'} disabled className="mt-0.5 border-slate-300 data-[state=checked]:bg-primary" />
                <span className="text-xs text-slate-700 leading-tight font-medium">Diagnóstico / Implantação</span>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox checked={faseArquivos.length > 0} disabled className="mt-0.5 border-slate-300 data-[state=checked]:bg-primary" />
                <span className="text-xs text-slate-700 leading-tight font-medium">Anexos de Aprovação</span>
              </div>
              
              {faseData.fase === 'B1' && (
                <div className="flex items-start space-x-2">
                  <Checkbox checked={isRequiredFileUploaded('B1', 'plano_contas', faseArquivos)} disabled className="mt-0.5 border-slate-300 data-[state=checked]:bg-primary" />
                  <span className="text-xs text-slate-700 leading-tight font-medium">Plano de Contas Anexado</span>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-auto bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm transition-colors"
              onClick={(e) => { e.stopPropagation(); onEditFase(faseData); }}
            >
              <Edit className="w-4 h-4 mr-2" /> Editar Fase
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
      {['B1', 'B2', 'B3', 'B4', 'B5'].map((fase, idx) => renderFaseCard(fase, idx))}
    </div>
  );
}