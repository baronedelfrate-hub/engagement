import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useCRM } from '@/contexts/CRMContext';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CRMClientes = () => {
  const { clientes, loading } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const filteredClientes = clientes.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet><title>Clientes | CRM</title></Helmet>
      <PageHeader 
        title="Clientes CRM" 
        description="Gestão de clientes e leads." 
        icon={Users}
        action={
          <Button onClick={() => navigate('/cadastros/clientes/novo')} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mt-6">
        <div className="flex items-center gap-2 mb-4 max-w-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar clientes..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="flex-1"
          />
        </div>

        <div className="rounded-md border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filteredClientes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum cliente encontrado.</TableCell></TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium text-slate-800">{cliente.nome}</TableCell>
                    <TableCell className="text-slate-600">{cliente.email || '-'}</TableCell>
                    <TableCell className="text-slate-600">{cliente.telefone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={cliente.status === 'Ativo' ? 'default' : 'secondary'}>
                        {cliente.status || 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate('/crm/propostas', { state: { clienteId: cliente.id } })}>
                        Criar Proposta
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default CRMClientes;