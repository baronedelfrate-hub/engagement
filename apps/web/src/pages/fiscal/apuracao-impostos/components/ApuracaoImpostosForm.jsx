import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Calculator, Building2 } from 'lucide-react';
import { formatCurrency, TIPOS_IMPOSTO, STATUS_APURACAO } from '../utils/apuracaoUtils';

export default function ApuracaoImpostosForm({ formData, setFormData, dropdowns }) {

  useEffect(() => {
    const base = parseFloat(formData.base_calculo) || 0;
    const aliq = parseFloat(formData.aliquota) || 0;
    const apurado = (base * aliq) / 100;

    setFormData(prev => ({ ...prev, valor_apurado: apurado }));
  }, [formData.base_calculo, formData.aliquota, setFormData]);

  const handleChange = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="py-3 border-b border-border bg-muted/50">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Dados da Apuração
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="space-y-1 col-span-1 md:col-span-2">
            <Label>Empresa *</Label>
            <Select value={formData.empresa_id} onValueChange={v => handleChange('empresa_id', v)}>
              <SelectTrigger className="text-foreground"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>
                {dropdowns.empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Período de Referência (MM/YYYY) *</Label>
            <Input
              type="month"
              value={formData.periodoRaw}
              onChange={e => {
                const val = e.target.value;
                handleChange('periodoRaw', val);
                if (val) {
                  const [yyyy, mm] = val.split('-');
                  handleChange('periodo_referencia', `${mm}/${yyyy}`);
                } else {
                  handleChange('periodo_referencia', '');
                }
              }}
              className="text-foreground"
            />
          </div>

          <div className="space-y-1">
            <Label>Tipo de Imposto *</Label>
            <Select value={formData.tipo_imposto} onValueChange={v => handleChange('tipo_imposto', v)}>
              <SelectTrigger className="text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_IMPOSTO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="py-3 border-b border-border bg-muted/50">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-600" /> Valores e Vencimento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="space-y-1">
            <Label>Base de Cálculo (R$) *</Label>
            <Input type="number" min="0" step="0.01" value={formData.base_calculo} onChange={e => handleChange('base_calculo', e.target.value)} className="text-foreground" />
          </div>

          <div className="space-y-1">
            <Label>Alíquota (%) *</Label>
            <Input type="number" min="0" step="0.01" value={formData.aliquota} onChange={e => handleChange('aliquota', e.target.value)} className="text-foreground" />
          </div>

          <div className="space-y-1 bg-emerald-50 p-2 rounded border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 flex flex-col justify-center items-end">
            <Label className="text-xs text-emerald-700 dark:text-emerald-400">Valor Apurado</Label>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(formData.valor_apurado)}</span>
          </div>

          <div className="space-y-1">
            <Label>Data de Vencimento *</Label>
            <Input type="date" value={formData.vencimento} onChange={e => handleChange('vencimento', e.target.value)} className="text-foreground" />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
              <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_APURACAO.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Responsável (Conferência)</Label>
            <Select value={formData.responsavel_conferencia_id} onValueChange={v => handleChange('responsavel_conferencia_id', v)}>
              <SelectTrigger className="text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {dropdowns.users?.map(u => <SelectItem key={u.id} value={u.id}>{u.nome || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-full space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={e => handleChange('observacoes', e.target.value)}
              className="text-foreground min-h-[80px]"
            />
          </div>

        </CardContent>
      </Card>
    </div>
  );
}