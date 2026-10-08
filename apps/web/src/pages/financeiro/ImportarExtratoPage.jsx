import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FileSpreadsheet, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { lerArquivoExtrato, carregarCatalogo, classificarLinhasDoArquivo, idsJaImportados, salvarImportacao } from '@/services/extratoAsaasService';
import { formatDateOnly } from '@/lib/dateUtils';

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ImportarExtratoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const dropdowns = useFinanceiroDropdowns();

  const [step, setStep] = useState(1);
  const [bancoId, setBancoId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [leitura, setLeitura] = useState(null); // { linhas, temClassificacao, aba, ignoradas }
  const [catalogo, setCatalogo] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [jaImportados, setJaImportados] = useState(new Set());
  const [usarArquivo, setUsarArquivo] = useState(true);
  const [resultado, setResultado] = useState(null);

  const preparado = useMemo(
    () => (leitura && catalogo ? classificarLinhasDoArquivo(leitura.linhas, catalogo, usarArquivo && leitura.temClassificacao) : null),
    [leitura, catalogo, usarArquivo]
  );

  const nomes = useMemo(() => {
    const cat = new Map((catalogo?.categorias || []).map((c) => [c.id, c]));
    const sub = new Map((catalogo?.subcategorias || []).map((s) => [s.id, s]));
    return { cat, sub };
  }, [catalogo]);

  const handleFileUpload = async (e) => {
    setErrorMsg('');
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setIsProcessing(true);
    try {
      const { data: banco, error: bancoError } = await supabase.from('bancos').select('company_id').eq('id', bancoId).single();
      if (bancoError || !banco?.company_id) throw new Error('Não foi possível identificar a empresa do banco selecionado.');

      const lido = await lerArquivoExtrato(arquivo);
      if (!lido.linhas.length) throw new Error('Nenhuma transação válida encontrada no arquivo.');

      const [cat, ja] = await Promise.all([
        carregarCatalogo(banco.company_id),
        idsJaImportados(banco.company_id, bancoId, lido.linhas.map((l) => l.numero_documento))
      ]);
      setCompanyId(banco.company_id);
      setLeitura(lido);
      setCatalogo(cat);
      setJaImportados(ja);
      setUsarArquivo(lido.temClassificacao);
      setStep(2);
    } catch (error) {
      const msg = error.message || 'Falha ao ler arquivo. Verifique o formato.';
      setErrorMsg(msg);
      toast({ title: 'Erro de leitura', description: msg, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      e.target.value = null;
    }
  };

  const novas = preparado ? preparado.linhas.filter((l) => !jaImportados.has(l.numero_documento)) : [];
  const classificadas = novas.filter((l) => l.classificacao?.categoria_id).length;

  const handleConfirmImport = async () => {
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const res = await salvarImportacao({
        companyId,
        bancoId,
        linhas: preparado.linhas,
        regrasNovas: preparado.regrasNovas,
        userId: user?.id
      });
      setResultado(res);
      setStep(3);
    } catch (error) {
      const msg = error.message || 'Falha ao gravar no banco de dados.';
      setErrorMsg(msg);
      toast({ title: 'Erro na importação', description: msg, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const reiniciar = () => { setStep(1); setLeitura(null); setCatalogo(null); setResultado(null); setErrorMsg(''); };

  return (
    <>
      <Helmet><title>Importar Extrato Bancário</title></Helmet>
      <PageHeader title="Importação de Extrato" description="Importe o extrato do Asaas (.xlsx/.csv) ou um OFX. O que já foi classificado antes vem classificado." />

      <div className="max-w-5xl mx-auto pb-12">
        <div className="flex items-center justify-center mb-8 gap-4">
          {[1, 2, 3].map((n) => (
            <React.Fragment key={n}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${step >= n ? 'bg-blue-600 text-white' : 'bg-muted'}`}>{n}</div>
              {n < 3 && <div className="h-1 w-20 bg-muted rounded-full overflow-hidden"><div className={`h-full bg-blue-600 transition-all duration-500 ${step > n ? 'w-full' : 'w-0'}`} /></div>}
            </React.Fragment>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400 shadow-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1"><h4 className="font-bold text-sm mb-1">Atenção</h4><p className="text-sm">{errorMsg}</p></div>
          </div>
        )}

        {step === 1 && (
          <Card className="bg-background border-border shadow-sm">
            <CardHeader><CardTitle className="text-foreground">Passo 1: Banco e arquivo</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Banco destino</label>
                <Select value={bancoId} onValueChange={setBancoId}>
                  <SelectTrigger className="w-full bg-background border-border text-foreground"><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                  <SelectContent>
                    {dropdowns.bancos?.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome} {b.conta ? `(Conta: ${b.conta})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!bancoId && <p className="text-xs text-amber-600">Selecione o banco antes de escolher o arquivo.</p>}
                {dropdowns.bancos?.length === 0 && !dropdowns.loading && <p className="text-xs text-amber-600">Nenhum banco cadastrado. Cadastre o banco em Cadastros &gt; Bancos.</p>}
              </div>

              <div className={`border-2 border-dashed ${bancoId ? 'border-border hover:border-blue-500 hover:bg-muted cursor-pointer' : 'border-border bg-muted cursor-not-allowed opacity-60'} rounded-xl p-12 text-center transition-all relative group`}>
                <input type="file" accept=".xlsx,.xls,.csv,.ofx" onChange={handleFileUpload} disabled={isProcessing || !bancoId}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" />
                <div className="flex flex-col items-center justify-center">
                  {isProcessing ? <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-4" /> : (
                    <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4 bg-blue-100 dark:bg-muted"><FileSpreadsheet className="h-8 w-8 text-blue-600" /></div>
                  )}
                  <h3 className="text-lg font-medium text-foreground">{isProcessing ? 'Lendo arquivo...' : 'Clique ou arraste o extrato aqui'}</h3>
                  <p className="text-muted-foreground mt-1">Extrato do Asaas (.xlsx, .xls, .csv) ou OFX</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && preparado && (
          <Card className="bg-background border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle className="text-foreground">Passo 2: Revisar</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {leitura.linhas.length} lançamentos no arquivo{leitura.aba ? ` (aba "${leitura.aba}")` : ''}
                </p>
              </div>
              <Button onClick={reiniciar} variant="outline">Voltar e trocar arquivo</Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Novos a importar</div><div className="text-xl font-semibold">{novas.length}</div></div>
                <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Já importados (ignorados)</div><div className="text-xl font-semibold">{leitura.linhas.length - novas.length}</div></div>
                <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">Já classificados</div><div className="text-xl font-semibold text-emerald-600">{classificadas}</div></div>
                <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">A classificar</div><div className="text-xl font-semibold text-amber-600">{novas.length - classificadas}</div></div>
              </div>

              {leitura.temClassificacao && (
                <label className="flex items-start gap-2 text-sm rounded-md border border-border bg-muted/40 p-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={usarArquivo} onChange={(e) => setUsarArquivo(e.target.checked)} />
                  <span>
                    <strong>Usar a classificação que vem no arquivo e aprender com ela.</strong> O arquivo já traz categoria/subcategoria; o sistema grava isso e
                    cria as regras de-para ({preparado.regrasNovas.length} nova{preparado.regrasNovas.length === 1 ? '' : 's'}), para classificar sozinho nas próximas importações.
                  </span>
                </label>
              )}

              <div className="rounded-md border border-border overflow-hidden max-h-[460px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="p-2 text-left font-medium">Data</th>
                      <th className="p-2 text-left font-medium">Descrição</th>
                      <th className="p-2 text-left font-medium">Classificação</th>
                      <th className="p-2 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preparado.linhas.slice(0, 300).map((l) => {
                      const dup = jaImportados.has(l.numero_documento);
                      const c = l.classificacao;
                      const cat = c?.categoria_id ? nomes.cat.get(c.categoria_id) : null;
                      const sub = c?.subcategoria_id ? nomes.sub.get(c.subcategoria_id) : null;
                      return (
                        <tr key={l.numero_documento} className={dup ? 'opacity-40' : ''}>
                          <td className="p-2 whitespace-nowrap">{formatDateOnly(l.data_transacao)}</td>
                          <td className="p-2"><div className="truncate max-w-[340px]" title={l.descricao}>{l.descricao}</div><div className="text-xs text-muted-foreground">{l.tipo_transacao}</div></td>
                          <td className="p-2 text-xs">
                            {dup ? <Badge variant="secondary">já importado</Badge>
                              : cat ? <div><div>{cat.codigo} {cat.nome}</div><div className="text-muted-foreground">{sub ? `${sub.codigo} ${sub.nome}` : 'sem subcategoria'}</div></div>
                              : <Badge variant="outline" className="border-amber-500/40 text-amber-600">a classificar</Badge>}
                          </td>
                          <td className={`p-2 text-right font-medium whitespace-nowrap ${l.valor < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{brl(l.valor)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {preparado.linhas.length > 300 && <p className="text-xs text-muted-foreground">Mostrando os 300 primeiros de {preparado.linhas.length}; todos serão importados.</p>}

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={handleConfirmImport} disabled={isProcessing || novas.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[220px]">
                  {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</> : <>Importar {novas.length} lançamentos <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && resultado && (
          <Card className="bg-background border-border shadow-sm">
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-semibold">Importação concluída</h3>
              <p className="text-muted-foreground">
                {resultado.novas} lançamentos importados · {resultado.duplicadas} já existiam · {resultado.classificadas} classificados · {resultado.aClassificar} a classificar
                {resultado.regrasCriadas > 0 && ` · ${resultado.regrasCriadas} regras de-para criadas`}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                {resultado.aClassificar > 0 && <Button onClick={() => navigate('/financeiro/classificar-extrato')} className="bg-blue-600 hover:bg-blue-700 text-white">Classificar o que falta</Button>}
                <Button variant="outline" onClick={() => navigate('/financeiro/conciliacao-bancaria')}>Ir para a Conciliação</Button>
                <Button variant="ghost" onClick={reiniciar}>Importar outro arquivo</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default ImportarExtratoPage;
