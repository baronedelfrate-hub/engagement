import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Save, FileText } from 'lucide-react';

const VAZIO = {
  codigo_tributacao_nacional: '', codigo_tributacao_municipal: '', codigo_nbs: '', tributacao_iss: 1, iss_retido: false,
  ibs_cbs_cst: '', ibs_cbs_class_trib: '', codigo_indicador_operacao: '',
  aliquota_iss_padrao: '', retencao_irrf_padrao: '', retencao_pis_padrao: '', retencao_cofins_padrao: '', retencao_csll_padrao: ''
};
const NUM = ['aliquota_iss_padrao', 'retencao_irrf_padrao', 'retencao_pis_padrao', 'retencao_cofins_padrao', 'retencao_csll_padrao'];

// Padrões que já vêm preenchidos em toda nota de serviço nova desta empresa (tabela parametros_nfse)
export default function NfsePadroesCard() {
  const { toast } = useToast();
  const [empresaId, setEmpresaId] = useState(null);
  const [f, setF] = useState(VAZIO);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      setEmpresaId(perfil?.company_id || null);
      if (!perfil?.company_id) return;
      const { data } = await supabase.from('parametros_nfse').select('*').eq('empresa_id', perfil.company_id).maybeSingle();
      if (data) setF({ ...VAZIO, ...Object.fromEntries(Object.keys(VAZIO).map((k) => [k, data[k] ?? VAZIO[k]])) });
    })();
  }, []);

  const salvar = async () => {
    if (!empresaId) return;
    setBusy(true);
    const reg = { empresa_id: empresaId, ...f };
    NUM.forEach((k) => { reg[k] = f[k] === '' ? null : Number(f[k]); });
    ['codigo_tributacao_nacional', 'codigo_tributacao_municipal', 'codigo_nbs', 'ibs_cbs_cst', 'ibs_cbs_class_trib', 'codigo_indicador_operacao'].forEach((k) => { reg[k] = f[k] || null; });
    const { error } = await supabase.from('parametros_nfse').upsert(reg, { onConflict: 'empresa_id' });
    setBusy(false);
    if (error) toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    else toast({ title: 'Padrões da NFS-e salvos', description: 'As próximas notas já vêm preenchidas com eles.' });
  };

  const campo = (k, rot, ph, extra = {}) => (
    <div className="space-y-2">
      <Label>{rot}</Label>
      <Input value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)} placeholder={ph} {...extra} />
    </div>
  );

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="bg-muted/50 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Padrões da nota de serviço (NFS-e Nacional)</CardTitle>
        <CardDescription className="mt-1">Já vêm preenchidos em cada nota nova desta empresa. Dá para alterar nota a nota.</CardDescription>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {campo('codigo_tributacao_nacional', 'Código de tributação nacional', '17.10.01')}
        {campo('codigo_tributacao_municipal', 'Código de tributação municipal', '')}
        {campo('codigo_nbs', 'NBS', '1.1806.63.00')}
        <div className="space-y-2">
          <Label>Tipo de tributação do ISS</Label>
          <Select value={String(f.tributacao_iss || 1)} onValueChange={(v) => set('tributacao_iss', Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Operação tributável</SelectItem><SelectItem value="2">Imunidade</SelectItem>
              <SelectItem value="3">Exportação de serviço</SelectItem><SelectItem value="4">Não incidência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ISS retido pelo tomador?</Label>
          <Select value={f.iss_retido ? 'sim' : 'nao'} onValueChange={(v) => set('iss_retido', v === 'sim')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="nao">Não retido</SelectItem><SelectItem value="sim">Retido pelo tomador</SelectItem></SelectContent>
          </Select>
        </div>
        {campo('aliquota_iss_padrao', 'Alíquota do ISS (%)', '2,5', { type: 'number', step: '0.01' })}
        {campo('ibs_cbs_cst', 'CST IBS/CBS', '000')}
        {campo('ibs_cbs_class_trib', 'cClassTrib', '000001')}
        {campo('codigo_indicador_operacao', 'Indicador da operação (cIndOp)', '040101')}
        {campo('retencao_irrf_padrao', 'IRRF retido (%)', '1,5', { type: 'number', step: '0.01' })}
        {campo('retencao_pis_padrao', 'PIS retido (%)', '0,65', { type: 'number', step: '0.01' })}
        {campo('retencao_cofins_padrao', 'COFINS retido (%)', '3', { type: 'number', step: '0.01' })}
        {campo('retencao_csll_padrao', 'CSLL retida (%)', '1', { type: 'number', step: '0.01' })}
        <div className="flex items-end justify-end md:col-span-3">
          <Button onClick={salvar} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="w-4 h-4 mr-2" /> Salvar padrões</Button>
        </div>
      </CardContent>
    </Card>
  );
}
