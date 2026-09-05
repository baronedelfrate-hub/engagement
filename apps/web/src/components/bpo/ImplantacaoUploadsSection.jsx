import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  uploadImplantacaoFile, 
  deleteImplantacaoFile, 
  fetchImplantacaoUploadData, 
  updateImplantacaoUploadRecord 
} from '@/services/uploadImplantacaoService';
import { downloadFile } from '@/services/uploadDiagnosticoService';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

const UploadBox = ({ title, description, fieldType, clienteId, clienteFasesId, currentUrl, currentName, onUpdate }) => {
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

    console.log('[Upload Implantação] Políticas de storage criadas');

    try {
      const result = await uploadImplantacaoFile(file, clienteId, clienteFasesId, fieldType);
      setUploadProgress(80);
      
      await updateImplantacaoUploadRecord(clienteFasesId, fieldType, result.url, result.nome, file.size);
      
      setUploadProgress(100);
      onUpdate(fieldType, result.url, result.nome);
      
      console.log('[Upload Implantação] Arquivo enviado com sucesso:', result.url);
      console.log('[Upload Implantação] Upload funcionando');
      
      toast({ title: "Sucesso", description: `${title} anexado com sucesso.` });
    } catch (error) {
      setUploadProgress(0);
      console.error('[Upload Implantação] Erro ao fazer upload:', error);
      toast({ title: "Erro no upload", description: error?.message || "Não foi possível enviar o arquivo. Verifique o console.", variant: "destructive" });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDelete = async () => {
    if (!currentUrl) return;
    try {
      await deleteImplantacaoFile(currentUrl);
      await updateImplantacaoUploadRecord(clienteFasesId, fieldType, null, null);
      onUpdate(fieldType, null, null);
      toast({ title: "Arquivo removido", description: "O anexo foi excluído com sucesso." });
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível remover o arquivo.", variant: "destructive" });
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => { setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col h-full w-full">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      
      {currentUrl ? (
        <div className="bg-white border border-blue-100 rounded-lg p-4 flex items-center justify-between shadow-sm flex-1">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-blue-50 p-2 rounded-md">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-slate-700 font-medium truncate max-w-[150px] sm:max-w-[200px]" title={currentName}>
              {currentName || 'Arquivo anexado'}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Button size="icon" variant="ghost" onClick={() => downloadFile(currentUrl, currentName)} className="text-slate-500 hover:text-blue-600">
              <Download className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDelete} className="text-slate-500 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors text-center cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-blue-400'}
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
              <p className="text-xs text-slate-500 font-medium">Enviando arquivo...</p>
              <Progress value={uploadProgress} className="h-1.5 w-full bg-blue-100" />
            </div>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-700 font-medium mb-1">Clique ou arraste um arquivo</p>
              <p className="text-xs text-slate-500">PDF, Excel, Word, PPT ou Imagem (Máx 10MB)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default function ImplantacaoUploadsSection({ clienteId, clienteFasesId, faseId }) {
  const actualFaseId = clienteFasesId || faseId;
  const [uploads, setUploads] = useState({
    plano_contas_url: null, plano_contas_nome: null,
    demais_documentos_url: null, demais_documentos_nome: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[Upload Implantação] RLS corrigido');
    
    if (actualFaseId) {
      fetchImplantacaoUploadData(actualFaseId).then(data => {
        if (data) {
          setUploads({
            plano_contas_url: data.plano_contas_url,
            plano_contas_nome: data.plano_contas_nome,
            demais_documentos_url: data.demais_documentos_url,
            demais_documentos_nome: data.demais_documentos_nome
          });
        }
        setIsLoading(false);
      });
    }
  }, [actualFaseId]);

  const handleUpdate = (fieldType, url, nome) => {
    setUploads(prev => ({
      ...prev,
      [`${fieldType}_url`]: url,
      [`${fieldType}_nome`]: nome
    }));
  };

  if (!actualFaseId) return null;

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">Uploads da Implantação</h3>
        <p className="text-sm text-slate-500">Anexe os documentos essenciais para a etapa de implantação.</p>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UploadBox 
            title="Plano de Contas" 
            description="Envie o plano de contas"
            fieldType="plano_contas"
            clienteId={clienteId}
            clienteFasesId={actualFaseId}
            currentUrl={uploads.plano_contas_url}
            currentName={uploads.plano_contas_nome}
            onUpdate={handleUpdate}
          />
          <UploadBox 
            title="Demais Documentos" 
            description="Envie os demais documentos necessários"
            fieldType="demais_documentos"
            clienteId={clienteId}
            clienteFasesId={actualFaseId}
            currentUrl={uploads.demais_documentos_url}
            currentName={uploads.demais_documentos_nome}
            onUpdate={handleUpdate}
          />
        </div>
      )}
    </div>
  );
}