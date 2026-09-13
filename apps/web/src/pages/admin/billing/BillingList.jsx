import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import { Receipt, Plus, CheckCircle2, XCircle } from 'lucide-react';
import {
  listarAssinaturas, listarPlanos, salvarAssinatura,
  listarFaturas, criarFatura, marcarFaturaPaga, cancelarFatura,
} from '@/services/admin/billingService';

const STATUS_LABEL = {
  trial: { label: 'Trial', variant: 'outline' },
  ativa: { label: 'Ativa', variant: 'success' },
  inadimplente: { label: 'Inadimplente', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'secondary' },
};

const FATURA_LABEL = {
  pendente: { label: 'Pendente', variant: 'outline' },
  pago: { label: 'Pago', variant: 'success' },
  atrasado: { label: 'Atrasado', variant: 'destructive' },
  cancelado: { label: 'Cancelado', variant: 'secondary' },
};

const BillingList = () => {
  const { toast } = useToast();
  const [assinaturas, setAssinaturas] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([listarAssinaturas(), listarPlanos()]);
      setAssinaturas(a);
      setPlanos(p);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar assinaturas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (assinatura, status) => {
    try {
      await salvarAssinatura(assinatura.empresa_id, { status });
      toast({ title: 'Atualizado', description: `Status da ${assinatura.empresa?.nome_fantasia || assinatura.empresa?.razao_social} alterado.` });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handlePlanoChange = async (assinatura, plano_id) => {
    try {
      await salvarAssinatura(assinatura.empresa_id, { plano_id });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Helmet><title>Faturamento | ERP Platform</title></Helmet>
      <PageHeader
        title="Faturamento"
        description="Status de assinatura e faturas de cada empresa cliente da plataforma."
      />

      <div className="p-6 space-y-6">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-[180px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[140px]" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : assinaturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Nenhuma assinatura cadastrada ainda.
                  </TableCell>
                </TableRow>
              ) : (
                assinaturas.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.empresa?.nome_fantasia || a.empresa?.razao_social || 'Empresa removida'}</TableCell>
                    <TableCell>
                      <Select value={a.plano_id || ''} onValueChange={(v) => handlePlanoChange(a, v)}>
                        <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Sem plano" /></SelectTrigger>
                        <SelectContent>
                          {planos.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome} — R$ {Number(p.valor_mensal).toFixed(2)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={a.status} onValueChange={(v) => handleStatusChange(a, v)}>
                        <SelectTrigger className="w-[150px] h-9">
                          <Badge variant={STATUS_LABEL[a.status]?.variant}>{STATUS_LABEL[a.status]?.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(a)}>
                        <Receipt className="h-4 w-4 mr-1" /> Faturas
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selected && (
        <FaturasDialog
          assinatura={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

const FaturasDialog = ({ assinatura, onClose }) => {
  const { toast } = useToast();
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaFatura, setNovaFatura] = useState({
    competencia: new Date().toISOString().slice(0, 7) + '-01',
    valor: assinatura.plano?.valor_mensal || '',
    vencimento: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchFaturas(); }, []);

  const fetchFaturas = async () => {
    setLoading(true);
    try {
      const data = await listarFaturas(assinatura.id);
      setFaturas(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar faturas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCriar = async () => {
    if (!novaFatura.competencia || !novaFatura.valor || !novaFatura.vencimento) {
      toast({ title: 'Erro', description: 'Preencha competência, valor e vencimento.', variant: 'destructive' });
      return;
    }
    try {
      await criarFatura({
        assinatura_id: assinatura.id,
        empresa_id: assinatura.empresa_id,
        competencia: novaFatura.competencia,
        valor: novaFatura.valor,
        vencimento: novaFatura.vencimento,
      });
      toast({ title: 'Fatura criada' });
      fetchFaturas();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleMarcarPaga = async (id) => {
    try {
      await marcarFaturaPaga(id, 'Manual');
      fetchFaturas();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleCancelar = async (id) => {
    try {
      await cancelarFatura(id);
      fetchFaturas();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Faturas — {assinatura.empresa?.nome_fantasia || assinatura.empresa?.razao_social}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 items-end border-b border-border pb-4">
          <div className="space-y-1">
            <Label className="text-xs">Competência</Label>
            <Input type="date" value={novaFatura.competencia} onChange={(e) => setNovaFatura(p => ({ ...p, competencia: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor</Label>
            <Input type="number" step="0.01" value={novaFatura.valor} onChange={(e) => setNovaFatura(p => ({ ...p, valor: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vencimento</Label>
            <Input type="date" value={novaFatura.vencimento} onChange={(e) => setNovaFatura(p => ({ ...p, vencimento: e.target.value }))} />
          </div>
          <div className="col-span-3">
            <Button size="sm" onClick={handleCriar} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Fatura
            </Button>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : faturas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma fatura ainda.</TableCell></TableRow>
              ) : (
                faturas.map(f => (
                  <TableRow key={f.id}>
                    <TableCell>{new Date(f.competencia + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}</TableCell>
                    <TableCell>R$ {Number(f.valor).toFixed(2)}</TableCell>
                    <TableCell>{new Date(f.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell><Badge variant={FATURA_LABEL[f.status]?.variant}>{FATURA_LABEL[f.status]?.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      {f.status === 'pendente' || f.status === 'atrasado' ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleMarcarPaga(f.id)} title="Marcar como paga">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancelar(f.id)} title="Cancelar">
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillingList;
