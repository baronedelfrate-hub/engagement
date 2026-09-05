import React from 'react';
import { motion } from 'framer-motion';
import { Draggable } from '@hello-pangea/dnd';
import { FileText, Calendar, DollarSign, Link, AlertTriangle, Receipt, Building2, PieChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/lib/storage';

const CardNotaFiscal = ({ nota, index, onClick, onAction }) => {
  
  const getIcon = () => {
      if (nota.tipo_nota === 'NFSe') return <FileText className="h-3 w-3" />;
      if (nota.tipo_nota === 'SERVICO') return <Building2 className="h-3 w-3" />;
      return <Receipt className="h-3 w-3" />; // DANFE Default
  };

  const getOriginBadge = () => {
      if (nota.origem === 'IMPORTADO_XML') return <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-200">XML</Badge>;
      if (nota.origem === 'MANUAL') return <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">Manual</Badge>;
      return null;
  };

  // Check if rateios exist
  const hasRateio = () => {
      const allRateios = storage.get('NF_RATEIO') || [];
      return allRateios.some(r => r.nota_id === nota.id);
  };

  const isRateioPresent = hasRateio();

  return (
    <Draggable draggableId={nota.id} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            bg-white p-3 rounded-lg shadow-sm border mb-3 relative group
            ${snapshot.isDragging ? 'shadow-xl rotate-2 z-50 ring-2 ring-primary' : 'hover:shadow-md border-slate-200'}
          `}
          onClick={() => onClick(nota)}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
                <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] flex gap-1">
                        {getIcon()}
                        {nota.tipo_nota || 'DANFE'}
                    </Badge>
                    {getOriginBadge()}
                    {isRateioPresent && (
                        <div className="flex items-center text-[9px] text-blue-600 gap-0.5 bg-blue-50 px-1 rounded border border-blue-100" title="Possui rateio de custo">
                            <PieChart className="h-3 w-3" />
                        </div>
                    )}
                </div>
                <h4 className="font-bold text-sm text-slate-800 leading-tight mb-0.5 truncate max-w-[180px]" title={nota.emitente_nome}>
                    {nota.emitente_nome}
                </h4>
                <div className="text-[10px] text-slate-500">
                    Nº {nota.numero}
                </div>
            </div>
            
            {nota.pedido_compra_id && (
                 <div className="bg-blue-100 text-blue-700 p-1 rounded-full" title="Pedido Vinculado">
                    <Link className="h-3 w-3" />
                 </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
             <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-700">
                <DollarSign className="h-3 w-3 text-slate-400" />
                {parseFloat(nota.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
             </div>
             <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Calendar className="h-3 w-3" />
                {nota.data_emissao ? new Date(nota.data_emissao).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' }) : '-'}
             </div>
          </div>
          
          {nota.status === 'Rejeitada' && (
              <div className="absolute top-2 right-2 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
              </div>
          )}
        </motion.div>
      )}
    </Draggable>
  );
};

export default CardNotaFiscal;