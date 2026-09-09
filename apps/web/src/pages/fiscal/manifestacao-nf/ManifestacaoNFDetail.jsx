import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, ArrowLeft, History, Download, Building2, CheckCircle2, Search
} from 'lucide-react';
import { manifestacaoNFService } from './services/manifestacaoNFService';
import { formatCurrency, formatDate, getStatusManifestacaoColor, getSituacaoConsultaColor } from './utils/manifestacaoNFUtils';
import { ActionButtons } from './components/ManifestacaoNFActions';

export default function ManifestacaoNFDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [nota, setNota] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const n = await manifestacaoNFService.getById(id);
      const h = await manifestacaoNFService.getHistorico(id);
      setNota(n);
      setHistorico(h);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar detalhes da manifestação.', variant: 'destructive' });
      navigate('/fiscal/manifestacao-nf');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    toast({ title: 'Download', description: 'Baixando arquivo do repositório SEFAZ...' });
    // Simulate delay
    setTimeout(() => {
      toast({ title: 'Sucesso', description: 'Arquivo baixado com sucesso.' });
    }, 1500);
  }

  if (loading) return <div className="p-8 flex justify-center text-blue-600">Carregando...</div>;
  if (!nota) return null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <Helmet><title>Detalhes Manifestação | ERP Platform</title></Helmet>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          title={`Manifestação NF: ${nota.numero || 'S/N'}`}
          description="Gestão, status e integrações do documento fiscal."
          icon={FileText}
          breadcrumbs={[
            { label: 'Fiscal', href: '/fiscal/dashboard' }, 
            { label: 'Manifestação', href: '/fiscal/manifestacao-nf' },
            { label: 'Detalhes' }
          ]}
        />
        <Button variant="outline" onClick={() => navigate('/fiscal/manifestacao-nf')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>

      {/* STATUS BANNER & ACTIONS */}
      <Card className="bg-background border-border shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`${getSituacaoConsultaColor(nota.situacao_consulta)} px-3 py-1 text-sm`}>
              <Search className="w-3 h-3 mr-1" /> {nota.situacao_consulta}
            </Badge>
            <Badge className={`${getStatusManifestacaoColor(nota.status_manifestacao)} px-3 py-1 text-sm`}>
              {nota.status_manifestacao}
            </Badge>
            
            {nota.importado_entrada && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Importado NF Entrada</Badge>}
            {nota.integrado_financeiro && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Financeiro Integrado</Badge>}
            {nota.integrado_contabil && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Contabilidade Enviada</Badge>}
          </div>
          
          <ActionButtons nota={nota} loadData={loadData} toast={toast} navigate={navigate} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAIN INFO */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Dados da Nota Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              
              <div className="col-span-full">
                <p className="text-sm font-medium text-muted-foreground mb-1">Chave de Acesso</p>
                <p className="text-foreground text-sm font-mono bg-muted p-2 rounded tracking-widest">{nota.chave_acesso}</p>
              </div>

              <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Número / Série</p><p className="text-foreground font-medium">{nota.numero || '-'} {nota.serie ? `/ ${nota.serie}` : ''}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Data Emissão</p><p className="text-foreground">{formatDate(nota.data_emissao)}</p></div>
              </div>
              
              <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Valor Total</p><p className="text-xl font-bold text-foreground">{formatCurrency(nota.valor_total)}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground mb-1">Empresa Destino</p><p className="text-foreground">{nota.empresas?.razao_social}</p></div>
              </div>

              <div className="col-span-full pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /> Fornecedor (Emitente)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                  <div><p className="text-xs text-muted-foreground">Razão Social</p><p className="text-sm font-medium text-foreground">{nota.fornecedores?.nome || nota.fornecedor_nome}</p></div>
                  <div><p className="text-xs text-muted-foreground">CNPJ</p><p className="text-sm text-foreground">{nota.fornecedores?.cnpj || nota.fornecedor_cnpj}</p></div>
                  <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Endereço / IE</p><p className="text-sm text-foreground">{nota.fornecedores?.endereco || '-'} | IE: {nota.fornecedores?.inscricao_estadual || '-'}</p></div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR: HISTORY & FILES */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-600" /> Arquivos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-between" disabled={nota.situacao_consulta !== 'XML Disponível'} onClick={downloadFile}>
                <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-orange-500" /> Download XML</span>
                <Download className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="outline" className="w-full justify-between" disabled={nota.situacao_consulta !== 'XML Disponível'} onClick={downloadFile}>
                <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-red-500" /> Download PDF (DANFE)</span>
                <Download className="w-4 h-4 text-muted-foreground" />
              </Button>
              {nota.situacao_consulta !== 'XML Disponível' && (
                <p className="text-xs text-muted-foreground text-center mt-2">Arquivos disponíveis apenas após manifestação ou consulta SEFAZ bem-sucedida.</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardHeader className="py-4 border-b border-border bg-muted/50">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[400px] overflow-y-auto">
              {historico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem histórico registrado.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-border space-y-6 mt-2 ml-2">
                  {historico.map((h, i) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{h.acao}</span>
                        {h.detalhes && <span className="text-xs text-muted-foreground mt-0.5">{h.detalhes}</span>}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{formatDate(h.created_at, true)}</span>
                          <span>•</span>
                          <span>{h.users?.nome || 'Sistema'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}