import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cnpjService } from '@/lib/cnpjService';
import { formatCnpj, unformatCnpj } from '@/lib/cnpjUtils';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CnpjLookup = ({ onDataFound, className }) => {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // 'success', 'error', null
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleChange = (e) => {
    const formatted = formatCnpj(e.target.value);
    setCnpj(formatted);
    // Reset status when user types
    if (result) {
      setResult(null);
      setMessage('');
    }
  };

  const handleSearch = async () => {
    if (!cnpj) return;
    
    setLoading(true);
    setResult(null);
    setMessage('');

    const response = await cnpjService.fetchCnpjData(cnpj);

    setLoading(false);

    if (response.success) {
      setResult('success');
      setMessage('Dados encontrados com sucesso!');
      if (onDataFound) {
        onDataFound(response.data);
      }
      toast({
        title: "Dados recuperados",
        description: "Os campos foram preenchidos com os dados da Receita Federal.",
        variant: "success",
      });
    } else {
      setResult('error');
      setMessage(response.error);
      toast({
        title: "Erro na consulta",
        description: response.error,
        variant: "destructive",
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className={cn("bg-card border rounded-lg p-4 shadow-sm mb-6", className)}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Consultar CNPJ na Receita Federal
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              maxLength={18}
              className="font-mono pl-10"
            />
            <div className="absolute left-3 top-2.5 text-muted-foreground">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={loading || !cnpj}
            className="sm:w-auto w-full"
            type="button"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              'Buscar Dados'
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className={cn(
              "flex items-start gap-2 text-sm p-3 rounded-md",
              result === 'success' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
            )}>
              {result === 'success' ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{message}</p>
                {result === 'success' && (
                  <p className="text-xs mt-1 opacity-80">
                    * Os dados foram obtidos a partir de bases públicas oficiais e podem ser editados.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CnpjLookup;