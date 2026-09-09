import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

const RHDocumentUploader = ({ onUploadComplete, className }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Erro", description: "Tipo de arquivo inválido.", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB
      toast({ title: "Erro", description: "Arquivo muito grande (max 20MB).", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setProgress(10);

    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
      const { data, error } = await supabase.storage
        .from('rh-documentos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;
      
      setProgress(100);
      
      const { data: { publicUrl } } = supabase.storage
        .from('rh-documentos')
        .getPublicUrl(fileName);

      onUploadComplete(publicUrl, fileName);
      toast({ title: "Sucesso", description: "Upload concluído." });

    } catch (error) {
      console.error(error);
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted transition-colors cursor-pointer relative", className)} onClick={() => fileInputRef.current?.click()}>
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <span className="text-sm text-muted-foreground">Enviando... {progress}%</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Clique para selecionar ou arraste o arquivo</p>
          <p className="text-xs text-muted-foreground">PDF, Imagens, DOC (Max 20MB)</p>
        </div>
      )}
    </div>
  );
};

export default RHDocumentUploader;