import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const FiltrosGerenciais = ({ dados, children }) => {
  const { isSuperAdmin, empresas, selectedEmpresa, setSelectedEmpresa, anos, ano, setAno, bancoId, setBancoId, bancos, projetoId, setProjetoId, projetos = [] } = dados;
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <Select value={selectedEmpresa || ''} onValueChange={setSelectedEmpresa}>
            <SelectTrigger className="w-72 bg-background"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
            <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <Select value={ano ? String(ano) : ''} onValueChange={(v) => setAno(Number(v))}>
        <SelectTrigger className="w-28 bg-background"><SelectValue placeholder="Ano" /></SelectTrigger>
        <SelectContent>{anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={bancoId} onValueChange={setBancoId}>
        <SelectTrigger className="w-48 bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos os bancos</SelectItem>
          {bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
        </SelectContent>
      </Select>
      {projetos.length > 0 && (
        <Select value={projetoId} onValueChange={setProjetoId}>
          <SelectTrigger className="w-56 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os projetos</SelectItem>
            <SelectItem value="SEM">Sem projeto (não se aplica)</SelectItem>
            {projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo ? `${p.codigo} - ` : ''}{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {children}
    </div>
  );
};

export default FiltrosGerenciais;
