import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[260px]';

// Quais logins podem abrir este cadastro (equipe Engagement). Para pessoa física, pode liberar junto as empresas vinculadas.
const AcessosCadastro = ({ empresaId, tipoPessoa }) => {
  const { isSuperAdmin } = useAuthContext();
  const { toast } = useToast();
  const [lista, setLista] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [escolha, setEscolha] = useState('');
  const [vinculadas, setVinculadas] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('listar_acessos_empresa', { p_empresa: empresaId });
    setLista(error ? [] : data || []);
  }, [empresaId]);

  useEffect(() => { if (isSuperAdmin && empresaId) carregar(); }, [isSuperAdmin, empresaId, carregar]);
  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      const [p, e] = await Promise.all([
        supabase.from('profiles').select('id, nome, role, company_id').order('nome'),
        supabase.from('empresas').select('id, nome_fantasia, razao_social')
      ]);
      const nomes = new Map((e.data || []).map((x) => [x.id, x.nome_fantasia || x.razao_social]));
      setUsuarios((p.data || []).map((u) => ({ ...u, empresa: nomes.get(u.company_id) || '' })));
    })();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return null;

  const dar = async () => {
    if (!escolha) return;
    setSalvando(true);
    const { error } = await supabase.rpc('conceder_acesso_empresa', { p_user: escolha, p_empresa: empresaId, p_incluir_vinculadas: tipoPessoa === 'PF' ? vinculadas : false });
    setSalvando(false);
    if (error) { toast({ title: 'Não foi possível dar acesso', description: error.message, variant: 'destructive' }); return; }
    setEscolha('');
    toast({ title: 'Acesso liberado', description: 'A pessoa passa a ver o seletor de cadastro no topo do sistema.' });
    carregar();
  };

  const tirar = async (userId) => {
    if (!window.confirm('Remover o acesso deste login a este cadastro?')) return;
    const { error } = await supabase.rpc('revogar_acesso_empresa', { p_user: userId, p_empresa: empresaId });
    if (error) { toast({ title: 'Não foi possível remover', description: error.message, variant: 'destructive' }); return; }
    carregar();
  };

  const comAcesso = new Set((lista || []).map((l) => l.user_id));

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Logins com acesso a este cadastro</CardTitle>
        <CardDescription>Quem estiver na lista pode abrir este cadastro pelo seletor no topo do sistema. Cada cadastro continua separado dos outros.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista === null ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum login liberado além da equipe Engagement.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {lista.map((l) => (
              <div key={l.user_id} className="flex items-center gap-3 p-2 text-sm">
                <span className="flex-1">{l.nome || 'Sem nome'}</span>
                <span className="text-xs text-muted-foreground">{l.role}</span>
                <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => tirar(l.user_id)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <select className={sel} value={escolha} onChange={(e) => setEscolha(e.target.value)}>
            <option value="">— escolha o login —</option>
            {usuarios.filter((u) => !comAcesso.has(u.id)).map((u) => <option key={u.id} value={u.id}>{u.nome || 'Sem nome'}{u.empresa ? ` · ${u.empresa}` : ''}</option>)}
          </select>
          {tipoPessoa === 'PF' && (
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={vinculadas} onCheckedChange={(v) => setVinculadas(v === true)} /> Liberar também as empresas vinculadas</label>
          )}
          <Button type="button" variant="outline" size="sm" disabled={!escolha || salvando} onClick={dar}><Plus className="h-4 w-4 mr-1" /> Dar acesso</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AcessosCadastro;
