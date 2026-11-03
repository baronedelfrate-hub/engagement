import { usoDoLimite } from '@/lib/bancoLimite';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownToLine, ArrowUpToLine, CheckCircle2, AlertCircle, Scale, Calendar } from 'lucide-react';

const SummaryCard = ({ title, value, subvalue, icon: Icon, colorClass }) => (
  <Card className="bg-background border-border">
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {subvalue && <p className="text-xs text-muted-foreground">{subvalue}</p>}
      </div>
    </CardContent>
  </Card>
);

const ConciliacaoSummarySection = ({ sistemaBaixas, ofxTransacoes, saldoInicial, dataSaldoInicial, limite = 0 }) => {
  const totSisPagar = sistemaBaixas.filter(i => i.tipo_geral === 'PAGAR').reduce((a, b) => a + Math.abs(b.valor), 0);
  const totSisRec = sistemaBaixas.filter(i => i.tipo_geral === 'RECEBER').reduce((a, b) => a + b.valor, 0);
  const movimentacaoSis = totSisRec - totSisPagar;
  const saldoFinalSis = (saldoInicial || 0) + movimentacaoSis;

  const totOfxPagar = ofxTransacoes.filter(i => i.valor < 0).reduce((a, b) => a + Math.abs(b.valor), 0);
  const totOfxRec = ofxTransacoes.filter(i => i.valor > 0).reduce((a, b) => a + b.valor, 0);
  const movimentacaoOfx = totOfxRec - totOfxPagar;
  const saldoFinalOfx = (saldoInicial || 0) + movimentacaoOfx;

  const diff = saldoFinalSis - saldoFinalOfx;
  // limite da conta: saldo negativo = limite em uso; disponível = saldo + limite
  const usoSis = usoDoLimite(saldoFinalSis, limite);
  const usoOfx = usoDoLimite(saldoFinalOfx, limite);
  const mostrarLimite = limite > 0 || usoSis.usando || usoOfx.usando;

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
                  <p className="text-sm font-medium text-muted-foreground">Saldo Inicial</p>
                  <p className="text-2xl font-bold text-white">{formatBRL(saldoInicial)}</p>
                </div>
              </div>
              {dataSaldoInicial && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Data de Referência</p>
                  <p className="text-sm font-semibold text-blue-300">{formatDate(dataSaldoInicial)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limite da conta */}
      {mostrarLimite && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[['Sistema', usoSis], ['Extrato', usoOfx]].map(([nome, u]) => (
            <Card key={nome} className={u.estourou ? 'border-red-500/60' : u.usando ? 'border-amber-500/60' : ''}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase font-bold">Saldo disponível — {nome} (saldo + limite)</p>
                <p className={`text-xl font-bold ${u.disponivel < 0 ? 'text-red-600' : ''}`}>{formatBRL(u.disponivel)}</p>
                <p className={`text-xs mt-1 ${u.estourou ? 'text-red-600' : u.usando ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {u.estourou
                    ? (u.limite > 0 ? `Passou do limite em ${formatBRL(u.excedido)} (limite de ${formatBRL(u.limite)})` : 'Saldo negativo e a conta não tem limite cadastrado')
                    : u.usando
                      ? `Usando ${formatBRL(u.usado)} do limite de ${formatBRL(u.limite)}${u.percentual != null ? ` (${u.percentual.toLocaleString('pt-BR')}%)` : ''} · livre ${formatBRL(u.restante)}`
                      : `Limite de ${formatBRL(u.limite)} sem uso`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
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