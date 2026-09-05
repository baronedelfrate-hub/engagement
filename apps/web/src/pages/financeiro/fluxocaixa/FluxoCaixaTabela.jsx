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
    <div className="w-full bg-white rounded-lg shadow border border-gray-200">
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
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        <table style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse' }}>
          <thead>
            {/* Header Row 1: Dates */}
            <tr className="bg-slate-50 border-b border-gray-200">
              <th 
                style={{
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 20, 
                  backgroundColor: '#f8fafc',
                  minWidth: '280px', 
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '2px solid #e2e8f0'
                }}
                className="font-semibold text-slate-700 text-sm uppercase tracking-wider shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
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
                    borderRight: '1px solid #e2e8f0'
                  }}
                  className="text-sm font-medium text-slate-600"
                >
                  {day}
                </th>
              ))}
            </tr>
            {/* Header Row 2: Previsto / Realizado */}
            <tr className="bg-slate-50 border-b border-gray-300">
              <th 
                style={{
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 20, 
                    backgroundColor: '#f8fafc',
                    borderRight: '2px solid #e2e8f0'
                }}
                className="shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
              ></th> {/* Empty cell for sticky column corner */}
              {days.map((_, index) => (
                <React.Fragment key={index}>
                  <th 
                    style={{ minWidth: '110px', padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}
                    className="text-xs font-semibold text-blue-600 bg-blue-50/50 border-r border-gray-100"
                  >
                    Previsto
                  </th>
                  <th 
                    style={{ minWidth: '110px', padding: '8px', textAlign: 'right', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}
                    className="text-xs font-semibold text-emerald-600 bg-emerald-50/50"
                  >
                    Realizado
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td 
                  style={{
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 10, 
                    backgroundColor: 'white',
                    padding: '12px',
                    whiteSpace: 'nowrap',
                    borderRight: '2px solid #e2e8f0'
                  }}
                  className="text-sm font-medium text-slate-700 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.code}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[240px]" title={row.name}>{row.name}</span>
                  </div>
                </td>
                {days.map((day, dIndex) => {
                  const dayData = row.values[day] || { previsto: 0, realizado: 0 };
                  return (
                    <React.Fragment key={dIndex}>
                      <td 
                        style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px' }}
                        className="text-sm text-slate-600 border-r border-gray-100 bg-blue-50/10"
                      >
                         {dayData.previsto > 0 ? formatCurrency(dayData.previsto) : '-'}
                      </td>
                      <td 
                        style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px', borderRight: '1px solid #e2e8f0' }}
                        className="text-sm text-slate-600 bg-emerald-50/10"
                      >
                         {dayData.realizado > 0 ? (
                           <span className="font-medium text-emerald-700">
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
      <div className="p-2 text-xs text-center text-gray-400 bg-gray-50 border-t border-gray-200">
        Use a barra de rolagem horizontal para ver os 60 dias
      </div>
    </div>
  );
};

export default FluxoCaixaTabela;