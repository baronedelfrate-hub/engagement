import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wallet, Link as LinkIcon, Unlink, Upload } from 'lucide-react';

import ConciliacaoBancariaFilters from './components/ConciliacaoBancariaFilters';
import ConciliacaoSummarySection from './components/ConciliacaoSummarySection';
import ConciliacaoBancariaTable from './components/ConciliacaoBancariaTable';
import ExtratoOFXTable from './components/ExtratoOFXTable';
import ConciliacaoMatchingModal from './components/ConciliacaoMatchingModal';
import { fetchConciliacaoData } from './utils/ConciliacaoBancariaDataFetcher';
import { useConciliacao } from '@/hooks/useConciliacao';

const initialFilters = {
  dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  dataFim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  bancoId: 'TODOS',
  statusConciliacao: 'NAO_CONCILIADO'
};

const ConciliacaoBancariaPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dropdowns = useFinanceiroDropdowns();
  const { matchTransactions, unmatchTransactions, loading: actionLoading } = useConciliacao();

  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState({ 
    sistemaBaixas: [], 
    ofxTransacoes: [], 
    saldoInicial: 0, 
    dataSaldoInicial: null 
  });
  const [loading, setLoading] = useState(true);
  
  const [selectedSystemId, setSelectedSystemId] = useState(null);
  const [selectedOfxId, setSelectedOfxId] = useState(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setSelectedSystemId(null);
    setSelectedOfxId(null);
    try {
      const result = await fetchConciliacaoData(filters);
      setData(result);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // Load initial data

  const handleApplyFilters = () => {
    loadData();
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    fetchConciliacaoData(initialFilters).then(setData).catch(console.error);
  };

  const handleConfirmMatch = async (sysRec, ofxRec) => {
    const success = await matchTransactions(sysRec, ofxRec);
    if (success) {
      setMatchModalOpen(false);
      loadData();
    }
  };

  const handleUnmatch = async () => {
     // Identify what to unmatch. Usually triggered by unmatching a system record
     const sysRec = data.sistemaBaixas.find(s => s.id === selectedSystemId);
     if (!sysRec || sysRec.status_conciliacao !== 'Conciliado') return;

     if (window.confirm("Desfazer conciliação desta transação?")) {
        const ofxRec = data.ofxTransacoes.find(o => o.id === sysRec.extrato_bancario_id) || { id: sysRec.extrato_bancario_id };
        const success = await unmatchTransactions(sysRec, ofxRec);
        if (success) loadData();
     }
  };

  const getSelectedSysRec = () => data.sistemaBaixas.find(s => s.id === selectedSystemId);
  const getSelectedOfxRec = () => data.ofxTransacoes.find(o => o.id === selectedOfxId);

  const canMatch = selectedSystemId && selectedOfxId;
  const sysSelected = getSelectedSysRec();
  const canUnmatch = sysSelected && sysSelected.status_conciliacao === 'Conciliado';

  return (
    <div className="bg-background min-h-screen text-foreground font-sans pb-16">
      <Helmet><title>Conciliação Bancária Dupla - ERP ENGAGEMENT</title></Helmet>
      
      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <PageHeader 
            title="Conciliação Bancária" 
            description="Cruze os lançamentos do ERP com o extrato bancário (OFX/CSV)."
            icon={Wallet}
          />
          <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/financeiro/importar-extrato')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Extrato
              </Button>

              <Button 
                onClick={loadData} 
                disabled={loading} 
                variant="outline"
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
          </div>
        </div>

        <ConciliacaoBancariaFilters 
          filters={filters}
          setFilters={setFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          dropdowns={dropdowns}
        />

        <ConciliacaoSummarySection 
            sistemaBaixas={data.sistemaBaixas} 
            ofxTransacoes={data.ofxTransacoes}
            saldoInicial={data.saldoInicial}
            dataSaldoInicial={data.dataSaldoInicial}
        />

        {/* Central Match Actions */}
        <div className="flex justify-center items-center h-12 bg-slate-900/50 rounded-lg border border-slate-800 my-4 shadow-inner px-4">
            {canMatch ? (
                <Button 
                    onClick={() => setMatchModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-900/50 animate-in fade-in zoom-in"
                >
                    <LinkIcon className="h-4 w-4 mr-2" /> Conciliar Selecionados
                </Button>
            ) : canUnmatch ? (
                <Button 
                    onClick={handleUnmatch}
                    variant="destructive"
                    className="animate-in fade-in zoom-in"
                >
                    <Unlink className="h-4 w-4 mr-2" /> Desfazer Conciliação
                </Button>
            ) : (
                <span className="text-sm text-slate-500 font-medium tracking-wide">
                    Selecione 1 item de cada lado para conciliar.
                </span>
            )}
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConciliacaoBancariaTable 
            data={data.sistemaBaixas} 
            loading={loading}
            selectedId={selectedSystemId}
            onSelect={(item) => setSelectedSystemId(item?.id || null)}
          />
          <ExtratoOFXTable 
            data={data.ofxTransacoes} 
            loading={loading}
            selectedId={selectedOfxId}
            onSelect={(item) => setSelectedOfxId(item?.id || null)}
          />
        </div>
      </div>

      <ConciliacaoMatchingModal 
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        systemRecord={getSelectedSysRec()}
        ofxRecord={getSelectedOfxRec()}
        onConfirm={handleConfirmMatch}
        loading={actionLoading}
      />
    </div>
  );
};

export default ConciliacaoBancariaPage;