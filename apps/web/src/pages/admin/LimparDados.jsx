import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Trash2, AlertTriangle, ShieldAlert, ArrowLeft, Loader2, DatabaseBackup, Info } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LimparDados() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, company_id, companyIdSource, role, isSuperAdmin, logout } = useAuthContext();

  const [confirmed, setConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [logs, setLogs] = useState([]);

  // --- Seleção manual de empresa (apenas superadmin) ---
  const [empresas, setEmpresas] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  // company_id efetivo: selecionado manualmente (superadmin) ou do perfil (usuário normal)
  const effectiveCompanyId = isSuperAdmin ? selectedCompanyId : company_id;

  const hasAccess = isSuperAdmin || role === 'admin';

  const appendLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time: timestamp, message, type }]);

    if (type === 'error') {
      console.error(`[LimparDados] ${message}`);
    } else {
      console.log(`[LimparDados] ${message}`);
    }
  };

  // Buscar lista de empresas se for superadmin
  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingEmpresas(true);
      supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia')
        .order('razao_social', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error('[LimparDados] Erro ao buscar empresas:', error.message);
          } else if (data) {
            setEmpresas(data);
          }
          setLoadingEmpresas(false);
        });
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (hasAccess) {
      appendLog(`Página carregada. Usuário ID: ${user?.id}`);
      if (isSuperAdmin) {
        appendLog('Usuário é Superadmin. Selecione manualmente a empresa para limpar.', 'warning');
      } else if (company_id) {
        appendLog(`Company ID ativo: ${company_id} (Fonte: ${companyIdSource || 'desconhecida'})`, 'success');
      } else {
        appendLog('Company ID NÃO encontrado. Fontes verificadas.', 'error');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, company_id, companyIdSource, hasAccess, isSuperAdmin]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground mb-6">Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => navigate('/')}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  // Ordered list of tables to avoid FK constraint errors during deletion
  const tablesToClear = [
    // 1. Indirect children (Requires fetching parent IDs)
    { name: 'nfe_produtos_itens', type: 'indirect', parentTable: 'nfe_produtos', parentIdCol: 'empresa_id', fkCol: 'nfe_produto_id' },
    { name: 'contas_pagar_parcelas', type: 'indirect', parentTable: 'contas_pagar', parentIdCol: 'company_id', fkCol: 'contas_pagar_id' },
    { name: 'fechamento_etapas', type: 'indirect', parentTable: 'fechamentos_contabeis', parentIdCol: 'empresa_id', fkCol: 'fechamento_id' },

    // 2. Direct children
    { name: 'orcamento_itens', col: 'company_id' },
    { name: 'pedidos_venda_itens', col: 'company_id' },
    { name: 'pedidos_compra_itens', col: 'company_id' },
    { name: 'notas_fiscais_itens', col: 'company_id' },
    { name: 'fichas_custo_itens', col: 'company_id' },
    { name: 'f5_checklists', col: 'company_id' },
    { name: 'f5_entregaveis', col: 'company_id' },
    { name: 'f5_kpis', col: 'company_id' },
    { name: 'cobranca_historico_integrated', col: 'company_id' },
    { name: 'cobranca_historico', col: 'company_id' },
    { name: 'contas_pagar_baixas', col: 'company_id' },
    { name: 'contas_receber_baixas', col: 'company_id' },
    { name: 'projetos_cards', col: 'company_id' },

    // 3. Mid-level entities
    { name: 'f5_etapas', col: 'company_id' },
    { name: 'projetos_kanban', col: 'company_id' },
    { name: 'cobranca', col: 'company_id' },
    { name: 'notas_manifestacao', col: 'empresa_id' },
    { name: 'entradas_estoque', col: 'company_id' },
    { name: 'orcamentos', col: 'company_id' },
    { name: 'pedidos_venda', col: 'company_id' },
    { name: 'pedidos_compra', col: 'company_id' },
    { name: 'notas_fiscais_entrada', col: 'company_id' },
    { name: 'nfe_produtos', col: 'empresa_id' },
    { name: 'nfse_servicos', col: 'empresa_id' },
    { name: 'notas_entrada', col: 'empresa_id' },
    { name: 'fichas_custo', col: 'company_id' },
    { name: 'extrato_bancario', col: 'company_id' },
    { name: 'conciliacoes_bancarias', col: 'company_id' },
    { name: 'documentos_contabilidade', col: 'empresa_id' },
    { name: 'fechamentos_contabeis', col: 'empresa_id' },
    { name: 'apuracao_impostos', col: 'empresa_id' },
    { name: 'balancete_dados', col: 'empresa_id' },
    { name: 'dre_dados', col: 'empresa_id' },
    { name: 'pendencias_contabeis', col: 'empresa_id' },

    // 4. Base transactions & projects
    { name: 'f5_projetos', col: 'company_id' },
    { name: 'projetos', col: 'company_id' },
    { name: 'contas_pagar', col: 'company_id' },
    { name: 'contas_receber', col: 'company_id' },
    { name: 'lancamentos_contabeis', col: 'empresa_id' },
    { name: 'movimentacoes_financeiras', col: 'company_id' },
    { name: 'fluxo_caixa_movimentacoes', col: 'company_id' },

    // 5. Cadastros
    { name: 'produtos', col: 'company_id' },
    { name: 'servicos', col: 'company_id' },
    { name: 'subcategorias', col: 'company_id' },
    { name: 'clientes', col: 'company_id' },
    { name: 'fornecedores', col: 'company_id' },
    { name: 'bancos', col: 'company_id' },
    { name: 'categorias', col: 'company_id' },
    { name: 'contas_contabeis', col: 'empresa_id' },
    { name: 'centros_custo', col: 'company_id' },
    { name: 'tipos_pagamento', col: 'company_id' },
    { name: 'condicoes_pagamento', col: 'company_id' },
    { name: 'tipos_documento', col: 'company_id' },
    { name: 'origens', col: 'company_id' },
    { name: 'dre_linhas', col: 'company_id' },
    { name: 'fluxo_caixa_config_categorias', col: 'company_id' },
    { name: 'nfse_config', col: 'empresa_id' }
  ];

  const deleteAllCompanyData = async () => {
    if (!effectiveCompanyId) {
      appendLog('Tentativa de exclusão bloqueada: ID da empresa não encontrado.', 'error');
      toast({
        variant: 'destructive',
        title: 'Operação Bloqueada',
        description: 'Selecione uma empresa antes de continuar.',
      });
      return;
    }

    setIsDeleting(true);
    setProgressValue(0);
    setLogs([]);
    appendLog(`Iniciando exclusão em lote para company_id: ${effectiveCompanyId}`, 'warning');

    try {
      let completed = 0;
      const total = tablesToClear.length;

      for (const table of tablesToClear) {
        setProgressText(`Limpando tabela ${table.name}... (${completed + 1}/${total})`);
        appendLog(`Deletando registros de ${table.name}...`);

        try {
          if (table.type === 'indirect') {
            const { data: parents, error: parentError } = await supabase
              .from(table.parentTable)
              .select('id')
              .eq(table.parentIdCol, effectiveCompanyId);

            if (parentError) throw parentError;

            if (parents && parents.length > 0) {
              const parentIds = parents.map(p => p.id);
              const batchSize = 200;
              for (let i = 0; i < parentIds.length; i += batchSize) {
                const batch = parentIds.slice(i, i + batchSize);
                const { error: delError } = await supabase
                  .from(table.name)
                  .delete()
                  .in(table.fkCol, batch);
                if (delError) throw delError;
              }
              appendLog(`Sucesso: ${table.name} (limpeza indireta via ${table.parentTable})`, 'success');
            } else {
              appendLog(`Ignorado: ${table.name} (nenhum parente encontrado em ${table.parentTable})`);
            }
          } else {
            const { error: directError } = await supabase
              .from(table.name)
              .delete()
              .eq(table.col, effectiveCompanyId);

            if (directError) throw directError;
            appendLog(`Sucesso: ${table.name} (limpeza direta)`, 'success');
          }
        } catch (err) {
          appendLog(`Erro ao limpar ${table.name}: ${err.message}`, 'error');
        }

        completed++;
        setProgressValue((completed / total) * 100);
      }

      appendLog('Registrando no audit_logs a ação de limpeza...');
      await supabase.from('audit_logs').insert({
        company_id: effectiveCompanyId,
        user_id: user.id,
        acao: 'LIMPEZA_DADOS_EMPRESA',
        tabela: 'Multiplas',
        valores_novos: { status: 'DELETED', total_tables: total },
      });

      appendLog('Limpeza finalizada com sucesso!', 'success');

      toast({
        title: 'Sucesso!',
        description: 'Dados limpados com sucesso!',
        className: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
      });

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      appendLog(`Erro fatal durante o processo: ${error.message}`, 'error');
      toast({
        variant: 'destructive',
        title: 'Erro Crítico',
        description: error.message || 'Ocorreu um erro inesperado durante a exclusão.',
      });
    } finally {
      setIsDeleting(false);
      setProgressText('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <Helmet>
        <title>Limpar Dados | ERP Platform</title>
      </Helmet>

      <PageHeader
        title="Limpeza de Dados"
        description="Área administrativa para reset e limpeza de dados da empresa."
        backTo="/"
      />

      {/* Seletor manual de empresa — apenas para superadmin */}
      {isSuperAdmin && (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Selecionar Empresa (Superadmin)
            </CardTitle>
            <CardDescription>
              Como você é Superadmin e não está vinculado a nenhuma empresa específica,
              selecione manualmente qual empresa deseja limpar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingEmpresas ? 'Carregando empresas...' : 'Escolha uma empresa...'} />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.razao_social} {emp.nome_fantasia ? `(${emp.nome_fantasia})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyId && (
              <p className="text-xs text-muted-foreground mt-2">
                ID selecionado: <code className="bg-muted px-1 py-0.5 rounded">{selectedCompanyId}</code>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!effectiveCompanyId ? (
        <Alert variant="destructive" className="mb-6 border-2">
          <DatabaseBackup className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Empresa Não Identificada</AlertTitle>
          <AlertDescription className="text-base mt-2 flex flex-col gap-4">
            <p>
              {isSuperAdmin ? (
                <>Selecione uma empresa na lista acima para continuar.</>
              ) : (
                <>
                  O usuário não está associado a nenhuma empresa no sistema (
                  <code className="font-mono bg-destructive/10 px-1 py-0.5 rounded">company_id</code> nulo).
                  A operação de limpeza foi desativada por segurança.
                </>
              )}
            </p>
            {!isSuperAdmin && (
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Atualizar Página
                </Button>
                <Button variant="secondary" onClick={logout}>
                  Sair e Fazer Login Novamente
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-6 border-2 border-primary/20 bg-primary/5 text-primary-foreground">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-bold text-primary">Contexto de Empresa Ativo</AlertTitle>
          <AlertDescription className="text-base mt-2 text-primary/80">
            Você está prestes a limpar os dados vinculados ao <strong>Company ID:</strong>{' '}
            <code className="bg-primary/10 px-1 py-0.5 rounded">{effectiveCompanyId}</code>.
            <br />
            {isSuperAdmin
              ? 'Esta identificação foi selecionada manualmente.'
              : <>Esta identificação foi recuperada via: <span className="font-semibold text-primary">{companyIdSource}</span>.</>}
          </AlertDescription>
        </Alert>
      )}

      <Alert variant="destructive" className="mb-6 border-2">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Esta ação é irreversível!</AlertTitle>
        <AlertDescription className="text-base mt-2">
          Todos os dados e transações listados abaixo serão deletados permanentemente da empresa selecionada. Esta ação não poderá ser desfeita.
        </AlertDescription>
      </Alert>

      <Card className="border-destructive/20 shadow-sm">
        <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-4">
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Tabelas Afetadas
          </CardTitle>
          <CardDescription>
            Os dados pertencentes à empresa selecionada serão removidos em lote respeitando a hierarquia:
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-muted border rounded-md p-4 mb-6 max-h-40 overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap gap-2">
              {tablesToClear.map((t, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {logs.length > 0 && (
            <div className="mb-6 p-4 rounded-md bg-zinc-950 text-green-400 font-mono text-xs max-h-48 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className={`mb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-yellow-400' : ''}`}>
                  <span className="text-zinc-500">[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          )}

          {isDeleting ? (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">{progressText}</span>
                <span className="text-primary">{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          ) : (
            <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border border-border/50">
              <Checkbox
                id="confirm-delete"
                checked={confirmed}
                onCheckedChange={setConfirmed}
                disabled={!effectiveCompanyId}
                className="mt-1 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="confirm-delete"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-foreground"
                >
                  Tenho certeza que desejo deletar todos os dados
                </label>
                <p className="text-sm text-muted-foreground">
                  Compreendo que esta ação apaga todas as informações listadas definitivamente.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-muted px-6 py-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            disabled={isDeleting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!confirmed || isDeleting || !effectiveCompanyId}
            onClick={deleteAllCompanyData}
            className="gap-2 min-w-[180px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Limpando Dados...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Deletar Permanentemente
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}