import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Server, Activity, ShieldCheck, Upload } from 'lucide-react';

export default function ParametrosIntegradoresSection({ data, onChange, onSave, onTestConnection, loading }) {
  
  const handleChange = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Conectado': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'Erro': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5 text-purple-600" /> 
              Status da Integração
            </CardTitle>
            <CardDescription className="mt-1">
              Verifique a conexão atual com a SEFAZ ou Prefeituras.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onTestConnection} disabled={loading}>
            <Activity className="w-4 h-4 mr-2" /> Testar Conexão
          </Button>
        </CardHeader>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status Atual</p>
            <Badge variant="outline" className={`${getStatusColor(data.status_integracao || 'Desconectado')} font-medium`}>
              {data.status_integracao || 'Desconectado'}
            </Badge>
          </div>
          <div className="space-y-1 md:border-l md:border-border md:pl-6">
            <p className="text-sm text-muted-foreground">Última Sincronização</p>
            <p className="font-medium text-foreground">{data.ultima_sincronizacao ? new Date(data.ultima_sincronizacao).toLocaleString() : 'Nunca realizada'}</p>
          </div>
          <div className="space-y-1 md:border-l md:border-border md:pl-6">
            <p className="text-sm text-muted-foreground">Ambiente Selecionado</p>
            <p className="font-medium text-foreground">{data.ambiente || 'Produção'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" /> API e Credenciais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2">
            <Label>Ambiente de Emissão</Label>
            <Select value={data.ambiente || 'Produção'} onValueChange={(v) => handleChange('ambiente', v)}>
              <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Produção">Produção</SelectItem>
                <SelectItem value="Homologação">Homologação (Testes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:block"></div>

          <div className="space-y-2">
            <Label>Integrador NF-e</Label>
            <Select value={data.integrador_nfe || 'Nenhum'} onValueChange={(v) => handleChange('integrador_nfe', v)}>
              <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Nenhum">Nenhum</SelectItem>
                <SelectItem value="UNINFE">UNINFE (Local)</SelectItem>
                <SelectItem value="FocusNFe">Focus NFe</SelectItem>
                <SelectItem value="eNotas">eNotas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chave API (NF-e)</Label>
            <Input 
              type="password" 
              placeholder="••••••••••••"
              value={data.chave_nfe || ''} 
              onChange={(e) => handleChange('chave_nfe', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2">
            <Label>Integrador NFS-e</Label>
            <Select value={data.integrador_nfse || 'Nenhum'} onValueChange={(v) => handleChange('integrador_nfse', v)}>
              <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Nenhum">Nenhum</SelectItem>
                <SelectItem value="FocusNFe">Focus NFe</SelectItem>
                <SelectItem value="eNotas">eNotas</SelectItem>
                <SelectItem value="PlugNotas">PlugNotas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Chave API (NFS-e)</Label>
            <Input 
              type="password" 
              placeholder="••••••••••••"
              value={data.chave_nfse || ''} 
              onChange={(e) => handleChange('chave_nfse', e.target.value)} 
              className="text-foreground" 
            />
          </div>

        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-base">Certificado Digital (A1)</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-2 md:col-span-2">
            <Label>Arquivo PFX / P12</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
               <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
               <p className="text-sm font-medium">Clique para enviar o certificado A1</p>
               <p className="text-xs mt-1">{data.certificado_path ? 'Certificado carregado' : 'Nenhum certificado configurado'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Senha do Certificado</Label>
            <Input 
              type="password" 
              placeholder="••••••••"
              value={data.certificado_senha || ''} 
              onChange={(e) => handleChange('certificado_senha', e.target.value)} 
              className="text-foreground" 
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Observações Internas (TI)</Label>
            <Textarea 
              value={data.observacoes || ''} 
              onChange={(e) => handleChange('observacoes', e.target.value)} 
              className="text-foreground min-h-[60px]" 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Salvar Integrações
        </Button>
      </div>
    </div>
  );
}