import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Printer, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useDREBalancete } from '@/contexts/DREBalanceteContext';

export default function DREBalanceteActions() {
  const { exportToExcel, refreshData, loading } = useDREBalancete();

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('DRE');

  const handleExport = () => {
    exportToExcel(exportType);
    setExportModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden mt-6">
      <Button variant="outline" className="bg-background" onClick={() => setExportModalOpen(true)}>
        <Download className="w-4 h-4 mr-2" /> Exportar Relatório
      </Button>

      <Button variant="outline" className="bg-background" onClick={handlePrint}>
        <Printer className="w-4 h-4 mr-2" /> Imprimir
      </Button>

      <Button variant="outline" className="bg-background" onClick={refreshData} disabled={loading}>
        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar Dados
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