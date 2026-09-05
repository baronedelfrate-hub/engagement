import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import DocumentosContabilidadeList from './DocumentosContabilidadeList';

export default function DocumentosContabilidadePage() {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  
  const today = new Date();
  const [filters, setFilters] = useState({
    search: '',
    empresa_id: 'all',
    competencia: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    tipo: 'Todos',
    status: 'Todos'
  });

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data } = await supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('ativo', true);
      if (data) setEmpresas(data);
    };
    fetchEmpresas();
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
      <PageHeader 
        title="Documentos para Contabilidade" 
        description="Gestão, importação e envio de arquivos fiscais, financeiros e contábeis."
        icon={FolderOpen}
        breadcrumbs={[
          { label: 'Contabilidade', href: '/contabilidade/dashboard' },
          { label: 'Documentos' }
        ]}
        actions={
          <Button onClick={() => navigate('/contabilidade/documentos/novo')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Documento
          </Button>
        }
      />

      <DocumentosContabilidadeList 
        filters={filters}
        setFilters={setFilters}
        empresas={empresas}
      />
    </div>
  );
}