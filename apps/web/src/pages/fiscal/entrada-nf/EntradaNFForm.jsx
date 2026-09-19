import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { entradaNFService } from '../services/entradaNFService';
import {
  validateChaveAcesso,
  validatePositiveNumber,
  calculateValorLiquido,
  STATUS_OPTIONS
} from '../utils/entradaNFUtils';

const hoje = () => new Date().toISOString().split('T')[0];

const FORM_INICIAL = {
  empresa_id: '',
  fornecedor_id: '',
  numero: '',
  serie: '',
  chave_acesso: '',
  data_emissao: hoje(),
  data_entrada: hoje(),
  data_vencimento: '',
  valor_total: '',
  valor_impostos: '',
  condicao_pagamento_id: '',
  observacoes: '',
  status: 'Pendente'
};

// Campos de data/uuid opcionais precisam ir como null (string vazia quebra no Postgres)
const CAMPOS_NULAVEIS = [
  'fornecedor_id', 'condicao_pagamento_id', 'data_emissao', 'data_entrada',
  'data_vencimento', 'chave_acesso', 'serie', 'observacoes'
];

export default function EntradaNFForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(FORM_INICIAL);
  const [empresas, setEmpresas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [condicoes, setCondicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregar();
  }, [id]);

  const carregar = async () => {
    setLoading(true);
    try {
      const [emp, forn, cond] = await Promise.all([
        supabase.from('empresas').select('id, razao_social').eq('ativo', true),
        supabase.from('fornecedores').select('id, nome').order('nome'),
        supabase.from('condicoes_pagamento').select('id, nome').eq('ativo', true)
      ]);
      setEmpresas(emp.data || []);
      setFornecedores(forn.data || []);
      setCondicoes(cond.data || []);

      if (isEdit) {
        const nota = await entradaNFService.getNotaById(id);
        setForm({
          empresa_id: nota.empresa_id || '',
          fornecedor_id: nota.fornecedor_id || '',
          numero: nota.numero || '',
          serie: nota.serie || '',
          chave_acesso: nota.chave_acesso || '',
          data_emissao: nota.data_emissao || '',
          data_entrada: nota.data_entrada || '',
          data_vencimento: nota.data_vencimento || '',
          valor_total: nota.valor_total ?? '',
          valor_impostos: nota.valor_impostos ?? '',
          condicao_pagamento_id: nota.condicao_pagamento_id || '',
          observacoes: nota.observacoes || '',
          status: nota.status || 'Pendente'
        });
      } else if (emp.data?.length === 1) {
        setForm(prev => ({ ...prev, empresa_id: emp.data[0].id }));
      }
    } catch (e) {
      console.error('[EntradaNFForm] Falha ao carregar:', e);
      toast({ title: 'Erro', description: 'Falha ao carregar os dados da nota.', variant: 'destructive' });
      navigate('/fiscal/entrada-nf');
    } finally {
      setLoading(false);
    }
  };

  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const validar = () => {
    const erros = [];
    if (!form.empresa_id) erros.push('Empresa é obrigatória.');
    if (!form.numero.trim()) erros.push('Número da nota é obrigatório.');
    if (!form.fornecedor_id) erros.push('Fornecedor é obrigatório.');
    if (!form.data_emissao) erros.push('Data de emissão é obrigatória.');
    if (form.chave_acesso && !validateChaveAcesso(form.chave_acesso)) erros.push('Chave de acesso deve ter 44 dígitos.');
    if (!validatePositiveNumber(form.valor_total)) erros.push('Informe um valor total válido.');
    if (form.valor_impostos !== '' && !validatePositiveNumber(form.valor_impostos)) erros.push('Valor de impostos inválido.');
    if (form.data_emissao && form.data_entrada && form.data_emissao > form.data_entrada) {
      erros.push('A data de emissão não pode ser posterior à data de entrada.');
    }
    return erros;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erros = validar();
    if (erros.length) {
      toast({ title: 'Verifique os campos', description: erros.join('\n'), variant: 'destructive' });
      return;
    }

    const valorTotal = parseFloat(form.valor_total) || 0;
    const valorImpostos = parseFloat(form.valor_impostos) || 0;

    const payload = {
      ...form,
      chave_acesso: form.chave_acesso ? form.chave_acesso.replace(/\D/g, '') : '',
      valor_total: valorTotal,
      valor_impostos: valorImpostos,
      valor_liquido: calculateValorLiquido(valorTotal, valorImpostos)
    };
    CAMPOS_NULAVEIS.forEach(campo => {
      if (payload[campo] === '') payload[campo] = null;
    });
    if (isEdit) payload.id = id;

    setSaving(true);
    try {
      const nota = await entradaNFService.saveNota(payload, isEdit);
      toast({ title: 'Sucesso', description: isEdit ? 'Nota atualizada.' : 'Nota de entrada registrada.' });
      navigate(`/fiscal/entrada-nf/${nota.id}`);
    } catch (err) {
      console.error('[EntradaNFForm] Falha ao salvar:', err);
      toast({ title: 'Erro ao salvar', description: err.message || 'Não foi possível salvar a nota.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <Helmet><title>{isEdit ? 'Editar' : 'Nova'} Entrada de NF | ERP Platform</title></Helmet>

      <PageHeader
        title={isEdit ? 'Editar Entrada de NF' : 'Nova Entrada de NF'}
        description="Registre uma nota fiscal recebida de fornecedor."
        action={
          <Button variant="outline" type="button" onClick={() => navigate(isEdit ? `/fiscal/entrada-nf/${id}` : '/fiscal/entrada-nf')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da Nota</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa *</Label>
              <Select value={form.empresa_id} onValueChange={v => set('empresa_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={form.fornecedor_id} onValueChange={v => set('fornecedor_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Número *</Label>
              <Input value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Série</Label>
              <Input value={form.serie} onChange={e => set('serie', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Chave de Acesso (44 dígitos)</Label>
              <Input value={form.chave_acesso} onChange={e => set('chave_acesso', e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Data de Emissão *</Label>
              <Input type="date" value={form.data_emissao} onChange={e => set('data_emissao', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Entrada</Label>
              <Input type="date" value={form.data_entrada} onChange={e => set('data_entrada', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={form.data_vencimento} onChange={e => set('data_vencimento', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Condição de Pagamento</Label>
              <Select value={form.condicao_pagamento_id || 'none'} onValueChange={v => set('condicao_pagamento_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {condicoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Valores e Status</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor Total (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={form.valor_total} onChange={e => set('valor_total', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor de Impostos (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.valor_impostos} onChange={e => set('valor_impostos', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)} disabled={!isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/fiscal/entrada-nf')}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? 'Salvar Alterações' : 'Registrar Nota'}
          </Button>
        </div>
      </form>
    </div>
  );
}
