import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { AlertCircle } from 'lucide-react';
import PendenciasContabeisList from './pendencias/PendenciasContabeisList';
import PendenciasContabeisForm from './pendencias/PendenciasContabeisForm';
import PendenciasContabeisDetail from './pendencias/PendenciasContabeisDetail';
import { PendenciasProvider } from '@/contexts/PendenciasContabeisContext';

export default function PendenciasContabeisPage() {
  return (
    <PendenciasProvider>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
        <PageHeader 
          title="Pendências Contábeis" 
          description="Gestão de divergências, documentos faltantes e ajustes necessários."
          icon={AlertCircle}
          breadcrumbs={[
            { label: 'Contabilidade', href: '/contabilidade/dashboard' },
            { label: 'Pendências' }
          ]}
        />

        <Routes>
          <Route path="/" element={<PendenciasContabeisList />} />
          <Route path="/novo" element={<PendenciasContabeisForm />} />
          <Route path="/:id" element={<PendenciasContabeisDetail />} />
          <Route path="/:id/editar" element={<PendenciasContabeisForm />} />
        </Routes>
      </div>
    </PendenciasProvider>
  );
}