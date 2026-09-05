import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertCircle, PlayCircle, Eye } from 'lucide-react';
import { formatDate, formatCurrency, getStatusColor } from '../utils/FiscalDashboardUtils';
import { useToast } from '@/components/ui/use-toast';

export default function FiscalDashboardGrids({ data, loading }) {
  const { grids } = data;
  const { toast } = useToast();

  const handleAction = () => {
    toast({
      title: 'Ação Rápida',
      description: '🚧 This feature isn\'t implemented yet—but don\'t worry! You can request it in your next prompt! 🚀',
    });
  };

  const EmptyState = ({ message }) => (
    <TableRow>
      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
        {loading ? 'Carregando dados...' : message}
      </TableCell>
    </TableRow>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      
      {/* Últimas Emitidas */}
      <Card className="flex flex-col h-full">
        <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Últimas Notas Emitidas
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600" onClick={handleAction}>Ver Todas</Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-24">Nº NF</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grids.ultimasEmitidas.length === 0 ? <EmptyState message="Nenhuma nota emitida recentemente." /> : 
                grids.ultimasEmitidas.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={handleAction}>
                    <TableCell className="font-medium text-foreground">{item.numero || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(item.data)}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{item.cliente}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{item.tipo}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.valor)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${getStatusColor(item.status)}`} variant="outline">
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pendentes de Manifestação */}
      <Card className="flex flex-col h-full border-amber-200">
        <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between bg-amber-50/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4" />
            Notas Pendentes de Manifestação
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
            {grids.pendentesManifestacao.length} Pendentes
          </Badge>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-24">Nº NF</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Dias Pendente</TableHead>
                <TableHead className="text-center w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grids.pendentesManifestacao.length === 0 ? <EmptyState message="Nenhuma pendência de manifestação." /> : 
                grids.pendentesManifestacao.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.numero || '-'}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{item.fornecedor}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={item.dias_pendente > 30 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'} variant="outline">
                        {item.dias_pendente} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick={handleAction}>
                        Manifestar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Últimas Entradas */}
      <Card className="flex flex-col h-full">
        <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Últimas Notas de Entrada
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-emerald-600" onClick={handleAction}>Ver Todas</Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-24">Nº NF</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grids.ultimasEntrada.length === 0 ? <EmptyState message="Nenhuma nota de entrada recente." /> : 
                grids.ultimasEntrada.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.numero || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(item.data)}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{item.fornecedor}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.valor)}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${getStatusColor(item.status_manifestacao)}`} variant="outline">
                        {item.status_manifestacao}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleAction}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pendências Fiscais/Contábeis */}
      <Card className="flex flex-col h-full border-red-200">
        <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between bg-red-50/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-800">
            <PlayCircle className="w-4 h-4" />
            Pendências Fiscais e Contábeis
          </CardTitle>
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            {grids.pendenciasFiscais.length} Itens
          </Badge>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Resp.</TableHead>
                <TableHead className="text-center w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grids.pendenciasFiscais.length === 0 ? <EmptyState message="Tudo certo! Nenhuma pendência fiscal." /> : 
                grids.pendenciasFiscais.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.tipo}</TableCell>
                    <TableCell className="truncate max-w-[200px] text-sm">{item.descricao}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(item.data)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.responsavel}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground bg-muted hover:bg-accent" onClick={handleAction}>
                        Resolver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}