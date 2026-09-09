import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PHASE_CONFIGS, PHASE_NAMES } from '@/lib/bpoE5PhaseConfig';
import { Loader2, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCombinedDiagnosis } from '@/hooks/useCombinedDiagnosis';
import { Bloco01Tab, Bloco02Tab } from './CombinedDiagnosisForm';
import FileUploadSection from './FileUploadSection';
import AnaliseUploadSection from './AnaliseUploadSection';
import FaseB3Modal from './FaseB3Modal';
import { saveDiagnosticoUploads, fetchDiagnosticoUploads } from '@/services/uploadDiagnosticoService';
import { saveAnaliseUploads, fetchAnaliseUploads } from '@/services/uploadAnaliseService';

export default function ClienteFasesModal({ isOpen, onClose, faseData, onSave }) {
  const [activeTab, setActiveTab] = useState('diagnostico');
  const [isSaving, setIsSaving] = useState(false);
  const [diagnosticoUploads, setDiagnosticoUploads] = useState({});
  const [analiseUploads, setAnaliseUploads] = useState({});
  const { toast } = useToast();

  const { formData, handleFieldChange, handleSave: hookSave, progress, isLoading } = useCombinedDiagnosis(faseData?.id);

  useEffect(() => {
    if (isOpen && faseData) {
      setActiveTab('diagnostico');
      
      fetchDiagnosticoUploads(faseData.id).then(data => {
        if (data) {
          setDiagnosticoUploads({
            proposta_melhoria_url: data.proposta_melhoria_url,
            proposta_melhoria_nome: data.proposta_melhoria_nome
          });
        } else {
          setDiagnosticoUploads({});
        }
      });

      fetchAnaliseUploads(faseData.id).then(data => {
        if (data) {
          setAnaliseUploads({
            procedimento_aprovado_url: data.procedimento_aprovado_url,
            procedimento_aprovado_nome: data.procedimento_aprovado_nome
          });
        } else {
          setAnaliseUploads({});
        }
      });
    }
  }, [isOpen, faseData]);

  const handleDiagnosticoUploadSuccess = (fieldType, url, name) => {
    setDiagnosticoUploads(prev => ({
      ...prev,
      [`${fieldType}_url`]: url,
      [`${fieldType}_nome`]: name
    }));
  };

  const handleDiagnosticoDeleteSuccess = (fieldType) => {
    setDiagnosticoUploads(prev => ({
      ...prev,
      [`${fieldType}_url`]: null,
      [`${fieldType}_nome`]: null
    }));
  };

  const handleAnaliseUploadSuccess = (fieldType, url, name) => {
    setAnaliseUploads(prev => ({
      ...prev,
      [`${fieldType}_url`]: url,
      [`${fieldType}_nome`]: name
    }));
  };

  const handleAnaliseDeleteSuccess = (fieldType) => {
    setAnaliseUploads(prev => ({
      ...prev,
      [`${fieldType}_url`]: null,
      [`${fieldType}_nome`]: null
    }));
  };

  if (!faseData) return null;

  // Render specific B3 Modal if phase is B3
  if (faseData.fase === 'B3') {
    return <FaseB3Modal isOpen={isOpen} onClose={onClose} faseData={faseData} onSave={onSave} />;
  }

  const config = PHASE_CONFIGS[faseData.fase];

  const handleClose = () => {
    onClose();
  };

  const handleMainSave = async () => {
    setIsSaving(true);
    try {
      await hookSave();
      
      await saveDiagnosticoUploads(faseData.id, diagnosticoUploads);
      await saveAnaliseUploads(faseData.id, analiseUploads);

      if (onSave) await onSave();
      toast({ title: "Dados Atualizados", description: "Alterações de todas as abas foram registradas com sucesso." });
      onClose();
    } catch (error) {
      console.error('[ClienteFasesModal] Erro no save:', error);
      toast({ title: "Erro Inesperado", description: "Verifique o console para mais detalhes.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const scrollClasses = "overflow-y-auto max-h-[70vh] scroll-smooth scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1100px] flex flex-col p-0 gap-0 bg-muted border-border">
        <DialogHeader className="p-6 bg-background border-b border-border shadow-sm z-10 relative shrink-0">
          <DialogTitle className="text-2xl text-foreground flex items-center">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-xl font-bold mr-3">{faseData.fase}</span>
            {PHASE_NAMES[faseData.fase]}
          </DialogTitle>
          <DialogDescription className="mt-2 text-base text-muted-foreground">{config?.description}</DialogDescription>
        </DialogHeader>

        <div className={`w-full bg-muted/50 ${scrollClasses}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col w-full">
            <div className="bg-background border-b border-border px-6 py-2 shadow-sm shrink-0 sticky top-0 z-20">
              <TabsList className="grid w-full max-w-[700px] grid-cols-3 h-12 bg-muted/50">
                <TabsTrigger value="diagnostico" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  1. Diagnóstico (Bloco 01)
                </TabsTrigger>
                <TabsTrigger value="analise" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  2. Análise & Aprovação
                </TabsTrigger>
                <TabsTrigger value="implantacao" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  3. Implantação (Bloco 02)
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 md:p-6 lg:p-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground font-medium">Carregando dados da fase...</p>
                </div>
              ) : (
                <>
                  <TabsContent value="diagnostico" className={`m-0 border-none outline-none mt-2 ${scrollClasses}`}>
                    <Bloco01Tab 
                      formData={formData} 
                      handleFieldChange={handleFieldChange} 
                      onNext={() => setActiveTab('analise')} 
                      progress={progress}
                      faseId={faseData.id}
                      diagnosticoUploads={diagnosticoUploads}
                      onUploadSuccess={handleDiagnosticoUploadSuccess}
                      onDeleteSuccess={handleDiagnosticoDeleteSuccess}
                    />
                  </TabsContent>

                  <TabsContent value="analise" className={`m-0 border-none outline-none mt-2 ${scrollClasses}`}>
                    <div className="bg-background border border-border rounded-xl p-8 shadow-sm flex flex-col min-h-[400px]">
                      
                      <AnaliseUploadSection 
                        clienteFasesId={faseData.id}
                        uploads={analiseUploads}
                        onUploadSuccess={handleAnaliseUploadSuccess}
                        onDeleteSuccess={handleAnaliseDeleteSuccess}
                      />

                      <div className="pt-6 border-t border-border">
                        <h3 className="text-xl font-bold text-foreground mb-2">Upload de Anexos Adicionais</h3>
                        <p className="text-muted-foreground mb-8">Anexe outros arquivos necessários para a análise (ex: Plano de Contas, Extratos).</p>
                        
                        <div className="flex-1">
                          <FileUploadSection 
                            fase_id={faseData.id}
                            tipo_arquivo="aprovacao_cliente"
                          />
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                        <Button variant="outline" onClick={() => setActiveTab('diagnostico')} className="text-foreground">
                          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Diagnóstico
                        </Button>
                        <Button onClick={() => setActiveTab('implantacao')} className="bg-primary text-primary-foreground">
                          Próxima Etapa: Implantação <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="implantacao" className={`m-0 border-none outline-none mt-2 ${scrollClasses}`}>
                    <Bloco02Tab 
                      formData={formData} 
                      handleFieldChange={handleFieldChange} 
                      onPrev={() => setActiveTab('analise')} 
                      handleSave={handleMainSave} 
                      progress={progress} 
                      faseId={faseData.id}
                      clienteId={faseData.cliente_id}
                    />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>

        <DialogFooter className="p-4 bg-background border-t border-border flex sm:justify-between items-center shrink-0">
          <div className="text-sm text-muted-foreground hidden sm:block">
            <span className="flex items-center gap-1"><Save className="w-3 h-3"/> Auto-save ativado em todas as abas.</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isSaving} className="border-border text-foreground">Fechar</Button>
            <Button onClick={handleMainSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-6">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Salvando...</> : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}