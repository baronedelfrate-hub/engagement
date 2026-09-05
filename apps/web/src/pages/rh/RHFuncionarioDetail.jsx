import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { formatCPF } from '@/lib/rhUtils';

// Subcomponents (Placeholders for now, will implement logic inside or separate files)
import RHDocumentosList from './components/RHDocumentosList'; 
import RHExamesList from './components/RHExamesList';
import RHNRList from './components/RHNRList';
import RHHoleritesList from './components/RHHoleritesList';
import RHFeriasList from './components/RHFeriasList';

const RHFuncionarioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rh_funcionarios')
      .select(`*, cargo:roles(nome), departamento:times(nome), centro:centros_custo(nome)`)
      .eq('id', id)
      .single();
    
    if (data) setEmployee(data);
    setLoading(false);
  };

  if (loading) return <div className="p-8">Carregando...</div>;
  if (!employee) return <div className="p-8">Funcionário não encontrado.</div>;

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>{employee.nome_completo} - RH</title></Helmet>
      
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/rh/funcionarios')}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        <Button variant="outline" onClick={() => navigate(`/rh/funcionarios/${id}/editar`)}><Edit className="mr-2 h-4 w-4" /> Editar Dados</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3">
          <CardHeader><CardTitle className="text-2xl">{employee.nome_completo}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div><p className="text-sm text-gray-500">CPF</p><p className="font-medium">{formatCPF(employee.cpf)}</p></div>
             <div><p className="text-sm text-gray-500">Cargo</p><p className="font-medium">{employee.cargo?.nome || '-'}</p></div>
             <div><p className="text-sm text-gray-500">Departamento</p><p className="font-medium">{employee.departamento?.nome || '-'}</p></div>
             <div><p className="text-sm text-gray-500">Admissão</p><p className="font-medium">{new Date(employee.data_admissao).toLocaleDateString()}</p></div>
             <div><p className="text-sm text-gray-500">Status</p><p className="font-medium">{employee.status}</p></div>
             <div><p className="text-sm text-gray-500">Salário</p><p className="font-medium">R$ {Number(employee.salario || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="docs_adm" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="docs_adm">Adm</TabsTrigger>
          <TabsTrigger value="exames">Exames</TabsTrigger>
          <TabsTrigger value="nr">NRs</TabsTrigger>
          <TabsTrigger value="holerites">Holerites</TabsTrigger>
          <TabsTrigger value="ferias">Férias</TabsTrigger>
          <TabsTrigger value="docs_dem">Demissão</TabsTrigger>
        </TabsList>
        
        <TabsContent value="docs_adm" className="mt-4">
            <RHDocumentosList funcionarioId={id} tipo="Admissão" />
        </TabsContent>
        <TabsContent value="exames" className="mt-4">
            <RHExamesList funcionarioId={id} />
        </TabsContent>
        <TabsContent value="nr" className="mt-4">
            <RHNRList funcionarioId={id} />
        </TabsContent>
        <TabsContent value="holerites" className="mt-4">
            <RHHoleritesList funcionarioId={id} />
        </TabsContent>
        <TabsContent value="ferias" className="mt-4">
            <RHFeriasList funcionarioId={id} />
        </TabsContent>
        <TabsContent value="docs_dem" className="mt-4">
            <RHDocumentosList funcionarioId={id} tipo="Demissão" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RHFuncionarioDetail;