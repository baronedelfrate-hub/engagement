import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileKey2, Building2, TerminalSquare } from 'lucide-react';
import { validateCNPJ } from '@/lib/validationUtils';

export default function NfseConfigForm({ formData, setFormData, setPfxFileBase64, setValidationStatus, error }) {
  useEffect(() => {
    console.log('NfseConfigForm rendered', { formData });
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('Field changed:', { fieldName: name, value });
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    console.log('Field changed:', { fieldName: name, value });
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Field changed:', { fieldName: 'certificado_pfx', value: file.name });
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(',')[1];
        setPfxFileBase64(base64String);
        setFormData(prev => ({ ...prev, hasExistingCert: true }));
      };
      reader.readAsDataURL(file);
    } else {
      setPfxFileBase64(null);
      setFormData(prev => ({ ...prev, hasExistingCert: false }));
    }
  };

  useEffect(() => {
    const isCnpjValid = formData.cnpj ? validateCNPJ(formData.cnpj) : false;
    const hasRequiredFields = 
      isCnpjValid && 
      formData.inscricao_municipal?.length > 0 && 
      formData.razao_social?.length > 0 &&
      (formData.hasExistingCert || formData.senha_certificado?.length > 0);

    const passwordsMatch = formData.senha_certificado === formData.senha_confirmacao;
    
    setValidationStatus(hasRequiredFields && passwordsMatch);
  }, [formData, setValidationStatus]);

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-md font-medium text-foreground flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-600" />
            Identificação da Empresa (Padrão Nacional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ <span className="text-red-500">*</span></Label>
              <Input
                id="cnpj"
                name="cnpj"
                value={formData.cnpj || ''}
                onChange={handleChange}
                placeholder="00.000.000/0000-00"
                className={`bg-background ${formData.cnpj && !validateCNPJ(formData.cnpj) ? 'border-red-500' : ''}`}
                maxLength={18}
              />
              {formData.cnpj && !validateCNPJ(formData.cnpj) && (
                <p className="text-xs text-red-500">CNPJ inválido</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="inscricao_municipal">Inscrição Municipal <span className="text-red-500">*</span></Label>
              <Input
                id="inscricao_municipal"
                name="inscricao_municipal"
                value={formData.inscricao_municipal || ''}
                onChange={handleChange}
                placeholder="Número da IM"
                className="bg-background"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="razao_social">Razão Social <span className="text-red-500">*</span></Label>
              <Input
                id="razao_social"
                name="razao_social"
                value={formData.razao_social || ''}
                onChange={handleChange}
                placeholder="Razão Social da Empresa"
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-foreground flex items-center gap-2">
              <FileKey2 className="w-4 h-4 text-amber-600" />
              Certificado Digital (A1)
            </h3>
            {formData.hasExistingCert && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                Certificado Instalado
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="certificado">Arquivo do Certificado (.pfx / .p12)</Label>
              <Input
                id="certificado"
                name="certificado"
                type="file"
                accept=".pfx,.p12"
                onChange={handleFileChange}
                className="bg-background cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                {formData.hasExistingCert 
                  ? "Selecione um novo arquivo apenas se desejar substituir o certificado atual."
                  : "Selecione o arquivo do certificado digital A1 para emissão."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha_certificado">Senha do Certificado {(!formData.hasExistingCert) && <span className="text-red-500">*</span>}</Label>
              <Input
                id="senha_certificado"
                name="senha_certificado"
                type="password"
                value={formData.senha_certificado || ''}
                onChange={handleChange}
                placeholder="Senha de instalação"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha_confirmacao">Confirmar Senha {(!formData.hasExistingCert) && <span className="text-red-500">*</span>}</Label>
              <Input
                id="senha_confirmacao"
                name="senha_confirmacao"
                type="password"
                value={formData.senha_confirmacao || ''}
                onChange={handleChange}
                placeholder="Confirme a senha"
                className={`bg-background ${formData.senha_certificado && formData.senha_confirmacao && formData.senha_certificado !== formData.senha_confirmacao ? 'border-red-500' : ''}`}
              />
              {formData.senha_certificado && formData.senha_confirmacao && formData.senha_certificado !== formData.senha_confirmacao && (
                <p className="text-xs text-red-500">As senhas não coincidem</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-md font-medium text-foreground flex items-center gap-2 mb-4">
            <TerminalSquare className="w-4 h-4 text-purple-600" />
            Parâmetros de Teste e Ambiente
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="ambiente">Ambiente de Operação</Label>
              <Select value={formData.ambiente || 'testes'} onValueChange={(val) => handleSelectChange('ambiente', val)}>
                <SelectTrigger className="bg-background w-full">
                  <SelectValue placeholder="Selecione o ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testes">Homologação (Testes)</SelectItem>
                  <SelectItem value="producao">Produção (Validade Jurídica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="descricao_servico_teste">Descrição do Serviço (Teste Emissão)</Label>
              <Input
                id="descricao_servico_teste"
                name="descricao_servico_teste"
                value={formData.descricao_servico_teste || ''}
                onChange={handleChange}
                placeholder="Ex: Serviço de teste de integração NFS-e Nacional"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_servico_teste">Valor do Serviço (R$)</Label>
              <Input
                id="valor_servico_teste"
                name="valor_servico_teste"
                type="number"
                step="0.01"
                value={formData.valor_servico_teste || ''}
                onChange={handleChange}
                placeholder="1.00"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliquota_iss_teste">Alíquota ISS (%)</Label>
              <Input
                id="aliquota_iss_teste"
                name="aliquota_iss_teste"
                type="number"
                step="0.01"
                value={formData.aliquota_iss_teste || ''}
                onChange={handleChange}
                placeholder="2.00"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj_cliente_teste">CPF/CNPJ Cliente Teste</Label>
              <Input
                id="cpf_cnpj_cliente_teste"
                name="cpf_cnpj_cliente_teste"
                value={formData.cpf_cnpj_cliente_teste || ''}
                onChange={handleChange}
                placeholder="Somente números"
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}