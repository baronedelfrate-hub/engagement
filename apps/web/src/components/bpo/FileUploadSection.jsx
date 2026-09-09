import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { uploadFile, deleteFile, getBucketConfig, validateFile } from '@/lib/supabaseStorage';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText, Trash2, Download, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function FileUploadSection({ fase_id, tipo_arquivo }) {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  
  const bucketConfig = getBucketConfig('cliente_fase');

  const fetchFiles = async () => {
    if (!fase_id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cliente_fases_arquivos')
        .select('*')
        .eq('cliente_fase_id', fase_id)
        .eq('tipo_arquivo', tipo_arquivo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      console.error('[FileUploadSection] Erro ao carregar arquivos:', err);
      toast({ title: 'Erro', description: 'Não foi possível carregar os arquivos anexados.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [fase_id, tipo_arquivo]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`[Upload] Iniciando upload de arquivo: ${file.name}`);

    // Validation
    const validation = validateFile(file, bucketConfig);
    if (!validation.valid) {
      toast({ title: 'Arquivo inválido', description: validation.error, variant: 'destructive' });
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload to Storage
      const { url, path, error: uploadError } = await uploadFile(bucketConfig.bucket, file, fase_id);
      
      if (uploadError) {
        console.error('[Upload] Erro ao fazer upload:', uploadError);
        throw new Error('Falha ao enviar arquivo para o servidor.');
      }

      // 2. Save metadata to Database
      const { error: dbError } = await supabase
        .from('cliente_fases_arquivos')
        .insert({
          cliente_fase_id: fase_id,
          tipo_arquivo: tipo_arquivo,
          url_arquivo: url,
          nome_arquivo: file.name,
          tamanho: file.size,
          data_upload: new Date().toISOString()
        });

      if (dbError) {
        console.error('[Upload] Erro ao salvar metadados:', dbError);
        // Attempt rollback
        await deleteFile(bucketConfig.bucket, path);
        throw new Error('Falha ao registrar o arquivo no banco de dados. Verifique as permissões de RLS.');
      }

      console.log(`[Upload] Arquivo enviado com sucesso: ${file.name}`);
      console.log('[Upload] RLS desabilitado ou políticas permissivas ativas e funcionando.');
      
      toast({ title: 'Sucesso', description: 'Arquivo anexado com sucesso!' });
      fetchFiles(); // Refresh list

    } catch (err) {
      toast({ title: 'Erro no Upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId, fileUrl) => {
    if (!window.confirm('Tem certeza que deseja excluir este arquivo?')) return;

    try {
      // Extract path from URL (naive approach, assumes standard supabase url format)
      const urlObj = new URL(fileUrl);
      const pathParts = urlObj.pathname.split(`/${bucketConfig.bucket}/`);
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await deleteFile(bucketConfig.bucket, filePath);
      }

      // Delete from DB
      const { error } = await supabase
        .from('cliente_fases_arquivos')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      toast({ title: 'Removido', description: 'Arquivo removido com sucesso.' });
      fetchFiles(); // Refresh list
    } catch (err) {
      console.error('[FileUploadSection] Erro ao deletar:', err);
      toast({ title: 'Erro', description: 'Não foi possível remover o arquivo.', variant: 'destructive' });
    }
  };

  const isImage = (filename) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-24 border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Enviando arquivo...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Clique para anexar arquivo</span>
              <span className="text-xs text-muted-foreground">PDF, PNG, JPG (Máx 20MB)</span>
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : files.length > 0 ? (
        <div className="space-y-2 mt-4">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-muted p-2 rounded-md shrink-0">
                  {isImage(file.nome_arquivo) ? (
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-foreground truncate" title={file.nome_arquivo}>
                    {file.nome_arquivo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.tamanho)} • {format(new Date(file.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-primary">
                  <a href={file.url_arquivo} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => handleDelete(file.id, file.url_arquivo)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground bg-muted rounded-lg border border-border border-dashed">
          Nenhum arquivo anexado ainda.
        </div>
      )}
    </div>
  );
}