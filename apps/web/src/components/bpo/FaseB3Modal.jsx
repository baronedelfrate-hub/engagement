import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PHASE_CONFIGS, PHASE_NAMES } from '@/lib/bpoE5PhaseConfig';
import { Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import B3Tab1 from './B3Tab1';
import B3Tab2 from './B3Tab2';
import B3Tab3 from './B3Tab3';
import B3Tab4 from './B3Tab4';

export default function FaseB3Modal({ isOpen, onClose, faseData, onSave }) {
  const [activeTab, setActiveTab] = useState('tab1');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load last active tab from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedTab = localStorage.getItem('faseB3_lastTab');
      if (savedTab) {
        setActiveTab(savedTab);
      }
    }
  }, [isOpen]);

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem('faseB3_lastTab', activeTab);
    }
  }, [activeTab, isOpen]);

  if (!faseData) return null;
  const config = PHASE_CONFIGS[faseData.fase];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave();
      }
      toast({ title: "Dados Atualizados", description: "Alterações de todas as abas da Fase B3 foram registradas com sucesso." });
      onClose();
    } catch (error) {
      console.error('[FaseB3Modal] Erro no save:', error);
      toast({ title: "Erro ao Salvar", description: "Ocorreu um erro ao tentar salvar as informações.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const scrollClasses = "overflow-y-auto max-h-[75vh] scroll-smooth scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[1100px] flex flex-col p-0 gap-0 bg-muted border-border">
        <DialogHeader className="p-6 bg-background border-b border-border shadow-sm z-10 relative shrink-0">
          <DialogTitle className="text-2xl text-foreground flex items-center">
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 px-3 py-1 rounded-md text-xl font-bold mr-3">{faseData.fase}</span>
            {PHASE_NAMES[faseData.fase] || 'Fase B3 - Operação'}
          </DialogTitle>
          <DialogDescription className="mt-2 text-base text-muted-foreground">
            {config?.description || 'Gestão da rotina contábil, financeira e gerencial mensal.'}
          </DialogDescription>
        </DialogHeader>

        <div className={`w-full bg-muted/50 ${scrollClasses}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col w-full h-full">
            <div className="bg-background border-b border-border px-6 py-3 shadow-sm shrink-0 sticky top-0 z-20 overflow-x-auto scrollbar-none">
              <TabsList className="inline-flex h-12 bg-muted/80 p-1 min-w-max rounded-lg">
                <TabsTrigger 
                  value="tab1" 
                  className="text-sm font-medium rounded-md px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  1. Organização e Envio Contábil
                </TabsTrigger>
                <TabsTrigger 
                  value="tab2" 
                  className="text-sm font-medium rounded-md px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  2. Fechamento Financeiro
                </TabsTrigger>
                <TabsTrigger 
                  value="tab3" 
                  className="text-sm font-medium rounded-md px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  3. Apuração de Resultado
                </TabsTrigger>
                <TabsTrigger 
                  value="tab4" 
                  className="text-sm font-medium rounded-md px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all"
                >
                  4. Gestão e Controle
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 md:p-6 lg:p-8 flex-1">
              <TabsContent value="tab1" className="m-0 border-none outline-none"><B3Tab1 /></TabsContent>
              <TabsContent value="tab2" className="m-0 border-none outline-none"><B3Tab2 /></TabsContent>
              <TabsContent value="tab3" className="m-0 border-none outline-none"><B3Tab3 /></TabsContent>
              <TabsContent value="tab4" className="m-0 border-none outline-none"><B3Tab4 /></TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="p-4 bg-background border-t border-border flex justify-end items-center shrink-0 gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="border-border text-foreground hover:bg-muted">
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6">
            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Salvando...</> : <><Save className="w-4 h-4 mr-2"/> Salvar Alterações</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}