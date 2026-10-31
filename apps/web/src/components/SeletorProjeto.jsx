import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Escolha do projeto de um lançamento financeiro. O valor 'none' é "Não se aplica" (projeto_id nulo).
// Os projetos são cadastrados antes em Cadastros > Projetos. Projetos encerrados só aparecem se já estiverem escolhidos.
export const NENHUM_PROJETO = 'none';
export const projetoOuNulo = (v) => (!v || v === NENHUM_PROJETO ? null : v);

const SeletorProjeto = ({ value, onChange, empresaId, className, disabled }) => {
  const { company_id } = useAuthContext();
  const empresa = empresaId || company_id;
  const [projetos, setProjetos] = useState([]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let q = supabase.from('projetos').select('id, nome, codigo, status').order('nome');
      if (empresa) q = q.eq('company_id', empresa);
      const { data } = await q;
      if (vivo) setProjetos(data || []);
    })();
    return () => { vivo = false; };
  }, [empresa]);

  const encerrado = (p) => ['concluido', 'concluído', 'cancelado', 'encerrado'].includes(String(p.status || '').toLowerCase());
  const lista = projetos.filter((p) => !encerrado(p) || p.id === value);

  return (
    <Select value={value || NENHUM_PROJETO} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className || 'bg-background border-border text-foreground'}><SelectValue placeholder="Não se aplica" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NENHUM_PROJETO}>Não se aplica</SelectItem>
        {lista.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo ? `${p.codigo} - ` : ''}{p.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

export default SeletorProjeto;
