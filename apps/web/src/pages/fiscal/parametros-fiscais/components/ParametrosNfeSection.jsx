import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, Package } from 'lucide-react';

export default function ParametrosNfeSection({ data, onChange, onSave, loading }) {
  useEffect(() => {
    console.log('ParametrosNfeSection mounted');
  }, []);

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    console.log('NFe parameters updated:', { formData: newData });
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" /> 
            Configurações de NF-e (Produtos)
          </CardTitle>
          <CardDescription>
            Defina os padrões preenchidos automaticamente ao iniciar uma nova emissão.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <Label>Série Padrão NF-e *</Label>
            <Input 
              value={data.serie_padrao || ''} 
              onChange={(e) => handleChange('serie_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Próximo Número (NF-e)</Label>
            <Input 
              type="number"
              value={data.proximo_numero || ''} 
              onChange={(e) => handleChange('proximo_numero', parseInt(e.target.value, 10))} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Modelo Padrão</Label>
            <Select value={data.modelo_padrao || ''} onValueChange={(v) => handleChange('modelo_padrao', v)}>
              <SelectTrigger className="text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="55">NF-e (Modelo 55)</SelectItem>
                <SelectItem value="65">NFC-e (Modelo 65)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select value={data.tipo_documento || ''} onValueChange={(v) => handleChange('tipo_documento', v)}>
              <SelectTrigger className="text-foreground"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Saída">Saída</SelectItem>
                <SelectItem value="Entrada">Entrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>CFOP Padrão</Label>
            <Input 
              placeholder="Ex: 5101, 5102"
              value={data.cfop_padrao || ''} 
              onChange={(e) => handleChange('cfop_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Natureza de Operação Padrão</Label>
            <Input 
              placeholder="Ex: Venda de Mercadoria"
              value={data.natureza_operacao_padrao || ''} 
              onChange={(e) => handleChange('natureza_operacao_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observações Padrão (Rodapé da Nota)</Label>
            <Textarea 
              placeholder="Texto impresso nas informações complementares..."
              value={data.observacoes_padrao || ''} 
              onChange={(e) => handleChange('observacoes_padrao', e.target.value)} 
              className="text-foreground min-h-[80px]" 
            />
          </div>

          <div className="flex items-center space-x-2 md:col-span-2 p-3 bg-muted rounded-lg border border-border">
            <Switch 
              id="nfe-cr" 
              checked={data.gerar_contas_receber || false} 
              onCheckedChange={(v) => handleChange('gerar_contas_receber', v)} 
            />
            <Label htmlFor="nfe-cr" className="flex-1 cursor-pointer">
              Gerar título no Contas a Receber automaticamente após emissão autorizada
            </Label>
          </div>

          <div className="flex items-center space-x-2 md:col-span-2 p-3 bg-muted rounded-lg border border-border">
            <Switch 
              id="nfe-cont" 
              checked={data.enviar_contabilidade || false} 
              onCheckedChange={(v) => handleChange('enviar_contabilidade', v)} 
            />
            <Label htmlFor="nfe-cont" className="flex-1 cursor-pointer">
              Disponibilizar XML/PDF automaticamente para a Contabilidade
            </Label>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Salvar Parâmetros NF-e
        </Button>
      </div>
    </div>
  );
}