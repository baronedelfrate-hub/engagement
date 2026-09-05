import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Printer, RefreshCw, Upload, FileSpreadsheet } from 'lucide-react';
import { useDREBalancete } from '@/contexts/DREBalanceteContext';
import { useToast } from '@/components/ui/use-toast';
import { insertSampleData } from '@/lib/dreBalanceteSeed';

export default function DREBalanceteActions() {
  const { exportToExcel, refreshData, loading, filters } = useDREBalancete();
  const { toast } = useToast();
  
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('DRE');

  const handleExport = () => {
    exportToExcel(exportType);
    setExportModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSeedData = async () => {
    if (!filters.empresa_id || filters.empresa_id === 'all') {
      toast({ title: 'Aviso', description: 'Selecione uma empresa primeiro para gerar dados.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Gerando Dados', description: 'Inserindo dados de exemplo...' });
    const success = await insertSampleData(filters.empresa_id, filters.competencia);
    if (success) {
      toast({ title: 'Sucesso', description: 'Dados de exemplo gerados!' });
      refreshData();
    } else {
      toast({ title: 'Erro', description: 'Falha ao gerar dados.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden mt-6">
      <Button variant="outline" className="bg-white" onClick={() => setExportModalOpen(true)}>
        <Download className="w-4 h-4 mr-2" /> Exportar Relatório
      </Button>

      <Button variant="outline" className="bg-white" onClick={handlePrint}>
        <Printer className="w-4 h-4 mr-2" /> Imprimir
      </Button>

      <Button variant="outline" className="bg-white" onClick={refreshData} disabled={loading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar Dados
      </Button>

      <Button variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 ml-auto" onClick={handleSeedData}>
        <Upload className="w-4 h-4 mr-2" /> Inserir Dados Exemplo
      </Button>

      {/* EXPORT MODAL */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Exportar Relatório</DialogTitle>
            <DialogDescription>
              Selecione qual relatório deseja exportar para Excel.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRE">DRE (Demonstração de Resultado)</SelectItem>
                  <SelectItem value="Balancete">Balancete de Verificação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleExport}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Baixar Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}