import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, PlusCircle, Inbox, CheckSquare, Send, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function FiscalDashboardQuickActions() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAction = (route) => {
    if (route) {
      navigate(route);
    } else {
      toast({
        title: 'Ação Rápida',
        description: '🚧 This feature isn\'t implemented yet—but don\'t worry! You can request it in your next prompt! 🚀',
      });
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Button 
        variant="outline" 
        className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-background hover:bg-muted border-border"
        onClick={() => handleAction('/fiscal/nfe')}
      >
        <div className="bg-blue-100 dark:bg-blue-950/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
          <FileText className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium">Nova NF-e Produto</span>
      </Button>

      <Button 
        variant="outline" 
        className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-background hover:bg-muted border-border"
        onClick={() => handleAction('/fiscal/nfse/emitir')}
      >
        <div className="bg-indigo-100 dark:bg-indigo-950/30 p-2 rounded-full text-indigo-600 dark:text-indigo-400">
          <PlusCircle className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium">Nova NFS-e Serviço</span>
      </Button>

      <Button 
        variant="outline" 
        className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-background hover:bg-muted border-border"
        onClick={() => handleAction('/compras/notas-fiscais')}
      >
        <div className="bg-green-100 dark:bg-green-950/30 p-2 rounded-full text-green-600 dark:text-green-400">
          <Inbox className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium">Nova Entrada NF</span>
      </Button>

      <Button 
        variant="outline" 
        className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-background hover:bg-muted border-border"
        onClick={() => handleAction('/fiscal/manifestacao')}
      >
        <div className="bg-amber-100 dark:bg-amber-950/30 p-2 rounded-full text-amber-600 dark:text-amber-400">
          <CheckSquare className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium">Manifestar NF</span>
      </Button>

      <Button 
        variant="outline" 
        className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-background hover:bg-muted border-border col-span-2 md:col-span-1"
        onClick={() => handleAction(null)}
      >
        <div className="bg-purple-100 dark:bg-purple-950/30 p-2 rounded-full text-purple-600 dark:text-purple-400">
          <Send className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium">Enviar Contabilidade</span>
      </Button>
    </div>
  );
}