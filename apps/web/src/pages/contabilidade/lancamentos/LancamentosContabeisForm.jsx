import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Save, ArrowLeft, Link as LinkIcon, Send } from 'lucide-react';
import { useLancamentosContabeis } from './hooks/useLancamentosContabeis';
import { getStatusColor, validateLancamento } from './utils/lancamentosUtils';
import DocumentLinkingModal from './components/DocumentLinkingModal';

export default function LancamentosContabeisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createLancamento, updateLancamento, getLancamento, changeLancamentoStatus } = useLancamentosContabeis();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  const [empresas, setEmpresas] = useState([]);
  const [contas, setContas] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);

  const [formData, setFormData] = useState({
    empresa_id: '',
    data: new Date().toISOString().split('T')[0],
    competencia: new Date().toISOString().slice(0, 7),
    historico: '',
    conta_debito_id: '',
    conta_credito_id: '',
    centro_custo_id: 'none',
    valor: '',
    origem: 'Ajuste Manual',
    documento_vinculado: '',
    observacoes: '',
    status: 'Rascunho'
  });

  useEffect(() => {
    const fetchDependencies = async () => {
      setLoading(true);
      const [empRes, contasRes, ccRes] = await Promise.all([
        supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true),
        supabase.from('contas_contabeis').select('id, codigo, nome').eq('ativa', true).order('codigo'),
        supabase.from('centros_custo').select('id, codigo, nome').eq('ativo', true).order('codigo')
      ]);
      
      if (empRes.data) setEmpresas(empRes.data);
      if (contasRes.data) setContas(contasRes.data);
      if (ccRes.data) setCentrosCusto(ccRes.data);

      if (id) {
        const doc = await getLancamento(id);
        if (doc) {
          setFormData({
            ...doc,
            centro_custo_id: doc.centro_custo_id || 'none',
            observacoes: doc.observacoes || '',
            documento_vinculado: doc.documento_vinculado || ''
          });
        }
      }
      setLoading(false);
    };
    fetchDependencies();
  }, [id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentLinked = (doc) => {
    setFormData(prev => ({
      ...prev,
      origem: doc.tipo === 'nf' ? 'NF' : doc.tipo === 'pagamento' ? 'Pagamento' : doc.tipo === 'recebimento' ? 'Recebimento' : 'Folha',
      documento_vinculado: doc.numero,
      valor: doc.valor.toString(),
      historico: prev.historico ? prev.historico : `Ref. ${doc.tipo.toUpperCase()} ${doc.numero} - ${doc.fornecedor || doc.cliente || ''}`
    }));
  };

  const handleSave = async (submit = false) => {
    const payload = { ...formData, centro_custo_id: formData.centro_custo_id === 'none' ? null : formData.centro_custo_id };
    
    if (submit) {
      const validation = validateLancamento(payload);
      if (!validation.valid) {
        toast({ title: 'Erros de Validação', description: validation.errors.join('\n'), variant: 'destructive' });
        return;
      }
    } else if (!payload.empresa_id || !payload.data || !payload.historico) {
      toast({ title: 'Aviso', description: 'Preencha os campos básicos (Empresa, Data, Histórico) para salvar rascunho.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let savedDoc = null;
      if (id) {
        const success = await updateLancamento(id, payload);
        if (success) savedDoc = { id };
      } else {
        savedDoc = await createLancamento(payload);
      }

      if (savedDoc && submit) {
        await changeLancamentoStatus(savedDoc.id, 'Rascunho', 'Pendente', 'Submetido para revisão.');
      }
      
      navigate('/contabilidade/lancamentos');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">{id ? "Editar Lançamento" : "Novo Lançamento Contábil"}</h2>
        <Badge className={getStatusColor(formData.status)}>{formData.status}</Badge>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-slate-800">Dados do Lançamento</CardTitle>
          <Button variant="outline" size="sm" className="bg-white" onClick={() => setShowLinkModal(true)}>
            <LinkIcon className="w-4 h-4 mr-2" /> Vincular Origem
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Empresa *</Label>
              <Select value={formData.empresa_id} onValueChange={(v) => handleChange('empresa_id', v)}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Data do Lançamento *</Label>
              <Input 
                type="date" 
                value={formData.data}
                onChange={(e) => handleChange('data', e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Competência (Mês/Ano) *</Label>
              <Input 
                type="month" 
                value={formData.competencia}
                onChange={(e) => handleChange('competencia', e.target.value)}
                className="bg-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Histórico do Lançamento *</Label>
            <Textarea 
              value={formData.historico}
              onChange={(e) => handleChange('historico', e.target.value)}
              className="min-h-[80px] bg-white"
              placeholder="Descreva o motivo do lançamento..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-blue-700">Conta Débito (D) *</Label>
              <Select value={formData.conta_debito_id} onValueChange={(v) => handleChange('conta_debito_id', v)}>
                <SelectTrigger className="bg-white border-blue-200"><SelectValue placeholder="Selecione Conta a Debitar" /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold text-emerald-700">Conta Crédito (C) *</Label>
              <Select value={formData.conta_credito_id} onValueChange={(v) => handleChange('conta_credito_id', v)}>
                <SelectTrigger className="bg-white border-emerald-200"><SelectValue placeholder="Selecione Conta a Creditar" /></SelectTrigger>
                <SelectContent>
                  {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Valor (R$) *</Label>
              <Input 
                type="number" 
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => handleChange('valor', e.target.value)}
                className="bg-white font-medium"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Origem *</Label>
              <Select value={formData.origem} onValueChange={(v) => handleChange('origem', v)}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {['NF', 'Pagamento', 'Recebimento', 'Folha', 'Ajuste Manual', 'Outro'].map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Centro de Custo</Label>
              <Select value={formData.centro_custo_id} onValueChange={(v) => handleChange('centro_custo_id', v)}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {centrosCusto.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Documento Vinculado</Label>
              <Input 
                value={formData.documento_vinculado}
                onChange={(e) => handleChange('documento_vinculado', e.target.value)}
                className="bg-white"
                placeholder="Ex: NF 12345"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Observações Internas</Label>
            <Textarea 
              value={formData.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              className="min-h-[80px] bg-white"
              placeholder="Notas apenas para equipe contábil..."
            />
          </div>

        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/contabilidade/lancamentos')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleSave(false)} 
              disabled={saving || (formData.status !== 'Rascunho' && formData.status !== 'Pendente')}
              className="bg-white"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
            </Button>
            <Button 
              type="button" 
              onClick={() => handleSave(true)} 
              disabled={saving || (formData.status !== 'Rascunho')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" /> Submeter P/ Revisão
            </Button>
          </div>
        </CardFooter>
      </Card>

      <DocumentLinkingModal 
        open={showLinkModal} 
        onOpenChange={setShowLinkModal}
        onLink={handleDocumentLinked}
      />
    </div>
  );
}