import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, FileText } from 'lucide-react';

export default function ParametrosNfseSection({ data, onChange, onSave, loading }) {
  useEffect(() => {
    console.log('ParametrosNfseSection mounted');
  }, []);

  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    console.log('NFSe parameters updated:', { formData: newData });
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> 
            Configurações de NFS-e (Serviços)
          </CardTitle>
          <CardDescription>
            Padrões para emissão municipal. Variáveis conforme a prefeitura do emitente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-2">
            <Label>Série Padrão NFS-e *</Label>
            <Input 
              value={data.serie_padrao || ''} 
              onChange={(e) => handleChange('serie_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Próximo Número (NFS-e)</Label>
            <Input 
              type="number"
              value={data.proximo_numero || ''} 
              onChange={(e) => handleChange('proximo_numero', parseInt(e.target.value, 10))} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Próximo RPS</Label>
            <Input 
              type="number"
              value={data.proximo_rps || ''} 
              onChange={(e) => handleChange('proximo_rps', parseInt(e.target.value, 10))} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Alíquota ISS Padrão (%)</Label>
            <Input 
              type="number" step="0.01" min="0" max="100"
              value={data.aliquota_iss_padrao || 0} 
              onChange={(e) => handleChange('aliquota_iss_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Retenção IRRF Padrão (%)</Label>
            <Input 
              type="number" step="0.01" min="0" max="100"
              value={data.retencao_irrf_padrao || 0} 
              onChange={(e) => handleChange('retencao_irrf_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Retenção PIS Padrão (%)</Label>
            <Input 
              type="number" step="0.01" min="0" max="100"
              value={data.retencao_pis_padrao || 0} 
              onChange={(e) => handleChange('retencao_pis_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Retenção COFINS Padrão (%)</Label>
            <Input 
              type="number" step="0.01" min="0" max="100"
              value={data.retencao_cofins_padrao || 0} 
              onChange={(e) => handleChange('retencao_cofins_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Retenção CSLL Padrão (%)</Label>
            <Input 
              type="number" step="0.01" min="0" max="100"
              value={data.retencao_csll_padrao || 0} 
              onChange={(e) => handleChange('retencao_csll_padrao', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label>Observações Padrão (Rodapé da Nota)</Label>
            <Textarea 
              placeholder="Texto impresso no corpo/rodapé da NFS-e..."
              value={data.observacoes_padrao || ''} 
              onChange={(e) => handleChange('observacoes_padrao', e.target.value)} 
              className="text-foreground min-h-[80px]" 
            />
          </div>

          <div className="flex items-center space-x-2 md:col-span-3 p-3 bg-muted rounded-lg border border-border">
            <Switch 
              id="nfse-cr" 
              checked={data.gerar_contas_receber || false} 
              onCheckedChange={(v) => handleChange('gerar_contas_receber', v)} 
            />
            <Label htmlFor="nfse-cr" className="flex-1 cursor-pointer">
              Gerar título no Contas a Receber automaticamente após emissão autorizada
            </Label>
          </div>

          <div className="flex items-center space-x-2 md:col-span-3 p-3 bg-muted rounded-lg border border-border">
            <Switch 
              id="nfse-cont" 
              checked={data.enviar_contabilidade || false} 
              onCheckedChange={(v) => handleChange('enviar_contabilidade', v)} 
            />
            <Label htmlFor="nfse-cont" className="flex-1 cursor-pointer">
              Disponibilizar XML/PDF automaticamente para a Contabilidade
            </Label>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Salvar Parâmetros NFS-e
        </Button>
      </div>
    </div>
  );
}