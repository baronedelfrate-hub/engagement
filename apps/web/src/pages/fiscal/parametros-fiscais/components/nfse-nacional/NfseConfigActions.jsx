import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Trash2, RefreshCw, XCircle, Edit } from 'lucide-react';

export default function NfseConfigActions({ 
  onSave, 
  onClear, 
  onDelete, 
  onTestConnection,
  onEdit,
  isValid, 
  isSaving, 
  hasConfig,
  isEditMode
}) {
  if (hasConfig && !isEditMode) {
    return (
      <div className="flex flex-wrap gap-3 mt-6">
        <Button onClick={onEdit} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
          <Edit className="w-4 h-4 mr-2" /> Editar Configuração
        </Button>
        <Button onClick={onTestConnection} variant="secondary" className="bg-slate-100 text-slate-700">
          <RefreshCw className="w-4 h-4 mr-2" /> Testar Conexão
        </Button>
        <Button onClick={onDelete} variant="destructive" className="ml-auto">
          <Trash2 className="w-4 h-4 mr-2" /> Deletar Configuração
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
      <Button variant="ghost" onClick={onClear} disabled={isSaving}>
        <XCircle className="w-4 h-4 mr-2" /> Limpar Formulário
      </Button>
      <Button 
        onClick={onSave} 
        disabled={!isValid || isSaving}
        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px]"
      >
        {isSaving ? (
          <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
        ) : (
          <><Save className="w-4 h-4 mr-2" /> Salvar Configuração</>
        )}
      </Button>
    </div>
  );
}