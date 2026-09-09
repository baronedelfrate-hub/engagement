import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Check, AlertCircle, Loader2, XCircle, FileCode, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { storage } from '@/lib/storage';
import { XmlParsingService } from '@/lib/xmlParsingService';
import { NotaFiscalInsertionService } from '@/lib/notaFiscalInsertionService';

const UploadXMLModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState(null);
  const [errorLog, setErrorLog] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [newSupplierDetected, setNewSupplierDetected] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setFile(null);
        setErrorLog(null);
        setParsedPreview(null);
        setIsProcessing(false);
        setNewSupplierDetected(false);
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorLog(null);
    setParsedPreview(null);
    if (file.type !== 'text/xml' && !file.name.toLowerCase().endsWith('.xml')) {
      toast({ title: "Formato Inválido", description: "Por favor envie um arquivo XML.", variant: "destructive" });
      return;
    }
    setFile(file);
    processFilePreview(file);
  };

  const processFilePreview = async (file) => {
    setIsProcessing(true);
    setErrorLog(null);

    try {
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');

        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const data = XmlParsingService.parseNFe(text);

                // Check Supplier Existence
                const fornecedores = storage.get('FORNECEDORES') || [];
                const cnpjClean = (data.emitente_cnpj || "").replace(/\D/g, '');
                
                let existingSupplier = fornecedores.find(f => f.cnpj && f.cnpj.replace(/\D/g, '') === cnpjClean);
                
                if (!existingSupplier && cnpjClean.length > 0) {
                    setNewSupplierDetected(true);
                    data._newSupplierData = {
                      nome: data.emitente_nome,
                      cnpj: data.emitente_cnpj
                    };
                }

                setParsedPreview(data);
                setIsProcessing(false);

            } catch (err) {
                console.error("Parse Error:", err);
                setErrorLog(err.message || "Erro desconhecido ao ler XML.");
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            setErrorLog("Erro de leitura do arquivo.");
            setIsProcessing(false);
        };
    } catch (err) {
        setErrorLog("Erro inesperado ao processar arquivo.");
        setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    setErrorLog(null);
    try {
        let supplierId = null;
        const fornecedores = storage.get('FORNECEDORES') || [];
        const cnpjClean = (parsedPreview.emitente_cnpj || "").replace(/\D/g, '');
        let existingSupplier = fornecedores.find(f => f.cnpj && f.cnpj.replace(/\D/g, '') === cnpjClean);

        if (existingSupplier) {
            supplierId = existingSupplier.id;
        } else if (parsedPreview._newSupplierData) {
            const newSupplier = {
                id: storage.uuid(),
                razao_social: parsedPreview._newSupplierData.nome,
                nome_fantasia: parsedPreview._newSupplierData.nome,
                cnpj: parsedPreview.emitente_cnpj,
                ativo: true,
                criado_em: new Date().toISOString()
            };
            storage.add('FORNECEDORES', newSupplier);
            supplierId = newSupplier.id;
        }

        // Call Insertion Service
        const dbResult = await NotaFiscalInsertionService.processInvoice(parsedPreview, supplierId);

        if (dbResult.success) {
          toast({ 
            title: "Importação Concluída", 
            description: `Conta a Pagar ID: ${dbResult.conta_pagar.id} e ${dbResult.entradas_estoque.length} itens de estoque registrados.`,
            className: "bg-green-600 text-white" 
          });
          onUploadSuccess();
          onClose();
        }

    } catch (err) {
        setErrorLog("Erro de Inserção DB: " + err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar XML da Nota</DialogTitle>
        </DialogHeader>
        
        <div 
            className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-all
                ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-border'}
                ${file && !errorLog ? 'bg-green-50 border-green-500 dark:bg-green-950/30' : ''}
                ${errorLog ? 'bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input 
                type="file" 
                ref={fileInputRef}
                accept=".xml" 
                className="hidden" 
                onChange={(e) => validateAndSetFile(e.target.files[0])}
            />
            
            {file ? (
                <div className="flex flex-col items-center gap-2 text-green-700 dark:text-green-400">
                    <div className={`h-12 w-12 rounded-full ${errorLog ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400' : 'bg-green-100 dark:bg-green-950/30'} flex items-center justify-center`}>
                        {errorLog ? <XCircle className="h-6 w-6" /> : <Check className="h-6 w-6" />}
                    </div>
                    <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                    
                    {parsedPreview && !errorLog && (
                        <div className="bg-background/60 p-3 rounded text-xs text-left w-full mt-2 border border-green-200 dark:border-green-900 shadow-sm">
                            <div className="grid grid-cols-2 gap-1">
                                <span className="text-muted-foreground">Nota:</span> <span className="font-bold text-foreground">{parsedPreview.numero}</span>
                                <span className="text-muted-foreground">Emitente:</span> <span className="font-bold text-foreground truncate">{parsedPreview.emitente_nome?.substring(0, 15)}...</span>
                                <span className="text-muted-foreground">Valor:</span> <span className="font-bold text-green-700 dark:text-green-400">R$ {parsedPreview.valor_total?.toFixed(2)}</span>
                            </div>
                            {newSupplierDetected && (
                                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-900 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                                    <UserPlus className="h-4 w-4" /> Novo Fornecedor Detectado
                                </div>
                            )}
                        </div>
                    )}

                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); setErrorLog(null); setParsedPreview(null); }} className="text-muted-foreground hover:text-red-700 h-auto p-1 mt-2">
                        Trocar arquivo
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Upload className="h-6 w-6" />
                    </div>
                    <p className="font-medium text-sm">Arraste o XML aqui ou clique</p>
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current.click()} className="mt-2">
                        Selecionar Arquivo
                    </Button>
                </div>
            )}
        </div>

        {errorLog && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 flex gap-2 items-start animate-in slide-in-from-top-2 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="break-all">
                    <strong>Falha:</strong>
                    <p>{errorLog}</p>
                </div>
            </div>
        )}

        <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
            <Button 
                onClick={handleConfirmImport} 
                disabled={!file || isProcessing || errorLog || !parsedPreview} 
                className="gap-2 bg-green-600 hover:bg-green-700"
            >
                {isProcessing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processando...</>
                ) : (
                    <><FileCode className="h-4 w-4" /> Importar Nota</>
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadXMLModal;