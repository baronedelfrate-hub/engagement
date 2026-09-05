import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Download, RefreshCw, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

function DRE() {
  const { company_id, isSuperAdmin, loading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // SuperAdmin states
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  const [dreData, setDreData] = useState([]);
  const [chartData, setChartData] = useState([]);

  const effectiveCompanyId = isSuperAdmin ? selectedEmpresa : company_id;

  // Fetch empresas if user is SuperAdmin
  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;

    const fetchEmpresas = async () => {
      setLoadingEmpresas(true);
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razao_social')
          .order('razao_social');
          
        if (error) throw error;
        setEmpresas(data || []);
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
      } finally {
        setLoadingEmpresas(false);
      }
    };

    fetchEmpresas();
  }, [isSuperAdmin, authLoading]);

  // Fetch DRE data when effectiveCompanyId is available
  useEffect(() => {
    if (authLoading) return;

    if (!effectiveCompanyId) {
      if (!isSuperAdmin) {
        setError('ID da empresa não encontrado. Verifique seu perfil ou faça login novamente.');
      }
      return;
    }

    fetchAndCalculateDRE(effectiveCompanyId);
  }, [effectiveCompanyId, authLoading]);

  const fetchAndCalculateDRE = async (currentCompanyId) => {
    console.log('[DRE - Debug] Iniciando fetchAndCalculateDRE() para:', currentCompanyId);
    setLoading(true);
    setError(null);

    let isTimedOut = false;
    
    // Timeout de segurança (10 segundos)
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      console.error('[DRE - Debug] Timeout de 10s atingido nas requisições.');
      setError('O tempo de limite de carregamento foi excedido. Por favor, tente novamente.');
      setLoading(false);
    }, 10000);

    try {
      console.log('[DRE - Debug] Disparando queries no Supabase para company_id:', currentCompanyId);
      
      const [resContas, resCat, resReceber, resPagar] = await Promise.all([
        supabase.from('contas_contabeis').select('*').eq('empresa_id', currentCompanyId),
        supabase.from('categorias').select('*').eq('company_id', currentCompanyId),
        supabase.from('contas_receber').select('*').eq('company_id', currentCompanyId),
        supabase.from('contas_pagar').select('*').eq('company_id', currentCompanyId)
      ]);

      if (isTimedOut) return; // Se já deu timeout, não continua

      if (resContas.error) throw new Error(`Erro Contas: ${resContas.error.message}`);
      if (resCat.error) throw new Error(`Erro Categorias: ${resCat.error.message}`);
      if (resReceber.error) throw new Error(`Erro Contas a Receber: ${resReceber.error.message}`);
      if (resPagar.error) throw new Error(`Erro Contas a Pagar: ${resPagar.error.message}`);

      console.log('[DRE - Debug] Dados retornados com sucesso:', {
        contas_contabeis: resContas.data?.length,
        categorias: resCat.data?.length,
        contas_receber: resReceber.data?.length,
        contas_pagar: resPagar.data?.length
      });

      // Generate last 12 months array
      const today = new Date();
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(d);
      }

      const safeParse = (val) => parseFloat(val) || 0;

      const monthlyData = months.map(monthDate => {
        const monthKey = `${String(monthDate.getMonth() + 1).padStart(2, '0')}/${monthDate.getFullYear()}`;
        const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Filter transactions for this month
        const monthReceitas = (resReceber.data || []).filter(r => {
            const d = new Date(r.data_emissao);
            return d >= startOfMonth && d <= endOfMonth;
        });
        
        const monthDespesas = (resPagar.data || []).filter(d => {
            const dDate = new Date(d.data_emissao);
            return dDate >= startOfMonth && dDate <= endOfMonth;
        });

        let totalReceitas = 0;
        let totalCustosServicos = 0;
        let totalDespesasOperacionais = 0;
        let totalNaoOperacionais = 0;

        // Sum Receitas
        monthReceitas.forEach(r => {
           totalReceitas += safeParse(r.valor_original);
        });

        // Categorize Despesas
        monthDespesas.forEach(d => {
            const val = safeParse(d.valor_original);
            const category = resCat.data?.find(c => c.id === d.categoria_id);
            
            const categoryName = (category?.nome || '').toLowerCase();
            
            if (categoryName.includes('custo') || categoryName.includes('serviço') || categoryName.includes('servico')) {
               totalCustosServicos += val;
            } else if (categoryName.includes('despesa') || categoryName.includes('operacional') || categoryName.includes('administrativa')) {
               totalDespesasOperacionais += val;
            } else if (categoryName.includes('imposto') || categoryName.includes('juro') || categoryName.includes('multa') || categoryName.includes('nao operacional') || categoryName.includes('não operacional')) {
               totalNaoOperacionais += val;
            } else {
               totalDespesasOperacionais += val;
            }
        });

        const margemContribuicao = totalReceitas - totalCustosServicos;
        const ebitda = margemContribuicao - totalDespesasOperacionais;
        const lucroLiquido = ebitda - totalNaoOperacionais;

        return {
            name: monthKey,
            Receitas: totalReceitas,
            CustosServicos: totalCustosServicos,
            MargemContribuicao: margemContribuicao,
            DespesasOperacionais: totalDespesasOperacionais,
            EBITDA: ebitda,
            NaoOperacionais: totalNaoOperacionais,
            LucroLiquido: lucroLiquido
        };
      });

      setDreData(monthlyData);
      setChartData(monthlyData);
      console.log('[DRE - Debug] Cálculos finalizados com sucesso.');
    } catch (err) {
      if (isTimedOut) return;
      console.error('[DRE - Debug] Erro capturado no catch:', err);
      setError(err.message || 'Ocorreu um erro inesperado ao carregar os dados.');
    } finally {
      clearTimeout(timeoutId);
      if (!isTimedOut) {
        console.log('[DRE - Debug] Finalizando estado de loading.');
        setLoading(false);
      }
    }
  };

  const exportCSV = () => {
    if (!dreData.length) return;
    const headers = ['Mes', 'RECEITAS', 'CUSTOS DOS SERVICOS', 'MARGEM CONTRIBUICAO', 'DESPESAS OPERACIONAIS', 'EBITDA', 'NAO OPERACIONAIS', 'LUCRO LIQUIDO'];
    const rows = dreData.map(d => [
        d.name,
        d.Receitas.toFixed(2),
        d.CustosServicos.toFixed(2),
        d.MargemContribuicao.toFixed(2),
        d.DespesasOperacionais.toFixed(2),
        d.EBITDA.toFixed(2),
        d.NaoOperacionais.toFixed(2),
        d.LucroLiquido.toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dre_gerencial.csv");
    document.body.appendChild(link);
    link.click();
  };

  const totalDRE = dreData.reduce((acc, curr) => ({
      Receitas: acc.Receitas + curr.Receitas,
      LucroLiquido: acc.LucroLiquido + curr.LucroLiquido,
      EBITDA: acc.EBITDA + curr.EBITDA
  }), { Receitas: 0, LucroLiquido: 0, EBITDA: 0 });

  if (authLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <span className="text-lg text-muted-foreground font-medium">Verificando autenticação...</span>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>DRE Gerencial - ERP Platform</title>
      </Helmet>

      <PageHeader
        title="DRE Gerencial Automatizado"
        description="Demonstração do Resultado do Exercício"
        action={
            <div className="flex gap-2">
                <Button onClick={exportCSV} disabled={!dreData.length || loading} className="gap-2">
                    <Download className="h-4 w-4" /> Exportar CSV
                </Button>
            </div>
        }
      />

      {isSuperAdmin && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Building2 className="h-5 w-5" />
              <span>Visão SuperAdmin: Selecione uma Empresa</span>
            </div>
            <div className="w-full md:w-auto md:min-w-[300px]">
              <Select
                value={selectedEmpresa || ""}
                onValueChange={setSelectedEmpresa}
                disabled={loadingEmpresas || loading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={loadingEmpresas ? "Carregando empresas..." : "Selecione uma empresa"} />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {!effectiveCompanyId ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-xl text-muted-foreground">Nenhuma Empresa Selecionada</CardTitle>
          <CardDescription className="max-w-md mt-2">
            {isSuperAdmin 
              ? "Selecione uma empresa no filtro acima para visualizar a Demonstração do Resultado do Exercício (DRE)." 
              : "ID da empresa não encontrado. Verifique seu perfil ou faça login novamente."}
          </CardDescription>
        </Card>
      ) : loading ? (
        <div className="flex h-64 flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <span className="text-lg text-muted-foreground font-medium">Carregando DRE Gerencial...</span>
          <span className="text-sm text-muted-foreground mt-2">Buscando dados e realizando cálculos. Por favor, aguarde.</span>
        </div>
      ) : error ? (
        <Card className="w-full border-destructive bg-destructive/10">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-destructive">Falha ao Carregar</CardTitle>
            <CardDescription className="text-destructive/80 mt-2">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button onClick={() => fetchAndCalculateDRE(effectiveCompanyId)} variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <RefreshCw className="h-4 w-4" /> Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Receitas (12m)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">R$ {totalDRE.Receitas.toFixed(2)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Lucro Líquido (12m)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">R$ {totalDRE.LucroLiquido.toFixed(2)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">EBITDA (12m)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">R$ {totalDRE.EBITDA.toFixed(2)}</div></CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader><CardTitle>Evolução Financeira</CardTitle></CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000) + 'k' : value}`} />
                            <Tooltip 
                                formatter={(value) => `R$ ${value.toFixed(2)}`} 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="Receitas" name="Receitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="DespesasOperacionais" name="Desp. Operacionais" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="EBITDA" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detalhamento Mensal</CardTitle></CardHeader>
            <CardContent>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-right min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 border-b dark:border-slate-700">
                                <th className="px-4 py-3 text-left">Período</th>
                                <th className="px-4 py-3">RECEITAS</th>
                                <th className="px-4 py-3">(-) CUSTOS DOS SERVIÇOS</th>
                                <th className="px-4 py-3 font-bold bg-slate-200 dark:bg-slate-700">(=) MARGEM CONTRIB.</th>
                                <th className="px-4 py-3">(-) DESPESAS OPERACIONAIS</th>
                                <th className="px-4 py-3 font-bold bg-slate-200 dark:bg-slate-700">(=) EBITDA</th>
                                <th className="px-4 py-3">(-) NÃO OPERACIONAIS</th>
                                <th className="px-4 py-3 font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">(=) LUCRO LÍQUIDO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dreData.map((row, i) => (
                                <tr key={i} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 text-left font-medium">{row.name}</td>
                                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400">{row.Receitas.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-red-500">({row.CustosServicos.toFixed(2)})</td>
                                    <td className="px-4 py-3 font-bold bg-slate-50 dark:bg-slate-800/80">{row.MargemContribuicao.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-red-500">({row.DespesasOperacionais.toFixed(2)})</td>
                                    <td className={`px-4 py-3 font-bold bg-slate-50 dark:bg-slate-800/80 ${row.EBITDA >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{row.EBITDA.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-red-500">({row.NaoOperacionais.toFixed(2)})</td>
                                    <td className={`px-4 py-3 font-bold ${row.LucroLiquido >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'} bg-blue-50 dark:bg-blue-900/20`}>{row.LucroLiquido.toFixed(2)}</td>
                                </tr>
                            ))}
                            {dreData.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-muted-foreground">
                                        Nenhum dado encontrado para o período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

export default DRE;