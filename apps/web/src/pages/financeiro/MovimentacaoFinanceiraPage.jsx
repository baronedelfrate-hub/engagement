import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Pencil, Trash, Loader2, AlertCircle, Search, Eye } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MovimentacaoFinanceiraPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company_id, loading: authLoading } = useAuthContext();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    if (authLoading) return; // Aguarda o contexto de autenticação carregar completamente

    if (company_id) {
      console.log('[MovimentacaoFinanceiraPage] company_id verificado com sucesso:', company_id);
      loadData();
    } else {
      console.warn('[MovimentacaoFinanceiraPage] Nenhum company_id disponível. A query de movimentações não será executada.');
      setLoading(false);
      setData([]);
    }
  }, [company_id, authLoading, filtroTipo, filtroStatus, dateStart, dateEnd]);

  const loadData = async () => {
    if (!company_id) return;

    setLoading(true);
    setError(null);
    console.log(`[MovimentacaoFinanceiraPage] Executando query para empresa: ${company_id}`);

    try {
      let query = supabase
        .from('movimentacao_financeira')
        .select(`
          id,
          numero_titulo,
          tipo,
          valor_total,
          data_vencimento,
          status,
          cliente:clientes(nome),
          fornecedor:fornecedores(nome)
        `)
        .eq('company_id', company_id)
        .order('data_vencimento', { ascending: true });

      if (filtroTipo !== 'Todos') {
        query = query.eq('tipo', filtroTipo);
      }
      if (filtroStatus !== 'Todos') {
        query = query.eq('status', filtroStatus);
      }
      if (dateStart) {
        query = query.gte('data_vencimento', dateStart);
      }
      if (dateEnd) {
        query = query.lte('data_vencimento', dateEnd);
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      console.log(`[MovimentacaoFinanceiraPage] Query finalizada. ${result?.length || 0} registros retornados.`);
      setData(result || []);
    } catch (err) {
      console.error('[MovimentacaoFinanceiraPage] Erro ao carregar movimentações:', err);
      setError(err.message);
      toast({ title: "Erro", description: "Não foi possível carregar as movimentações.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!company_id) return;
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    
    try {
      const { error: deleteError } = await supabase
        .from('movimentacao_financeira')
        .delete()
        .eq('id', id)
        .eq('company_id', company_id);

      if (deleteError) throw deleteError;
      toast({ title: "Sucesso", description: "Movimentação excluída com sucesso." });
      loadData();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    const entidade = (item.tipo?.toLowerCase() === 'receber' ? item.cliente?.nome : item.fornecedor?.nome) || '';
    return (
      (item.numero_titulo || '').toLowerCase().includes(term) ||
      entidade.toLowerCase().includes(term)
    );
  });

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verificando permissões da empresa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Movimentação Financeira" 
        description="Gestão unificada de contas a pagar e receber."
        action={
          <Button 
            onClick={() => navigate('/movimentacao-financeira/nova')} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!company_id}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Movimentação
          </Button>
        }
      />
      
      {!company_id ? (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nenhuma Empresa Associada</AlertTitle>
          <AlertDescription>
            Seu usuário não possui uma empresa (company_id) associada. Por favor, contate o administrador do sistema para configurar seu perfil corretamente antes de acessar as movimentações financeiras.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número ou entidade..."
                className="pl-9 bg-background border-border text-foreground"
              />
            </div>

            <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[140px] bg-background border-border text-foreground">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Tipos</SelectItem>
                  <SelectItem value="pagar">A Pagar</SelectItem>
                  <SelectItem value="receber">A Receber</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[140px] bg-background border-border text-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Status</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-[140px] bg-background border-border text-foreground text-sm block"
                  title="Data Vencimento Inicial"
                />
                <span className="text-muted-foreground">até</span>
                <Input 
                  type="date" 
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-[140px] bg-background border-border text-foreground text-sm block"
                  title="Data Vencimento Final"
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar dados</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Nº Título</th>
                    <th className="px-6 py-3 font-medium">Tipo</th>
                    <th className="px-6 py-3 font-medium">Cliente/Fornecedor</th>
                    <th className="px-6 py-3 font-medium">Vencimento</th>
                    <th className="px-6 py-3 font-medium">Valor</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Buscando movimentações...</p>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">
                        Nenhuma movimentação encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-foreground">{row.numero_titulo}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={row.tipo?.toUpperCase() === 'PAGAR' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'}>
                            {row.tipo?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-foreground">
                          {row.tipo?.toLowerCase() === 'receber' ? (row.cliente?.nome || '-') : (row.fornecedor?.nome || '-')}
                        </td>
                        <td className="px-6 py-4 text-foreground">
                          {row.data_vencimento ? new Date(row.data_vencimento).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground">
                          R$ {parseFloat(row.valor_total || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="capitalize text-foreground">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-border">
                              <DropdownMenuItem onClick={() => toast({ title: "Visualizar", description: "Função não implementada ainda." })}>
                                <Eye className="mr-2 h-4 w-4" /> Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast({ title: "Editar", description: "Função não implementada ainda." })}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(row.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MovimentacaoFinanceiraPage;