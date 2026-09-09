import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table } from 'lucide-react';

const DrilldownModal = ({ isOpen, onClose, items, title }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table className="h-5 w-5 text-blue-500" /> {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted text-foreground font-medium">
                    <tr>
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Origem</th>
                        <th className="p-3 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {items && items.length > 0 ? items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted">
                            <td className="p-3">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                            <td className="p-3 font-medium">{item.descricao}</td>
                            <td className="p-3 text-muted-foreground">{item.categoria}</td>
                            <td className="p-3 text-xs">
                                <span className={`px-2 py-1 rounded ${item.tipo === 'PREVISTO' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'}`}>
                                    {item.tipo}
                                </span>
                            </td>
                            <td className={`p-3 text-right font-bold ${item.valor < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">Nenhum item encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DrilldownModal;