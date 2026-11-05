import React from 'react';
import { Helmet } from 'react-helmet';
import { ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import GerenciadorDocumentos from '@/components/documentos/GerenciadorDocumentos';

export const TIPOS_PESSOAIS = [
  { id: 'rg', rotulo: 'RG' }, { id: 'cpf', rotulo: 'CPF' }, { id: 'cnh', rotulo: 'CNH' },
  { id: 'comprovante_residencia', rotulo: 'Comprovante de residência' }, { id: 'passaporte', rotulo: 'Passaporte' },
  { id: 'certidao', rotulo: 'Certidão (casamento/nascimento)' }, { id: 'titulo_eleitor', rotulo: 'Título de eleitor' },
  { id: 'declaracao_ir', rotulo: 'Declaração de Imposto de Renda' }, { id: 'outro', rotulo: 'Outro' }
];

// Só o superadmin: pasta privada, link temporário de 2 minutos para abrir e registro de quem abriu ou enviou.
const DocumentosPessoais = () => (
  <>
    <Helmet><title>Documentos Pessoais - Engagement ERP</title></Helmet>
    <PageHeader title="Documentos Pessoais" icon={ShieldCheck}
      description="RG, CPF, CNH e outros documentos de pessoas. Ficam em pasta privada que só o superadmin acessa; cada abertura e envio fica registrado." />
    <GerenciadorDocumentos modo="pessoal" tabela="docs_pessoais" bucket="docs-pessoais" tipos={TIPOS_PESSOAIS} />
  </>
);
export default DocumentosPessoais;
