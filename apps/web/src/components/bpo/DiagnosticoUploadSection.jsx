import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile, deleteFile, downloadFile } from '@/services/uploadDiagnosticoService';
import { Progress } from '@/components/ui/progress';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' // pptx
];

const UploadBox = ({ title, fieldType, clienteFasesId, currentUrl, currentName, onUploadSuccess, onDeleteSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo permitido é 10MB.", variant: "destructive" });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Apenas PDF, XLSX, DOCX, PNG, JPG e PPTX são permitidos.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(30);

    try {
      const result = await uploadFile(file, clienteFasesId, fieldType);
      setUploadProgress(100);
      onUploadSuccess(fieldType, result.url, result.nome);
      toast({ title: "Sucesso", description: `${title} anexado(a) com sucesso.` });
    } catch (error) {
      setUploadProgress(0);
      toast({ title: "Erro no upload", description: error?.message || "Não foi possível enviar o arquivo.", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async () => {
    if (!currentUrl) return;
    try {
      await deleteFile(currentUrl, fieldType);
      onDeleteSuccess(fieldType);
      toast({ title: "Arquivo removido", description: "O anexo foi excluído com sucesso." });
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível remover o arquivo.", variant: "destructive" });
    }
  };

  return (
    <div className="bg-muted border border-border rounded-xl p-4 flex flex-col h-full w-full">
      <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      
      {currentUrl ? (
        <div className="bg-background border border-blue-100 dark:border-blue-900 rounded-lg p-4 flex items-center justify-between shadow-sm flex-1">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-foreground font-medium truncate max-w-[150px] sm:max-w-[200px]" title={currentName}>
              {currentName || 'Arquivo anexado'}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Button size="icon" variant="ghost" onClick={() => downloadFile(currentUrl, currentName)} className="text-muted-foreground hover:text-blue-600">
              <Download className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDelete} className="text-muted-foreground hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors text-center cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border bg-background hover:bg-muted hover:border-blue-400'}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => handleFileSelect(e.target.files[0])}
            accept=".pdf,.xlsx,.docx,.png,.jpg,.jpeg,.pptx"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center w-full max-w-xs space-y-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Enviando arquivo...</p>
              <Progress value={uploadProgress} className="h-1.5 w-full bg-blue-100 dark:bg-blue-950/30" />
            </div>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium mb-1">Clique ou arraste um arquivo</p>
              <p className="text-xs text-muted-foreground">PDF, Excel, Word, PPT ou Imagem (Máx 10MB)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function DiagnosticoUploadSection({ clienteFasesId, uploads = {}, onUploadSuccess, onDeleteSuccess }) {
  if (!clienteFasesId) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">Anexos do Diagnóstico</h3>
        <p className="text-sm text-muted-foreground">Faça o upload da Proposta de Melhoria gerada após a análise.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UploadBox 
          title="Proposta de Melhoria" 
          fieldType="proposta_melhoria"
          clienteFasesId={clienteFasesId}
          currentUrl={uploads.proposta_melhoria_url}
          currentName={uploads.proposta_melhoria_nome}
          onUploadSuccess={onUploadSuccess}
          onDeleteSuccess={onDeleteSuccess}
        />
      </div>
    </div>
  );
}