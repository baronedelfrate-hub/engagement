import React from 'react';
import { FolderOpen } from 'lucide-react';

export default function B3Tab1() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-background rounded-xl border border-border shadow-sm min-h-[400px] animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-full mb-6 ring-8 ring-blue-50/50 dark:ring-blue-950/20">
        <FolderOpen className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-3">Organização e Envio Contábil</h3>
      <p className="text-muted-foreground max-w-md text-base leading-relaxed">
        Conteúdo em desenvolvimento. Esta seção será disponibilizada em futuras atualizações para gerenciar a organização e o envio de documentos contábeis.
      </p>
    </div>
  );
}