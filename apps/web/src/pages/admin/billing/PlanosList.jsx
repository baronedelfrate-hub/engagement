import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import { Plus, Edit } from 'lucide-react';
import { listarPlanos } from '@/services/admin/billingService';

const PlanosList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setPlanos(await listarPlanos());
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar planos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Planos | ERP Platform</title></Helmet>
      <PageHeader
        title="Planos"
        description="Planos de assinatura oferecidos às empresas clientes da plataforma."
        action={
          <Button onClick={() => navigate('/admin/planos/novo')} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Plano
          </Button>
        }
      />
      <div className="p-6">
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))
              ) : planos.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum plano cadastrado.</TableCell></TableRow>
              ) : (
                planos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>R$ {Number(p.valor_mensal).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.descricao || '-'}</TableCell>
                    <TableCell><Badge variant={p.ativo ? 'default' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/admin/planos/${p.id}`)}>
                        <Edit className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default PlanosList;
