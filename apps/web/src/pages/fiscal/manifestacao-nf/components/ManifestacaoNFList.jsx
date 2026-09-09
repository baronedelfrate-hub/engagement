import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, FileText, CheckCircle2, Download, Import, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate, getStatusManifestacaoColor, getSituacaoConsultaColor, canImport } from '../utils/manifestacaoNFUtils';
import { manifestacaoNFService } from '../services/manifestacaoNFService';
import { useToast } from '@/components/ui/use-toast';
import { ModalManifestar } from './ManifestacaoNFActions';

export default function ManifestacaoNFList({ data, loading, onRefresh }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [manifestarNota, setManifestarNota] = useState(null);

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) setSelectedIds([]);
    else setSelectedIds(data.map(d => d.id));
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(x => x !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const handleConsultarLote = async () => {
    if (selectedIds.length === 0) return;
    setLoadingBatch(true);
    try {
      await manifestacaoNFService.consultarSefaz(selectedIds);
      toast({ title: 'Sucesso', description: 'Lote consultado na SEFAZ com sucesso.' });
      onRefresh();
      setSelectedIds([]);
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleImportClick = async (e, nota) => {
    e.stopPropagation();
    try {
      await manifestacaoNFService.importarParaEntrada(nota);
      toast({ title: 'Sucesso', description: 'Nota importada. Acesse Entrada de NF para concluir.' });
      onRefresh();
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="shadow-sm border-border">
      
      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">{selectedIds.length} notas selecionadas</span>
          <Button size="sm" onClick={handleConsultarLote} disabled={loadingBatch} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loadingBatch ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Consultar SEFAZ em Lote
          </Button>
        </div>
      )}

      <CardContent className="p-0 overflow-auto">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox checked={data.length > 0 && selectedIds.length === data.length} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Chave / Número</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-center">Situação</TableHead>
              <TableHead className="text-center">Manifestação</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" /></TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  Nenhuma nota encontrada.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/80 transition-colors group"
                  onClick={() => navigate(`/fiscal/manifestacao-nf/${item.id}`)}
                >
                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground text-xs tracking-tight">{item.chave_acesso}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">NF: {item.numero} {item.serie ? `(Série ${item.serie})` : ''}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground truncate max-w-[200px]" title={item.fornecedores?.nome || item.fornecedor_nome}>
                      {item.fornecedores?.nome || item.fornecedor_nome || 'N/I'}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.fornecedores?.cnpj || item.fornecedor_cnpj}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.data_emissao)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.valor_total)}</TableCell>
                  
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-normal text-[10px] ${getSituacaoConsultaColor(item.situacao_consulta)}`}>
                      {item.situacao_consulta}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <Badge variant="outline" className={`font-normal text-[10px] ${getStatusManifestacaoColor(item.status_manifestacao)}`}>
                      {item.status_manifestacao}
                    </Badge>
                    {item.importado_entrada && (
                      <div className="mt-1 flex justify-center"><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">Importado</Badge></div>
                    )}
                  </TableCell>

                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-center items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => navigate(`/fiscal/manifestacao-nf/${item.id}`)} title="Ver Detalhes">
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {item.status_manifestacao !== 'Confirmação' && item.status_manifestacao !== 'Desconhecimento' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => setManifestarNota(item)} title="Manifestar">
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}

                      {canImport(item.situacao_consulta, item.status_manifestacao, item.importado_entrada) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={(e) => handleImportClick(e, item)} title="Importar para Entrada">
                          <Import className="w-4 h-4" />
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

      <ModalManifestar 
        isOpen={!!manifestarNota} 
        onClose={() => setManifestarNota(null)} 
        nota={manifestarNota}
        onSuccess={onRefresh}
      />
    </Card>
  );
}