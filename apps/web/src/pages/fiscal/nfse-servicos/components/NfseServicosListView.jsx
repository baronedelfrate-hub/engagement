import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Copy, FileText, Loader2, CheckCircle2, MapPin, Download } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '../utils/nfseUtils';
import { useToast } from '@/components/ui/use-toast';
import { nfseServicosService } from '../services/nfseServicosService';
import { supabase } from '@/lib/customSupabaseClient';

export default function NfseServicosListView({ data, loading, onRefresh }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await nfseServicosService.duplicateNfseServico(id, user);
      toast({ title: 'Sucesso', description: 'NFS-e duplicada com sucesso.' });
      onRefresh();
    } catch (err) {
      toast({ title: 'Erro', description: err.message || 'Falha ao duplicar NFS-e.', variant: 'destructive' });
    }
  };

  const handleDownloadPdf = (e) => {
    e.stopPropagation();
    toast({ title: 'Download Iniciado', description: 'O PDF da NFS-e está sendo baixado.' });
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-24">Número / RPS</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Data Emissão</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Nenhuma NFS-e encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                  onClick={() => navigate(`/fiscal/nfse-servicos/${item.id}`)}
                >
                  <TableCell>
                    <div className="font-medium text-slate-800">{item.numero || 'S/N'}{item.serie ? `-${item.serie}` : ''}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">RPS: {item.rps || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-800 truncate max-w-[200px]" title={item.clientes?.nome}>
                      {item.clientes?.nome || 'N/I'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {item.municipios?.nome || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{formatDate(item.data_emissao)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.valor_liquido || item.valor_servico)}</TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-normal text-[10px] ${getStatusColor(item.status)}`}>
                      {item.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600" onClick={() => navigate(`/fiscal/nfse-servicos/${item.id}`)} title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(item.status === 'Em digitação' || item.status === 'Rejeitada') && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600" onClick={() => navigate(`/fiscal/nfse-servicos/${item.id}/editar`)} title="Editar">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900" onClick={(e) => handleDuplicate(e, item.id)} title="Duplicar">
                        <Copy className="w-4 h-4" />
                      </Button>
                      {item.status === 'Emitida' && (
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-orange-600" onClick={handleDownloadPdf} title="Download PDF">
                           <Download className="w-4 h-4" />
                         </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}