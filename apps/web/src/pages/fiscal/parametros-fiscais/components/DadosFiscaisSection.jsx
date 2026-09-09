import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, Building2 } from 'lucide-react';

export default function DadosFiscaisSection({ data, onChange, onSave, loading }) {
  useEffect(() => {
    console.log('DadosFiscaisSection mounted');
  }, []);

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    console.log('Dados fiscais updated:', { formData: newData });
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> 
            Dados Cadastrais Fiscais
          </CardTitle>
          <CardDescription>
            Configurações básicas da empresa para fins de tributação e obrigações acessórias.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <Label>Regime Tributário *</Label>
            <Select value={data.regime_tributario || ''} onValueChange={(v) => handleChange('regime_tributario', v)}>
              <SelectTrigger className="text-foreground">
                <SelectValue placeholder="Selecione o regime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                <SelectItem value="Lucro Real">Lucro Real</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Início das Atividades</Label>
            <Input 
              type="date" 
              value={data.data_inicio_atividades || ''} 
              onChange={(e) => handleChange('data_inicio_atividades', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Inscrição Estadual (IE) *</Label>
            <Input 
              placeholder="Ex: 123456789" 
              value={data.inscricao_estadual || ''} 
              onChange={(e) => handleChange('inscricao_estadual', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Inscrição Municipal (IM)</Label>
            <Input 
              placeholder="Ex: 987654" 
              value={data.inscricao_municipal || ''} 
              onChange={(e) => handleChange('inscricao_municipal', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>CNAE Principal</Label>
            <Input 
              placeholder="Código CNAE" 
              value={data.cnae_principal_id || ''} 
              onChange={(e) => handleChange('cnae_principal_id', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>CNAEs Secundários</Label>
            <Input 
              placeholder="Separe por vírgulas" 
              value={(data.cnae_secundarios || []).join(', ')} 
              onChange={(e) => {
                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                handleChange('cnae_secundarios', arr);
              }} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Descrição das Atividades</Label>
            <Textarea 
              placeholder="Descreva as atividades para compor notas e relatórios..."
              value={data.descricao_atividades || ''} 
              onChange={(e) => handleChange('descricao_atividades', e.target.value)} 
              className="text-foreground min-h-[80px]" 
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observações Gerais</Label>
            <Textarea 
              placeholder="Observações internas..."
              value={data.observacoes_gerais || ''} 
              onChange={(e) => handleChange('observacoes_gerais', e.target.value)} 
              className="text-foreground min-h-[80px]" 
            />
          </div>

        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Salvar Dados Fiscais
        </Button>
      </div>
    </div>
  );
}