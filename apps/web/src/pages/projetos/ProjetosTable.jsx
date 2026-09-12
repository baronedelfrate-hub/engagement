import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, Trash2 } from "lucide-react";

export default function ProjetosTable({ projetos, loading, onDelete }) {
  const navigate = useNavigate();

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'planejamento': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800';
      case 'em andamento': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800';
      case 'pausado': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'concluído': return 'bg-muted text-foreground border-border';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-muted text-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!projetos || projetos.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground bg-background rounded-lg border">
        Nenhum projeto encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Término</TableHead>
            <TableHead>Orçamento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projetos.map((projeto) => (
            <TableRow key={projeto.id}>
              <TableCell className="font-medium">{projeto.nome}</TableCell>
              <TableCell>{projeto.cliente?.nome || '-'}</TableCell>
              <TableCell>{formatDate(projeto.data_inicio)}</TableCell>
              <TableCell>{formatDate(projeto.data_fim)}</TableCell>
              <TableCell>{formatCurrency(projeto.orcamento)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusColor(projeto.status)}>
                  {projeto.status || 'Planejamento'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/operacao/projeto/${projeto.id}`)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
                      onDelete(projeto.id);
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}