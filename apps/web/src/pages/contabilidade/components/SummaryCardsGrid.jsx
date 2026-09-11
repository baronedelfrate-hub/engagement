import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar, Wallet as Ledger, Link2, CheckCircle, BarChart3 } from 'lucide-react';

export default function SummaryCardsGrid({ summary }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Card 1 - Documentos Pendentes */}
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-orange-500 bg-background" onClick={() => navigate('/contabilidade/documentos')}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Documentos Pendentes</p>
              <h3 className="text-3xl font-bold text-foreground mt-2">{summary.documentosPendentes.total}</h3>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-orange-600 dark:text-orange-400"><FileText className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>NF-e: <b className="text-orange-600">{summary.documentosPendentes.nfe}</b></span>
            <span>NFS-e: <b className="text-orange-600">{summary.documentosPendentes.nfse}</b></span>
            <span>Outros: <b>{summary.documentosPendentes.outros}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - Fechamentos em Aberto */}
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-red-500 bg-background" onClick={() => navigate('/contabilidade/fechamento')}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fechamentos em Aberto</p>
              <h3 className="text-3xl font-bold text-foreground mt-2">{summary.fechamentosAberto.total}</h3>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600 dark:text-red-400"><Calendar className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Mês atual: <b className="text-red-600">{summary.fechamentosAberto.mesAtual}</b></span>
            <span>Anteriores: <b className="text-red-600">{summary.fechamentosAberto.mesesAnteriores}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 - Lançamentos Pendentes */}
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-yellow-500 bg-background" onClick={() => navigate('/contabilidade/lancamentos')}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lançamentos Pendentes</p>
              <h3 className="text-3xl font-bold text-foreground mt-2">{summary.lancamentosPendentes.total}</h3>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg text-yellow-600 dark:text-yellow-400"><Ledger className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Auto: <b>{summary.lancamentosPendentes.automaticos}</b></span>
            <span>Manuais: <b className="text-yellow-600">{summary.lancamentosPendentes.manuais}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 - NF Não Vinculadas */}
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-purple-500 bg-background" onClick={() => navigate('/contabilidade/documentos')}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">NF Não Vinculadas</p>
              <h3 className="text-3xl font-bold text-foreground mt-2">{summary.nfNaoVinculadas.total}</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-purple-600 dark:text-purple-400"><Link2 className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>NF-e: <b className="text-purple-600">{summary.nfNaoVinculadas.nfe}</b></span>
            <span>NFS-e: <b className="text-purple-600">{summary.nfNaoVinculadas.nfse}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Card 5 - Conciliações Pendentes */}
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-blue-500 bg-background" onClick={() => navigate('/contabilidade/pendencias')}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conciliações Pendentes</p>
              <h3 className="text-3xl font-bold text-foreground mt-2">{summary.conciliacoesPendentes.total}</h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400"><CheckCircle className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>Bancária: <b>{summary.conciliacoesPendentes.bancaria}</b></span>
            <span>Fiscal: <b>{summary.conciliacoesPendentes.fiscal}</b></span>
            <span>Outras: <b>{summary.conciliacoesPendentes.outras}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Card 6 - Relatórios Disponíveis */}
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-t-4 border-t-emerald-500 bg-background" onClick={() => navigate('/contabilidade/dre-balancete')}>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Relatórios Disponíveis</p>
              <h3 className="text-3xl font-bold text-foreground mt-2">{summary.relatoriosDisponiveis.total}</h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400"><BarChart3 className="w-6 h-6" /></div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span>DRE: <b className="text-emerald-600">{summary.relatoriosDisponiveis.dre}</b></span>
            <span>Balancete: <b className="text-emerald-600">{summary.relatoriosDisponiveis.balancete}</b></span>
            <span>Outros: <b>{summary.relatoriosDisponiveis.outros}</b></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}