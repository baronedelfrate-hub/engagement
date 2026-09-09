import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FileSpreadsheet, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinanceiroDropdowns } from '@/hooks/useFinanceiroDropdowns';
import { parseExtratoFile, validateExtratoData, saveExtratoToDB } from '@/services/extratoImportService';

const ImportarExtratoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const dropdowns = useFinanceiroDropdowns();
  
  const [step, setStep] = useState(1);
  const [bancoId, setBancoId] = useState('');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = async (e) => {
    setErrorMsg('');
    
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setIsProcessing(true);
    setFile(uploadedFile);
    
    try {
      const parsedData = await parseExtratoFile(uploadedFile);
      const validatedData = validateExtratoData(parsedData);

      setPreviewData(validatedData);
      setStep(2);
      toast({ title: "Sucesso", description: `Arquivo lido. ${validatedData.length} transações encontradas.` });
    } catch (error) {
      const errMessage = error.message || 'Falha ao ler arquivo. Verifique o formato.';
      setErrorMsg(errMessage);
      toast({ title: "Erro de Leitura", description: errMessage, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      e.target.value = null; 
    }
  };

  const handleConfirmImport = async () => {
    setErrorMsg('');
    
    if (!bancoId) {
      return toast({ title: "Atenção", description: "Selecione um banco antes de importar.", variant: "warning" });
    }

    setIsProcessing(true);

    const companyId = dropdowns.bancos?.[0]?.company_id;
    
    try {
      await saveExtratoToDB(companyId, bancoId, previewData);

      toast({ title: "Importação Concluída", description: `${previewData.length} transações salvas com sucesso.` });
      navigate('/financeiro/conciliacao-bancaria');

    } catch (error) {
      const errMessage = error.message || 'Falha ao gravar no banco de dados. Tente novamente mais tarde.';
      
      setErrorMsg(errMessage);
      
      const variant = errMessage.includes('Acesso negado') ? "destructive" : "default";
      toast({ title: "Erro na Importação", description: errMessage, variant });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Helmet><title>Importar Extrato Bancário</title></Helmet>
      <PageHeader title="Importação de Extrato" description="Importe arquivos OFX do seu banco para a conciliação dupla." />
      
      <div className="max-w-4xl mx-auto pb-12">
          
          <div className="flex items-center justify-center mb-8 gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-muted'}`}>1</div>
              <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                <div className={`h-full bg-blue-600 transition-all duration-500 ease-in-out ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-muted'}`}>2</div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400 shadow-sm animate-in fade-in duration-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">Atenção</h4>
                <p className="text-sm">{errorMsg}</p>
              </div>
            </div>
          )}

          {step === 1 && (
              <Card className="bg-background border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-foreground">Passo 1: Selecionar Arquivo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">Banco Destino</label>
                          <Select value={bancoId} onValueChange={setBancoId}>
                              <SelectTrigger className="w-full bg-background dark:bg-background border-border dark:border-border text-foreground">
                                  <SelectValue placeholder="Selecione o Banco para vínculo" />
                              </SelectTrigger>
                              <SelectContent>
                                  {dropdowns.bancos?.map(b => (
                                      <SelectItem key={b.id} value={b.id}>
                                          {b.nome} {b.conta ? `(Conta: ${b.conta})` : ''}
                                      </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          {!bancoId && <p className="text-xs text-amber-600 dark:text-amber-500/80">Necessário selecionar um banco primeiro para associar o extrato.</p>}
                      </div>

                      <div className={`border-2 border-dashed ${bancoId ? 'border-border hover:border-blue-500 hover:bg-muted cursor-pointer' : 'border-border bg-muted cursor-not-allowed opacity-60'} rounded-xl p-12 text-center transition-all relative group`}>
                          <input 
                              type="file" 
                              accept=".ofx,.cfx,.csv" 
                              onChange={handleFileUpload}
                              disabled={isProcessing || !bancoId}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                          />
                          <div className="flex flex-col items-center justify-center">
                              {isProcessing ? (
                                  <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-500 animate-spin mb-4" />
                              ) : (
                                  <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 transition-transform ${bancoId ? 'bg-blue-100 dark:bg-muted group-hover:scale-110' : 'bg-muted dark:bg-background'}`}>
                                      <FileSpreadsheet className={`h-8 w-8 ${bancoId ? 'text-blue-600 dark:text-blue-500' : 'text-muted-foreground dark:text-muted-foreground'}`} />
                                  </div>
                              )}
                              <h3 className="text-lg font-medium text-foreground dark:text-foreground">
                                  {isProcessing ? 'Lendo arquivo...' : 'Clique ou arraste seu extrato OFX aqui'}
                              </h3>
                              <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                                Arquivos suportados: .OFX 
                                {bancoId && <span className="text-emerald-600 dark:text-emerald-500 text-xs ml-2 font-medium">✓ Banco Selecionado</span>}
                              </p>
                          </div>
                      </div>
                  </CardContent>
              </Card>
          )}

          {step === 2 && (
              <Card className="bg-background border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border dark:border-border pb-4">
                      <div>
                        <CardTitle className="text-foreground">Passo 2: Revisar Transações</CardTitle>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">{previewData.length} transações prontas para importar</p>
                      </div>
                      <Button onClick={() => { setStep(1); setFile(null); setPreviewData([]); }} variant="outline" className="text-muted-foreground dark:text-muted-foreground border-border dark:border-border">
                        Voltar e trocar arquivo
                      </Button>
                  </CardHeader>
                  <CardContent className="pt-6">
                      <div className="rounded-md border border-border dark:border-border overflow-hidden mb-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-sm text-muted-foreground">
                              <thead className="bg-muted dark:bg-background sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 text-left font-medium text-muted-foreground dark:text-muted-foreground border-b border-border dark:border-border">Data</th>
                                      <th className="p-3 text-left font-medium text-muted-foreground dark:text-muted-foreground border-b border-border dark:border-border">Descrição</th>
                                      <th className="p-3 text-left font-medium text-muted-foreground dark:text-muted-foreground border-b border-border dark:border-border">Documento</th>
                                      <th className="p-3 text-right font-medium text-muted-foreground dark:text-muted-foreground border-b border-border dark:border-border">Valor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-border bg-background">
                                  {previewData.map((row, i) => (
                                      <tr key={i} className="hover:bg-muted dark:hover:bg-muted/50 transition-colors">
                                          <td className="p-3 whitespace-nowrap">{row.data_transacao}</td>
                                          <td className="p-3">{row.descricao}</td>
                                          <td className="p-3 text-muted-foreground font-mono text-xs">{row.numero_documento}</td>
                                          <td className={`p-3 text-right font-medium ${row.valor < 0 ? 'text-red-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                              {row.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-border dark:border-border">
                          <Button 
                            onClick={handleConfirmImport} 
                            disabled={isProcessing} 
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isProcessing ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                              ) : (
                                <>Confirmar Importação <ArrowRight className="ml-2 h-4 w-4" /></>
                              )}
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          )}
      </div>
    </>
  );
};

export default ImportarExtratoPage;