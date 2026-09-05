import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownToLine, ArrowUpToLine, CheckCircle2, AlertCircle, Scale, Calendar } from 'lucide-react';

const SummaryCard = ({ title, value, subvalue, icon: Icon, colorClass }) => (
  <Card className="bg-slate-900 border-slate-800">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {subvalue && <p className="text-xs text-slate-500">{subvalue}</p>}
      </div>
    </CardContent>
  </Card>
);

const ConciliacaoSummarySection = ({ sistemaBaixas, ofxTransacoes, saldoInicial, dataSaldoInicial }) => {
  const totSisPagar = sistemaBaixas.filter(i => i.tipo_geral === 'PAGAR').reduce((a, b) => a + Math.abs(b.valor), 0);
  const totSisRec = sistemaBaixas.filter(i => i.tipo_geral === 'RECEBER').reduce((a, b) => a + b.valor, 0);
  const movimentacaoSis = totSisRec - totSisPagar;
  const saldoFinalSis = (saldoInicial || 0) + movimentacaoSis;

  const totOfxPagar = ofxTransacoes.filter(i => i.valor < 0).reduce((a, b) => a + Math.abs(b.valor), 0);
  const totOfxRec = ofxTransacoes.filter(i => i.valor > 0).reduce((a, b) => a + b.valor, 0);
  const movimentacaoOfx = totOfxRec - totOfxPagar;
  const saldoFinalOfx = (saldoInicial || 0) + movimentacaoOfx;

  const diff = saldoFinalSis - saldoFinalOfx;

  const concSis = sistemaBaixas.filter(i => i.status_conciliacao === 'Conciliado').length;
  const pendSis = sistemaBaixas.length - concSis;
  const concOfx = ofxTransacoes.filter(i => i.status_conciliacao === 'Conciliado').length;
  const pendOfx = ofxTransacoes.length - concOfx;

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Initial Balance Info */}
      {saldoInicial !== null && saldoInicial !== undefined && (
        <Card className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-400">Saldo Inicial</p>
                  <p className="text-2xl font-bold text-white">{formatBRL(saldoInicial)}</p>
                </div>
              </div>
              {dataSaldoInicial && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">Data de Referência</p>
                  <p className="text-sm font-semibold text-blue-300">{formatDate(dataSaldoInicial)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Saldo Final Sistema" 
          value={formatBRL(saldoFinalSis)} 
          subvalue={`${sistemaBaixas.length} registros (${formatBRL(movimentacaoSis)} mov.)`}
          icon={ArrowUpToLine} 
          colorClass="bg-blue-500/20 text-blue-500" 
        />
        <SummaryCard 
          title="Saldo Final Extrato" 
          value={formatBRL(saldoFinalOfx)} 
          subvalue={`${ofxTransacoes.length} registros (${formatBRL(movimentacaoOfx)} mov.)`}
          icon={ArrowDownToLine} 
          colorClass="bg-indigo-500/20 text-indigo-500" 
        />
        <SummaryCard 
          title="Diferença de Saldos" 
          value={formatBRL(diff)} 
          subvalue={diff === 0 ? 'Equilibrado ✓' : 'Verifique lançamentos'}
          icon={Scale} 
          colorClass={diff === 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"} 
        />
        <SummaryCard 
          title="Status Conciliação" 
          value={`${concSis} Conciliados`} 
          subvalue={`${pendSis} Sis / ${pendOfx} OFX Pendentes`}
          icon={pendSis === 0 && pendOfx === 0 ? CheckCircle2 : AlertCircle} 
          colorClass={pendSis === 0 && pendOfx === 0 ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"} 
        />
      </div>
    </div>
  );
};

export default ConciliacaoSummarySection;