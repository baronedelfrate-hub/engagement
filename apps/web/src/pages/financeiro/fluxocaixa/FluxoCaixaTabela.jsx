import React from 'react';
import { Card } from '@/components/ui/card';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { formatCurrency } from './fluxoCaixaUtils';

const FluxoCaixaTabela = ({ data, loading }) => {
  if (loading) {
    return <div className="p-4"><p>Carregando dados...</p></div>;
  }

  if (!data || !data.days || !data.rows) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhum dado disponível para o período selecionado.
      </Card>
    );
  }

  const { days, rows } = data;

  return (
    <div className="w-full bg-background rounded-lg shadow border border-border">
      {/* 
        DEBUG/FIX SCROLLBAR: 
        Wrapper div forces overflow-x scroll.
        Fixed styles ensure no CSS framework conflicts hide the scrollbar.
      */}
      <div 
        style={{
          width: '100%', 
          height: 'auto', 
          overflowX: 'scroll', 
          overflowY: 'hidden',
          paddingBottom: '12px' // Space for scrollbar
        }}
        className="scrollbar-thin scrollbar-thumb-border scrollbar-track-muted"
      >
        <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse' }}>
          <thead>
            {/* Header Row 1: Dates */}
            <tr className="bg-muted border-b border-border">
              <th 
                style={{
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 20, 
                  backgroundColor: 'hsl(var(--muted))',
                  minWidth: '280px', 
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '2px solid hsl(var(--border))'
                }}
                className="font-semibold text-foreground text-sm uppercase tracking-wider shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
              >
                Centro de Custos
              </th>
              {days.map((day, index) => (
                <th 
                  key={index} 
                  colSpan={2}
                  style={{
                    minWidth: '220px', 
                    padding: '8px', 
                    textAlign: 'center',
                    borderRight: '1px solid hsl(var(--border))'
                  }}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {day}
                </th>
              ))}
            </tr>
            {/* Header Row 2: Previsto / Realizado */}
            <tr className="bg-muted border-b border-border">
              <th 
                style={{
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 20, 
                    backgroundColor: 'hsl(var(--muted))',
                    borderRight: '2px solid hsl(var(--border))'
                }}
                className="shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
              ></th> {/* Empty cell for sticky column corner */}
              {days.map((_, index) => (
                <React.Fragment key={index}>
                  <th 
                    style={{ minWidth: '110px', padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-r border-border"
                  >
                    Previsto
                  </th>
                  <th 
                    style={{ minWidth: '110px', padding: '8px', textAlign: 'right', whiteSpace: 'nowrap', borderRight: '1px solid hsl(var(--border))' }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                  >
                    Realizado
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted transition-colors">
                <td 
                  style={{
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 10, 
                    backgroundColor: 'hsl(var(--background))',
                    padding: '12px',
                    whiteSpace: 'nowrap',
                    borderRight: '2px solid hsl(var(--border))'
                  }}
                  className="text-sm font-medium text-foreground shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground">{row.code}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[240px]" title={row.name}>{row.name}</span>
                  </div>
                </td>
                {days.map((day, dIndex) => {
                  const dayData = row.values[day] || { previsto: 0, realizado: 0 };
                  return (
                    <React.Fragment key={dIndex}>
                      <td 
                        style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px' }}
                        className="text-sm text-muted-foreground border-r border-border bg-blue-50/10 dark:bg-blue-950/10"
                      >
                         {dayData.previsto > 0 ? formatCurrency(dayData.previsto) : '-'}
                      </td>
                      <td 
                        style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px', borderRight: '1px solid hsl(var(--border))' }}
                        className="text-sm text-muted-foreground bg-emerald-50/10 dark:bg-emerald-950/10"
                      >
                         {dayData.realizado > 0 ? (
                           <span className="font-medium text-emerald-700 dark:text-emerald-400">
                             {formatCurrency(dayData.realizado)}
                           </span>
                         ) : '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-2 text-xs text-center text-muted-foreground bg-muted border-t border-border">
        Use a barra de rolagem horizontal para ver os 60 dias
      </div>
    </div>
  );
};

export default FluxoCaixaTabela;