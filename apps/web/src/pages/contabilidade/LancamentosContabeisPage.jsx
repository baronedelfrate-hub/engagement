import React from 'react';
import PageHeader from '@/components/PageHeader';
import { BookOpen } from 'lucide-react';
import LancamentosContabeisList from './lancamentos/LancamentosContabeisList';

export default function LancamentosContabeisPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-24">
      <PageHeader 
        title="Lançamentos Contábeis" 
        description="Gestão de diário, lançamentos manuais, provisões e integrações."
        icon={BookOpen}
        breadcrumbs={[
          { label: 'Contabilidade', href: '/contabilidade/dashboard' },
          { label: 'Lançamentos' }
        ]}
      />

      <LancamentosContabeisList />
    </div>
  );
}