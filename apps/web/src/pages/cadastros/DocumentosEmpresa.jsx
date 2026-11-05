import React from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, FolderOpen } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import GerenciadorDocumentos from '@/components/documentos/GerenciadorDocumentos';
import { useAuthContext } from '@/contexts/AuthContext';

export const TIPOS_EMPRESA = [
  { id: 'contrato_social', rotulo: 'Contrato social' }, { id: 'alteracao_contratual', rotulo: 'Alteração contratual' },
  { id: 'cartao_cnpj', rotulo: 'Cartão CNPJ' }, { id: 'cnd_federal', rotulo: 'CND Federal' }, { id: 'cnd_estadual', rotulo: 'CND Estadual' },
  { id: 'cnd_municipal', rotulo: 'CND Municipal' }, { id: 'cnd_trabalhista', rotulo: 'CND Trabalhista' }, { id: 'crf_fgts', rotulo: 'Certificado de Regularidade do FGTS' },
  { id: 'alvara', rotulo: 'Alvará' }, { id: 'outro', rotulo: 'Outro' }
];

const DocumentosEmpresa = () => {
  const { company_id: companyId, loading } = useAuthContext();
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!companyId) return <p className="text-sm text-muted-foreground py-10 text-center">Entre com o usuário de uma empresa para ver os documentos dela.</p>;
  return (
    <>
      <Helmet><title>Documentos da Empresa - Engagement ERP</title></Helmet>
      <PageHeader title="Documentos da Empresa" icon={FolderOpen}
        description="Contrato social, CNDs e outros documentos da empresa, em pasta privada. Informe a validade para o sistema avisar quando estiver vencendo." />
      <GerenciadorDocumentos modo="empresa" tabela="empresa_documentos" bucket="empresa-docs" tipos={TIPOS_EMPRESA} companyId={companyId} />
    </>
  );
};
export default DocumentosEmpresa;
