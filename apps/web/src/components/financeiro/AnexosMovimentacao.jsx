import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Loader2, Receipt, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';

const BUCKET = 'movimentacao-docs';
const MAX_MB = 10;
// 'nota' é o tipo antigo dos anexos feitos na criação do título: conta como documento.
export const ehComprovante = (d) => d.tipo_documento === 'comprovante';

const Bloco = ({ titulo, dica, icone: Icone, tipo, docs, enviando, onEnviar, onBaixar, onExcluir, editavel }) => (
  <div>
    <Label className="text-muted-foreground flex items-center gap-1.5"><Icone className="h-4 w-4" />{titulo}</Label>
    {docs.length === 0 ? <p className="text-sm text-muted-foreground mt-1">{dica}</p> : (
      <div className="space-y-2 mt-2">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-2 border border-border rounded-md">
            <div className="flex items-center gap-2 overflow-hidden"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="text-sm truncate">{doc.nome_arquivo}</span>{doc.baixa && <span className="text-[11px] text-muted-foreground whitespace-nowrap">· baixa de {String(doc.baixa.data_baixa).slice(0, 10).split('-').reverse().join('/')}</span>}</div>
            <div className="flex shrink-0">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onBaixar(doc)} title="Abrir / baixar"><Download className="h-4 w-4" /></Button>
              {editavel && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onExcluir(doc)} title="Remover"><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
      </div>
    )}
    {editavel && (
      <label className="mt-2 inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
        {enviando === tipo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {enviando === tipo ? 'Enviando...' : 'Anexar arquivo'}
        <input type="file" multiple accept="application/pdf,image/*" className="hidden" disabled={!!enviando}
          onChange={(e) => { onEnviar(tipo, Array.from(e.target.files || [])); e.target.value = ''; }} />
      </label>
    )}
  </div>
);

// Dois campos de anexo da movimentação: documentos (notas, recibos, boletos) e comprovante de pagamento.
const AnexosMovimentacao = ({ movimentacaoId, companyId, editavel = true, onChange }) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [docs, setDocs] = useState([]);
  const [enviando, setEnviando] = useState(null);

  const carregar = useCallback(async () => {
    if (!movimentacaoId) return;
    const { data } = await supabase.from('movimentacao_documentos').select('*, baixa:movimentacao_baixas(data_baixa, valor_baixa)').eq('movimentacao_id', movimentacaoId).order('created_at');
    setDocs(data || []);
  }, [movimentacaoId]);
  useEffect(() => { carregar(); }, [carregar]);

  const enviar = async (tipo, arquivos) => {
    if (!arquivos.length) return;
    setEnviando(tipo);
    try {
      for (const f of arquivos) {
        if (f.size > MAX_MB * 1024 * 1024) { toast({ title: 'Arquivo grande demais', description: `${f.name} passa de ${MAX_MB} MB.`, variant: 'destructive' }); continue; }
        const ext = (f.name.split('.').pop() || 'pdf').toLowerCase();
        const caminho = `${companyId}/${movimentacaoId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await supabase.storage.from(BUCKET).upload(caminho, f);
        if (up.error) throw up.error;
        const ins = await supabase.from('movimentacao_documentos').insert({ movimentacao_id: movimentacaoId, company_id: companyId, tipo_documento: tipo, nome_arquivo: f.name, storage_path: caminho, created_by: user?.id });
        if (ins.error) throw ins.error;
      }
      await carregar(); onChange?.();
      toast({ title: tipo === 'comprovante' ? 'Comprovante anexado' : 'Documento anexado' });
    } catch (e) { toast({ title: 'Não foi possível anexar', description: e.message, variant: 'destructive' }); }
    finally { setEnviando(null); }
  };
  const baixar = async (doc) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.storage_path, 120);
    if (error || !data?.signedUrl) return toast({ title: 'Erro', description: 'Não foi possível abrir o arquivo.', variant: 'destructive' });
    window.open(data.signedUrl, '_blank');
  };
  const excluir = async (doc) => {
    if (!window.confirm(`Remover "${doc.nome_arquivo}"?`)) return;
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    const { error } = await supabase.from('movimentacao_documentos').delete().eq('id', doc.id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    await carregar(); onChange?.();
  };

  const comuns = { enviando, onEnviar: enviar, onBaixar: baixar, onExcluir: excluir, editavel };
  return (
    <div className="space-y-4">
      <Bloco {...comuns} tipo="nota" titulo="Documentos (notas, recibos, boletos)" dica="Nenhum documento anexado." icone={FileText} docs={docs.filter((d) => !ehComprovante(d))} />
      <Bloco {...comuns} tipo="comprovante" titulo="Comprovante de pagamento" dica="Nenhum comprovante anexado." icone={Receipt} docs={docs.filter(ehComprovante)} />
    </div>
  );
};
export default AnexosMovimentacao;
