import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Send, Wallet as Ledger, BarChart3, Scale } from 'lucide-react';

export default function QuickActionsSection() {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      <Button 
        onClick={() => navigate('/contabilidade/dre-balancete')}
        className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 h-12 px-5 flex items-center gap-2 transition-transform hover:scale-105"
      >
        <Scale className="w-4 h-4" /> <span className="hidden sm:inline">Ver Balancete</span>
      </Button>

      <Button 
        onClick={() => navigate('/contabilidade/dre-balancete')}
        className="rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 h-12 px-5 flex items-center gap-2 transition-transform hover:scale-105"
      >
        <BarChart3 className="w-4 h-4" /> <span className="hidden sm:inline">Ver DRE</span>
      </Button>

      <Button 
        onClick={() => navigate('/contabilidade/lancamentos')} 
        className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 h-12 px-5 flex items-center gap-2 transition-transform hover:scale-105"
      >
        <Plus className="w-4 h-4" /> <Ledger className="w-4 h-4 ml-[-4px]" /> <span className="hidden sm:inline">Novo Lançamento</span>
      </Button>

      <Button 
        onClick={() => navigate('/contabilidade/documentos')} 
        className="rounded-full shadow-lg bg-orange-600 hover:bg-orange-700 h-12 px-5 flex items-center gap-2 transition-transform hover:scale-105"
      >
        <Send className="w-4 h-4" /> <span className="hidden sm:inline">Enviar Documentos</span>
      </Button>

      <Button 
        onClick={() => navigate('/contabilidade/fechamento/novo')}
        className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 h-14 px-6 flex items-center gap-2 transition-transform hover:scale-105 text-base font-semibold"
      >
        <Plus className="w-5 h-5" /> <Calendar className="w-5 h-5 ml-[-4px]" /> <span className="hidden sm:inline">Novo Fechamento</span>
      </Button>
    </div>
  );
}