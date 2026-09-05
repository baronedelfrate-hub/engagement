import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { TIPOS_IMPOSTO, STATUS_APURACAO } from '../utils/apuracaoUtils';

export default function ApuracaoImpostosFilters({ filters, setFilters, onApply, onReset }) {
  const handleChange = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));

  return (
    <Card className="mb-6 border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4 text-foreground font-medium">
          <Filter className="w-4 h-4" /> Filtros
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          
          <div className="space-y-1.5">
            <Label className="text-xs">Período (MM/YYYY)</Label>
            <Input 
              type="month" 
              value={filters.periodoRaw || ''} 
              onChange={e => {
                const val = e.target.value; // YYYY-MM
                handleChange('periodoRaw', val);
                if (val) {
                  const [yyyy, mm] = val.split('-');
                  handleChange('periodo', `${mm}/${yyyy}`);
                } else {
                  handleChange('periodo', '');
                }
              }} 
              className="h-9 text-foreground" 
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Imposto</Label>
            <Select value={filters.tipo_imposto || 'Todos'} onValueChange={v => handleChange('tipo_imposto', v)}>
              <SelectTrigger className="h-9 text-foreground"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {TIPOS_IMPOSTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={filters.status || 'Todos'} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger className="h-9 text-foreground"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {STATUS_APURACAO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="xl:col-span-2 flex items-end justify-end gap-2 mt-2 xl:mt-0">
            <Button variant="outline" onClick={onReset} className="h-9 w-full sm:w-auto">
              <X className="w-4 h-4 mr-2" /> Limpar
            </Button>
            <Button onClick={onApply} className="h-9 w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white">
              Buscar
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}