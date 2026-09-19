import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { lerArquivoPlano, baixarModeloPlano } from '@/lib/planoContasService';
import { GRUPOS_DRE_LABELS } from '@/lib/planoContas';
import { useToast } from '@/components/ui/use-toast';

export default function ImportarPlanoContasDialog({ open, onOpenChange, empresaNome, onImportar }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [lendo, setLendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [arquivo, setArquivo] = useState(null);
  const [abas, setAbas] = useState([]);
  const [abaAtual, setAbaAtual] = useState(null);
  const [resumo, setResumo] = useState(null);

  const reiniciar = () => {
    setArquivo(null);
    setAbas([]);
    setAbaAtual(null);
    setResumo(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const fechar = (aberto) => {
    if (!aberto) reiniciar();
    onOpenChange(aberto);
  };

  const escolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendo(true);
    setResumo(null);
    try {
      const leitura = await lerArquivoPlano(file);
      setArquivo(file);
      setAbas(leitura.abas);
      setAbaAtual(leitura.sugerida);
      if (!leitura.sugerida) {
        toast({ title: 'Nenhuma conta encontrada', description: 'Use linhas no formato "1.1.01 Nome da conta". Baixe o modelo para ver um exemplo.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('[ImportarPlanoContasDialog] Falha ao ler o arquivo:', err);
      toast({ title: 'Erro', description: 'Não foi possível ler o arquivo. Use .xlsx, .xls ou .csv.', variant: 'destructive' });
      reiniciar();
    } finally {
      setLendo(false);
    }
  };

  const aba = abas.find(a => a.nome === abaAtual);
  const plano = aba?.plano;

  const importar = async () => {
    if (!plano) return;
    setImportando(true);
    try {
      const r = await onImportar(plano);
      setResumo(r);
      toast({ title: 'Plano importado', description: 'As contas foram criadas e já aparecem no Financeiro e na Contabilidade.' });
    } catch (err) {
      console.error('[ImportarPlanoContasDialog] Falha ao importar:', err);
      toast({ title: 'Erro ao importar', description: err.message || 'Não foi possível importar o plano.', variant: 'destructive' });
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar plano de contas do Excel</DialogTitle>
          <DialogDescription>
            Empresa: <strong>{empresaNome || '—'}</strong>. Contas que já existem (pelo código) são mantidas; só as que faltam são criadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={escolherArquivo} className="hidden" />
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={lendo || importando}>
              {lendo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {arquivo ? 'Trocar arquivo' : 'Escolher arquivo'}
            </Button>
            <Button variant="ghost" onClick={baixarModeloPlano}>
              <Download className="w-4 h-4 mr-2" /> Baixar modelo
            </Button>
            {arquivo && (
              <span className="flex items-center text-sm text-muted-foreground">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> {arquivo.name}
              </span>
            )}
          </div>

          {abas.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Aba:</span>
              {abas.map(a => (
                <Button
                  key={a.nome}
                  size="sm"
                  variant={a.nome === abaAtual ? 'default' : 'outline'}
                  onClick={() => { setAbaAtual(a.nome); setResumo(null); }}
                >
                  {a.nome} <span className="ml-1 opacity-70">({a.itens.length})</span>
                </Button>
              ))}
            </div>
          )}

          {plano && !resumo && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">{plano.contas.length} contas</Badge>
                <Badge variant="outline">{plano.categorias.length} categorias</Badge>
                <Badge variant="outline">{plano.subcategorias.length} subcategorias</Badge>
                {plano.calculadas.length > 0 && (
                  <Badge variant="secondary" title={plano.calculadas.map(c => `${c.codigo} ${c.nome}`).join(' • ')}>
                    {plano.calculadas.length} totais calculados (fora do plano)
                  </Badge>
                )}
                {aba.ignoradas.length > 0 && (
                  <Badge variant="secondary" title={aba.ignoradas.map(i => `L${i.linha}: ${i.texto}`).join('\n')}>
                    {aba.ignoradas.length} linhas ignoradas (comentários/títulos)
                  </Badge>
                )}
              </div>

              <div className="border rounded-md max-h-72 overflow-auto bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Linha da DRE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plano.contas.map(c => (
                      <TableRow key={c.codigo}>
                        <TableCell className="font-mono text-xs" style={{ paddingLeft: `${(c.nivel - 1) * 14 + 12}px` }}>{c.codigo}</TableCell>
                        <TableCell className={c.analitica ? '' : 'font-semibold'}>{c.nome}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.analitica ? 'Analítica' : 'Sintética'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.grupo_dre ? GRUPOS_DRE_LABELS[c.grupo_dre] : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {resumo && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-4 text-sm space-y-1">
              <p className="flex items-center font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Importação concluída
              </p>
              <p>Contas: <strong>{resumo.contas.novas}</strong> novas, {resumo.contas.existentes} já existiam.</p>
              <p>Categorias: <strong>{resumo.categorias.novas}</strong> novas, {resumo.categorias.existentes} já existiam.</p>
              <p>Subcategorias: <strong>{resumo.subcategorias.novas}</strong> novas, {resumo.subcategorias.existentes} já existiam.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => fechar(false)}>{resumo ? 'Fechar' : 'Cancelar'}</Button>
          {!resumo && (
            <Button onClick={importar} disabled={!plano || plano.contas.length === 0 || importando}>
              {importando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importar {plano ? `${plano.contas.length} contas` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
