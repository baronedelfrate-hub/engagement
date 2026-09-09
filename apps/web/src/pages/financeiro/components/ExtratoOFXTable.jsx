import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react';
import SkeletonLoader from '@/components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ExtratoOFXTable = ({ data = [], loading, selectedId, onSelect }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-xl p-4 h-[500px]">
        <SkeletonLoader className="h-10 w-full mb-4 opacity-10" />
        <SkeletonLoader className="h-16 w-full mb-2 opacity-10" />
        <SkeletonLoader className="h-16 w-full mb-2 opacity-10" />
      </div>
    );
  }

  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="bg-background border border-border rounded-xl overflow-hidden shadow-lg h-[600px] flex flex-col">
      <div className="p-4 bg-muted/50 border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          Extrato Bancário
          <Badge variant="secondary" className="bg-muted">{safeData.length}</Badge>
        </h3>
        {safeData.length === 0 && (
          <Button variant="outline" size="sm" onClick={() => navigate('/financeiro/importar-extrato')} className="h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
            <UploadCloud className="h-3 w-3 mr-2" /> Importar
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12 text-center"></TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase w-24">Data</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase">Descrição</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase text-right">Valor</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase text-center w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeData.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                    <p className="mb-4">Nenhum registro de extrato importado para estes filtros.</p>
                    <Button onClick={() => navigate('/financeiro/importar-extrato')} className="bg-blue-600 hover:bg-blue-700">
                        Importar Extrato OFX/CSV
                    </Button>
                 </TableCell>
              </TableRow>
            ) : safeData.map((row) => {
              const isConciliado = row?.status_conciliacao === 'Conciliado';
              const isSelected = selectedId === row?.id;
              
              const dateVal = row?.data_transacao ? new Date(row.data_transacao).toLocaleDateString('pt-BR') : '-';
              const valorVal = typeof row?.valor === 'number' ? row.valor : 0;
              
              return (
                <TableRow 
                  key={row?.id || Math.random().toString()} 
                  className={`border-border/50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-900/20' : 'hover:bg-muted/30'}`}
                  onClick={() => onSelect(isSelected ? null : row)}
                >
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={(checked) => onSelect(checked ? row : null)}
                        disabled={isConciliado}
                        className="border-border data-[state=checked]:bg-indigo-600"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {dateVal}
                  </TableCell>
                  <TableCell>
                    <div className="text-foreground text-sm truncate max-w-[180px]" title={row?.descricao || ''}>
                      {row?.descricao || 'S/N'}
                    </div>
                    {row?.numero_documento && (
                      <div className="text-muted-foreground text-xs truncate">
                        Doc: {row.numero_documento}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium whitespace-nowrap text-sm ${valorVal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {valorVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    {isConciliado ? (
                       <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" title="Conciliado" />
                    ) : (
                       <AlertCircle className="h-4 w-4 text-amber-500 mx-auto" title="Pendente" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExtratoOFXTable;