import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Download, Loader2, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { uploadFile, deleteFile } from '@/lib/supabaseStorage';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

const RHDocumentosUpload = ({ funcionarioId, tipoDocumento = "Geral", onUploadComplete, className }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    if (funcionarioId) fetchDocuments();
  }, [funcionarioId, tipoDocumento]);

  const fetchDocuments = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('rh_documentos_funcionario')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('tipo_documento', tipoDocumento)
        .order('created_at', { ascending: false });
      
      if (dbError) throw dbError;
      if (data) setDocuments(data);
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast({ title: "Erro", description: "Falha ao carregar documentos do funcionário.", variant: "destructive" });
    }
  };

  const processUpload = async (file) => {
    if (!file || !funcionarioId) return;

    setError(null);
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Erro", description: "Apenas PDF, JPG ou PNG.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "Arquivo muito grande (máximo 5MB).", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setPendingFile(file);

    try {
      // Use the utility which has retry logic built-in
      const { url, path, error: uploadError } = await uploadFile('rh-documentos', file, '', 3);

      if (uploadError) throw new Error(uploadError.message || 'Falha de comunicação com servidor de arquivos.');
      
      if (!url) throw new Error("URL do arquivo não retornada após upload.");

      // Save to database
      const { error: dbError } = await insertWithCompanyId('rh_documentos_funcionario', {
        funcionario_id: funcionarioId,
        tipo_documento: tipoDocumento,
        nome_arquivo: file.name,
        arquivo_url: url,
        tamanho: file.size
      });

      if (dbError) throw dbError;

      toast({ title: "Sucesso", description: "Documento salvo com sucesso.", variant: "success", className: "bg-green-600 text-white border-none" });
      setPendingFile(null);
      fetchDocuments();
      if (onUploadComplete) onUploadComplete(url);
    } catch (err) {
      console.error("Upload process failed:", err);
      setError(err.message || "Erro desconhecido durante o upload.");
      toast({ title: "Erro no upload", description: err.message || "Falha ao salvar documento.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  const handleRetry = (e) => {
    e.stopPropagation();
    if (pendingFile) {
      processUpload(pendingFile);
    }
  };

  const handleDelete = async (id, url) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
      const fileName = url.split('/').pop();
      // Remove from storage first
      const { error: delError } = await deleteFile('rh-documentos', fileName);
      if (delError) {
        console.warn("Storage delete issue (might already be deleted):", delError);
        // Continue to delete from DB anyway
      }

      // Remove from database
      const { error: dbError } = await supabase.from('rh_documentos_funcionario').delete().eq('id', id);
      if (dbError) throw dbError;
      
      fetchDocuments();
      toast({ title: "Removido", description: "Documento excluído com sucesso." });
    } catch (err) {
      console.error("Delete failed:", err);
      toast({ title: "Erro", description: "Falha ao remover documento.", variant: "destructive" });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors relative overflow-hidden",
          isUploading ? "border-border bg-muted opacity-70 pointer-events-none" : "border-border hover:bg-muted hover:border-primary/50 cursor-pointer",
          error ? "border-red-400 bg-red-50/50" : ""
        )}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-medium text-foreground">Enviando documento...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Adicionar {tipoDocumento}</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG ou PNG (Máximo 5MB)</p>
            </div>
            
            {error && (
              <div className="mt-2 text-xs text-red-600 flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1 bg-red-100 p-2 rounded text-left">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {pendingFile && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRetry} className="h-8">
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Tentar Novamente
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {documents.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {documents.map(doc => (
            <Card key={doc.id} className="p-3 flex items-center justify-between hover:bg-muted transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                {doc.nome_arquivo.toLowerCase().endsWith('.pdf') ? (
                  <div className="p-2 bg-red-100 rounded text-red-600"><FileText className="h-5 w-5 flex-shrink-0" /></div>
                ) : (
                  <div className="p-2 bg-blue-100 rounded text-blue-600"><ImageIcon className="h-5 w-5 flex-shrink-0" /></div>
                )}
                <div className="truncate flex flex-col">
                  <span className="text-sm font-medium truncate" title={doc.nome_arquivo}>{doc.nome_arquivo}</span>
                  <span className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()} • {(doc.tamanho / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => window.open(doc.arquivo_url, '_blank')} title="Visualizar/Baixar">
                  <Download className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id, doc.arquivo_url)} title="Remover" className="hover:bg-red-100 hover:text-red-600">
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RHDocumentosUpload;