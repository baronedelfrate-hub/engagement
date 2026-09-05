import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export default function FechamentoParametrosTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" /> Salvar Configurações
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datas e Prazos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">Configuração de tolerâncias para o fechamento mensal.</p>
            {/* Campos placeholder */}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle className="text-base">Validações Automáticas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-slate-500">Regras de bloqueio caso existam pendências.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contas Padrão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-slate-500">Definição das contas de Lucros/Prejuízos acumulados.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}