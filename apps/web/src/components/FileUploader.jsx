import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadFile, deleteFile, validateFile, getBucketConfig } from '@/lib/supabaseStorage';
import { useToast } from '@/components/ui/use-toast';

const FileUploader = ({ 
  currentUrl, 
  currentPath, 
  onUploadComplete, 
  type = 'logo', // 'logo', 'image', 'documento', 'comprovante'
  label = 'Upload de Arquivo',
  className 
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [pendingFile, setPendingFile] = useState(null); // Store file for retries

  const config = getBucketConfig(type);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setLocalError(null);
    setPendingFile(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    setLocalError(null);
    setPendingFile(null);
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files[0]);
      // Reset input value so the same file can be selected again if needed
      e.target.value = null;
    }
  };

  const processUpload = async (file) => {
    setLocalError(null);
    
    // 1. Validation
    const validation = validateFile(file, config);
    if (!validation.valid) {
      setLocalError(validation.error);
      toast({ 
        title: "Arquivo inválido", 
        description: validation.error, 
        variant: "destructive" 
      });
      return;
    }

    setIsUploading(true);
    setProgress(10);
    setPendingFile(file); // Save in case we need to retry

    // 2. Upload new file (uploadFile utility handles retries internally now)
    // Simulate progress increment for UX
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 85)); // Hold at 85% until actual completion
    }, 300);

    const { url, path, error } = await uploadFile(config.bucket, file);
    
    clearInterval(progressInterval);
    
    if (error) {
      setIsUploading(false);
      setProgress(0);
      const errMsg = error.message || "Falha de conexão com o servidor de arquivos. Verifique sua rede e tente novamente.";
      setLocalError(errMsg);
      toast({ 
        title: "Erro no upload", 
        description: errMsg, 
        variant: "destructive" 
      });
    } else {
      setProgress(100);
      // Wait a tiny bit to show 100% before clearing
      setTimeout(async () => {
        setIsUploading(false);
        setProgress(0);
        setPendingFile(null);
        
        // Only delete old file if new upload was completely successful
        if (currentPath && currentPath !== path) {
          // Fire and forget delete of old file
          deleteFile(config.bucket, currentPath).catch(err => console.error('Cleanup failed:', err));
        }
        
        onUploadComplete(url, path);
        toast({ 
          title: "Sucesso", 
          description: "Arquivo anexado com sucesso!", 
          variant: "default",
          className: "bg-green-600 text-white border-none"
        });
      }, 500);
    }
  };

  const handleRetry = (e) => {
    e.stopPropagation();
    if (pendingFile) {
      processUpload(pendingFile);
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (!currentPath && !currentUrl) {
       onUploadComplete('', '');
       return;
    }

    if (window.confirm('Tem certeza que deseja remover este arquivo?')) {
      setIsUploading(true);
      if (currentPath) {
        const { error } = await deleteFile(config.bucket, currentPath);
        if (error) {
           toast({
             title: "Erro",
             description: "Não foi possível remover o arquivo do servidor.",
             variant: "destructive"
           });
           setIsUploading(false);
           return;
        }
      }
      onUploadComplete('', '');
      setIsUploading(false);
      toast({
        title: "Removido",
        description: "O arquivo foi removido.",
      });
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    return url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/) != null || type === 'logo' || type === 'image';
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors text-center",
          dragActive ? "border-primary bg-primary/5" : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/20",
          isUploading ? "opacity-50 pointer-events-none" : "hover:border-primary/50 cursor-pointer",
          localError ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && !currentUrl && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={config.allowedTypes.join(',')}
          onChange={handleFileChange}
        />

        {currentUrl && !localError ? (
          <div className="flex flex-col items-center gap-4 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="relative group">
               {isImage(currentUrl) ? (
                 <div className="h-32 w-32 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 relative shadow-sm">
                    <img src={currentUrl} alt="Preview" className="h-full w-full object-contain" />
                 </div>
               ) : (
                 <div className="h-32 w-32 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm">
                    <FileText className="h-12 w-12" />
                 </div>
               )}
               <Button
                 type="button"
                 variant="destructive"
                 size="icon"
                 className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                 onClick={handleRemove}
               >
                 <X className="h-3 w-3" />
               </Button>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate px-2">
               <a href={currentUrl} target="_blank" rel="noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
                 Visualizar Arquivo <FileText className="h-3 w-3" />
               </a>
            </div>
            <div className="flex gap-2">
              <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
              >
                  Substituir
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
               {type === 'logo' || type === 'image' ? <ImageIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" /> : <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />}
            </div>
            <div className="space-y-1">
               <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                 <span className="text-primary hover:underline">
                   Clique para buscar
                 </span> ou arraste aqui
               </p>
               <p className="text-xs text-slate-500">
                 {(type === 'logo' || type === 'image') && `PNG, JPG ou GIF (Max. ${config.maxSizeMB}MB)`}
                 {type === 'documento' && `PDF ou DOC (Max. ${config.maxSizeMB}MB)`}
                 {type === 'comprovante' && `PDF, PNG ou JPG (Max. ${config.maxSizeMB}MB)`}
               </p>
            </div>
            
            {localError && (
              <div className="mt-4 flex flex-col items-center gap-2 w-full">
                <div className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1 text-left bg-red-50 p-2 rounded w-full">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{localError}</span>
                </div>
                {pendingFile && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 text-primary border-primary hover:bg-primary/5"
                    onClick={handleRetry}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Tentar Novamente
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {isUploading && (
           <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 flex flex-col items-center justify-center rounded-lg z-20 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
                {progress >= 100 ? 'Finalizando...' : `Enviando... ${Math.floor(progress)}%`}
              </p>
              
              <div className="w-2/3 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;