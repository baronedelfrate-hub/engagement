import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Building2, Package, FileText, Calculator, Server, ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useParametrosFiscais } from './hooks/useParametrosFiscais';
import { useToast } from '@/components/ui/use-toast';

import DadosFiscaisSection from './components/DadosFiscaisSection';
import ParametrosNfeSection from './components/ParametrosNfeSection';
import ParametrosNfseSection from './components/ParametrosNfseSection';
import ParametrosTributosSection from './components/ParametrosTributosSection';
import ParametrosIntegradoresSection from './components/ParametrosIntegradoresSection';
import NfseConfigPage from './components/nfse-nacional/NfseConfigPage';

export default function ParametrosFiscaisPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState('');
  const [fetchingEmpresas, setFetchingEmpresas] = useState(true);

  const {
    loading: paramsLoading,
    fetchParameters,
    dadosFiscais, setDadosFiscais, saveDadosFiscais,
    parametrosNfe, setParametrosNfe, saveNfe,
    parametrosNfse, setParametrosNfse, saveNfse,
    parametrosTributos, saveTributos,
    parametrosIntegradores, setParametrosIntegradores, saveIntegradores,
    testConnection
  } = useParametrosFiscais(selectedEmpresa);

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (selectedEmpresa) {
      fetchParameters();
    }
  }, [selectedEmpresa, fetchParameters]);

  const loadEmpresas = async () => {
    setFetchingEmpresas(true);
    try {
      const { data, error } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true);
      if (!error && data) {
        setEmpresas(data);
        if (data.length > 0) setSelectedEmpresa(data[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar empresas", err);
    } finally {
      setFetchingEmpresas(false);
    }
  };

  const handleSave = async (saveFn, data) => {
    await saveFn(data);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title="Parâmetros Fiscais" 
          description="Configurações gerais para emissão de notas e apuração de tributos."
          icon={Settings}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'Parâmetros Fiscais' }
          ]}
        />
        
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
            onClick={() => toast({ title: 'Aviso', description: 'Utilize os botões de salvar localizados ao final de cada aba específica para gravar as configurações.' })}
          >
            <Save className="w-4 h-4 mr-2" /> Salvar Configurações
          </Button>
          
          <Button variant="outline" onClick={() => navigate('/fiscal/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="font-medium text-foreground min-w-max">Selecione a Empresa:</div>
            {fetchingEmpresas ? (
               <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
               <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                 <SelectTrigger className="w-[300px] text-foreground font-semibold bg-background">
                   <SelectValue placeholder="Selecione..." />
                 </SelectTrigger>
                 <SelectContent>
                   {empresas.map(e => (
                     <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedEmpresa && !fetchingEmpresas && (
        <div className="p-12 text-center text-muted-foreground bg-muted rounded-lg border border-border">
          Selecione ou cadastre uma empresa para configurar os parâmetros fiscais.
        </div>
      )}

      {selectedEmpresa && (
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-muted/50 p-1 mb-6 h-auto">
            <TabsTrigger value="dados" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Building2 className="w-4 h-4 mr-2 hidden md:block"/> Dados Fiscais</TabsTrigger>
            <TabsTrigger value="nfe" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Package className="w-4 h-4 mr-2 hidden md:block"/> NF-e</TabsTrigger>
            <TabsTrigger value="nfse" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><FileText className="w-4 h-4 mr-2 hidden md:block"/> NFS-e</TabsTrigger>
            <TabsTrigger value="tributos" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Calculator className="w-4 h-4 mr-2 hidden md:block"/> Tributos</TabsTrigger>
            <TabsTrigger value="integra" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2"><Server className="w-4 h-4 mr-2 hidden md:block"/> Integrações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dados">
            <DadosFiscaisSection 
              data={dadosFiscais} 
              onChange={setDadosFiscais} 
              onSave={() => handleSave(saveDadosFiscais, dadosFiscais)} 
              loading={paramsLoading}
            />
          </TabsContent>

          <TabsContent value="nfe">
            <ParametrosNfeSection 
              data={parametrosNfe} 
              onChange={setParametrosNfe} 
              onSave={() => handleSave(saveNfe, parametrosNfe)} 
              loading={paramsLoading}
            />
          </TabsContent>

          <TabsContent value="nfse" className="space-y-8">
            <ParametrosNfseSection 
              data={parametrosNfse} 
              onChange={setParametrosNfse} 
              onSave={() => handleSave(saveNfse, parametrosNfse)} 
              loading={paramsLoading}
            />

            <div className="pt-8 border-t border-border">
              <NfseConfigPage empresaId={selectedEmpresa} />
            </div>
          </TabsContent>

          <TabsContent value="tributos">
            <ParametrosTributosSection 
              initialData={parametrosTributos} 
              onSave={(data) => handleSave(saveTributos, data)} 
              loading={paramsLoading}
            />
          </TabsContent>

          <TabsContent value="integra">
            <ParametrosIntegradoresSection 
              data={parametrosIntegradores} 
              onChange={setParametrosIntegradores} 
              onSave={() => handleSave(saveIntegradores, parametrosIntegradores)} 
              onTestConnection={testConnection}
              loading={paramsLoading}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}