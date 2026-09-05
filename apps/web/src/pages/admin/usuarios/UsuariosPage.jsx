import React from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import UsuariosList from './UsuariosList';
import UsuariosForm from './UsuariosForm';

const UsuariosPage = ({ mode }) => {
  const { userId } = useParams();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Gerenciamento de Usuários" 
        description="Administre acessos, permissões e associe usuários às suas respectivas empresas."
      />
      
      <div className="w-full">
        {mode === 'list' && <UsuariosList />}
        {mode === 'create' && <UsuariosForm mode="create" />}
        {mode === 'edit' && <UsuariosForm mode="edit" userId={userId} />}
      </div>
    </div>
  );
};

export default UsuariosPage;