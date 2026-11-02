import React, { useEffect, useState } from 'react';
import { User, Building2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// Quem tem acesso a mais de um cadastro (ex.: sócia = pessoa física + empresas) escolhe aqui qual abrir.
// Cada cadastro continua isolado: a troca muda o cadastro ativo do login e recarrega o sistema.
const SeletorCadastro = () => {
  const { toast } = useToast();
  const [lista, setLista] = useState([]);
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    let ativo = true;
    supabase.rpc('minhas_empresas').then(({ data, error }) => { if (ativo && !error) setLista(data || []); });
    return () => { ativo = false; };
  }, []);

  if (lista.length < 2) return null;
  const atual = lista.find((x) => x.atual)?.id || '';

  const trocar = async (id) => {
    if (!id || id === atual) return;
    setTrocando(true);
    const { error } = await supabase.rpc('trocar_empresa', { p_empresa: id });
    if (error) {
      setTrocando(false);
      toast({ title: 'Não foi possível trocar de cadastro', description: error.message, variant: 'destructive' });
      return;
    }
    try { sessionStorage.removeItem('company_id'); localStorage.removeItem('company_id'); } catch { /* sem armazenamento */ }
    window.location.assign('/');
  };

  return (
    <div className="flex items-center gap-2">
      {trocando ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <User className="h-4 w-4 text-primary" />}
      <Select value={atual} onValueChange={trocar} disabled={trocando}>
        <SelectTrigger className="w-56 h-9 bg-background"><SelectValue placeholder="Cadastro" /></SelectTrigger>
        <SelectContent>
          {lista.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="inline-flex items-center gap-2">{c.tipo_pessoa === 'PF' ? <User className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}{c.nome}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SeletorCadastro;
