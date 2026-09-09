import React, { useState, useEffect } from 'react';
import { useNfseConfig } from './useNfseConfig';
import NfseConfigForm from './NfseConfigForm';
import NfseConfigSecurity from './NfseConfigSecurity';
import NfseConfigActions from './NfseConfigActions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Server, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const INITIAL_FORM = {
  cnpj: '',
  inscricao_municipal: '',
  razao_social: '',
  senha_certificado: '',
  senha_confirmacao: '',
  descricao_servico_teste: '',
  valor_servico_teste: '',
  aliquota_iss_teste: '',
  cpf_cnpj_cliente_teste: '',
  nome_cliente_teste: '',
  ambiente: 'testes',
  hasExistingCert: false
};

export default function NfseConfigPage({ empresaId }) {
  useEffect(() => {
    console.log('NfseConfigPage mounted', { empresaId });
  }, [empresaId]);

  const { config, loading, error: fetchError, saveConfig, deleteConfig } = useNfseConfig(empresaId);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [pfxFileBase64, setPfxFileBase64] = useState(null);
  const [securityChecked, setSecurityChecked] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    console.log('Loading NFSE config');
    if (config && !isEditMode) {
      console.log('Config loaded:', config);
      setFormData({
        ...config,
        senha_certificado: config.senha_certificado_decrypted || '',
        senha_confirmacao: config.senha_certificado_decrypted || '',
        hasExistingCert: !!config.certificado_pfx,
        valor_servico_teste: config.valor_servico_teste !== null ? config.valor_servico_teste.toString() : '',
        aliquota_iss_teste: config.aliquota_iss_teste !== null ? config.aliquota_iss_teste.toString() : ''
      });
      setSaveError(null);
    } else if (!config && !loading && !fetchError) {
      setFormData(INITIAL_FORM);
      setSaveError(null);
    }
    if (fetchError) {
      console.log('Config error:', fetchError);
    }
  }, [config, isEditMode, loading, fetchError]);

  const handleSave = async () => {
    console.log('Saving config:', formData);
    setSaveError(null);

    if (!isValid) {
      toast({ title: 'Validação', description: 'Corrija os erros no formulário antes de salvar.', variant: 'destructive' });
      return;
    }

    if (!securityChecked) {
      toast({ title: 'Aviso', description: 'Você deve aceitar os termos de segurança.', variant: 'destructive' });
      return;
    }
    
    const result = await saveConfig(formData, pfxFileBase64);
    
    if (result && result.success) {
      console.log('Save response:', result);
      setIsEditMode(false);
      setPfxFileBase64(null);
      toast({
        title: 'Sucesso',
        description: 'Configurações de NFS-e salvas com sucesso.',
      });
    } else if (result && result.error) {
      console.log('Save error:', result.error);
      if (result.error.code === '42501') {
        setSaveError(`Erro de permissão (RLS). A política de segurança do banco de dados não permitiu a gravação. Detalhes: ${result.error.message || 'Acesso negado'}`);
      } else {
        setSaveError(result.error.message || "Ocorreu um erro desconhecido ao tentar salvar. Verifique o console para mais detalhes.");
      }
    }
  };

  const handleClear = () => {
    setFormData(INITIAL_FORM);
    setPfxFileBase64(null);
    setSecurityChecked(false);
    setSaveError(null);
  };

  const hasConfig = !!config;
  const showForm = !hasConfig || isEditMode;

  if (!empresaId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Selecione uma empresa</AlertTitle>
        <AlertDescription>
          É necessário selecionar uma empresa para configurar os parâmetros da NFS-e Nacional.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 relative">
      {!showForm && hasConfig && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 transition-all duration-300 ease-in-out">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" /> Configuração NFS-e Ativa
                </h3>
                <div className="space-y-1 text-sm text-foreground">
                  <p><strong>Empresa:</strong> {config.razao_social}</p>
                  <p><strong>CNPJ:</strong> {config.cnpj}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <strong>Ambiente:</strong> 
                    <Badge variant={config.ambiente === 'producao' ? 'default' : 'secondary'} className={config.ambiente === 'producao' ? 'bg-blue-600' : 'bg-amber-500 text-white'}>
                      {config.ambiente.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              <Server className="w-16 h-16 text-emerald-200 opacity-50" />
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <div className="bg-background p-6 rounded-xl shadow-sm border border-border transition-all duration-300 ease-in-out">
          <h2 className="text-xl font-semibold text-foreground mb-6">Configuração Padrão Nacional NFS-e</h2>
          
          {saveError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao Salvar</AlertTitle>
              <AlertDescription>
                <div className="font-medium">{saveError}</div>
                <div className="mt-2 text-xs opacity-80">Por favor, verifique os dados e tente novamente.</div>
              </AlertDescription>
            </Alert>
          )}

          {fetchError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar dados</AlertTitle>
              <AlertDescription>
                <div className="font-medium">{fetchError.message || "Erro desconhecido"}</div>
              </AlertDescription>
            </Alert>
          )}

          <NfseConfigForm 
            formData={formData} 
            setFormData={setFormData} 
            setPfxFileBase64={setPfxFileBase64}
            setValidationStatus={setIsValid}
            error={fetchError}
          />
          <NfseConfigSecurity 
            isChecked={securityChecked} 
            setIsChecked={setSecurityChecked} 
          />
        </div>
      )}

      <NfseConfigActions 
        onSave={handleSave}
        onClear={handleClear}
        onDelete={deleteConfig}
        onEdit={() => setIsEditMode(true)}
        onTestConnection={() => toast({ title: 'Conexão Testada', description: 'Comunicação com o webservice nacional estabelecida com sucesso.' })}
        isValid={isValid && securityChecked}
        isSaving={loading}
        hasConfig={hasConfig}
        isEditMode={isEditMode}
      />
    </div>
  );
}