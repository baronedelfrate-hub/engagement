import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PHASE_NAMES, STATUS_COLORS } from '@/lib/bpoE5PhaseConfig';
import { Edit, Calendar, User, AlertCircle } from 'lucide-react';
import { isRequiredFileUploaded } from '@/lib/bpoE5FileValidator';
import { motion } from 'framer-motion';
import { formatDateOnly } from '@/lib/dateUtils';

export default function ClienteFasesKanban({ fases, arquivos, onEditFase }) {
  console.log('[ClienteFasesKanban] Kanban renderizado, Fases:', fases?.length);

  if (!fases || fases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-background rounded-xl border border-dashed border-border">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground">Nenhuma fase encontrada</h3>
        <p className="text-muted-foreground text-sm mt-1">As fases do BPO ainda não foram inicializadas para este cliente.</p>
      </div>
    );
  }

  // Define accent colors corresponding to each BPO phase
  const getPhaseAccentColor = (faseId) => {
    switch(faseId) {
      case 'B1': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30';
      case 'B2': return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
      case 'B3': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30';
      case 'B4': return 'border-orange-500 bg-orange-50 dark:bg-orange-950/30';
      case 'B5': return 'border-purple-500 bg-purple-50 dark:bg-purple-950/30';
      default: return 'border-border bg-muted';
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
          className={`h-full border-t-4 shadow-sm flex flex-col hover:shadow-md transition-all duration-200 ${phaseAccent.split(' ')[0]} bg-background cursor-pointer`}
          onClick={() => onEditFase(faseData)}
        >
          <CardHeader className={`p-4 border-b border-border ${phaseAccent.split(' ').slice(1).join(' ')}`}>
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="font-bold border-border text-foreground bg-background shadow-sm">
                {faseData.fase}
              </Badge>
              <Badge variant="outline" className={statusColor}>
                {faseData.status}
              </Badge>
            </div>
            <CardTitle className="text-base text-foreground font-semibold leading-tight">
              {PHASE_NAMES[faseData.fase]}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 flex-1 flex flex-col">
            <div className="space-y-2 mb-4 flex-1">
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="w-4 h-4 mr-1.5 text-muted-foreground" />
                <span>
                  {faseData.data_inicio ? formatDateOnly(faseData.data_inicio) : 'A iniciar'}
                  {' - '} 
                  {faseData.data_fim ? formatDateOnly(faseData.data_fim) : 'Em aberto'}
                </span>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="w-4 h-4 mr-1.5 text-muted-foreground" />
                <span>Responsável: Não atribuído</span>
              </div>
            </div>

            <div className="space-y-3 mb-4 border-t border-border pt-4">
              <div className="flex items-start space-x-2">
                <Checkbox checked={faseData.status === 'Em andamento' || faseData.status === 'Concluído'} disabled className="mt-0.5 border-border data-[state=checked]:bg-primary" />
                <span className="text-xs text-foreground leading-tight font-medium">Diagnóstico / Implantação</span>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox checked={faseArquivos.length > 0} disabled className="mt-0.5 border-border data-[state=checked]:bg-primary" />
                <span className="text-xs text-foreground leading-tight font-medium">Anexos de Aprovação</span>
              </div>
              
              {faseData.fase === 'B1' && (
                <div className="flex items-start space-x-2">
                  <Checkbox checked={isRequiredFileUploaded('B1', 'plano_contas', faseArquivos)} disabled className="mt-0.5 border-border data-[state=checked]:bg-primary" />
                  <span className="text-xs text-foreground leading-tight font-medium">Plano de Contas Anexado</span>
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-auto bg-background hover:bg-muted border-border text-foreground shadow-sm transition-colors"
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