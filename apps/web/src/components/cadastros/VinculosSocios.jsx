import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const sel = 'h-9 rounded-md border border-input bg-background px-3 text-sm';
const nome = (e) => e?.nome_fantasia || e?.razao_social || '—';

// Vínculos entre sócios (pessoa física) e empresas. Só a equipe Engagement (superadmin) altera.
const VinculosSocios = ({ empresaId, tipoPessoa }) => {
  const { isSuperAdmin } = useAuthContext();
  const { toast } = useToast();
  const ehPessoa = tipoPessoa === 'PF';
  const [lista, setLista] = useState(null);
  const [opcoes, setOpcoes] = useState([]);
  const [escolha, setEscolha] = useState('');
  const [participacao, setParticipacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const col = ehPessoa ? 'pessoa_id' : 'empresa_id';
    const { data, error } = await supabase
      .from('empresa_socios')
      .select('id, pessoa_id, empresa_id, participacao, pessoa:pessoa_id(razao_social, nome_fantasia), empresa:empresa_id(razao_social, nome_fantasia)')
      .eq(col, empresaId);
    if (error) { setLista([]); return; }
    setLista(data || []);
  }, [empresaId, ehPessoa]);

  useEffect(() => { if (empresaId) carregar(); }, [empresaId, carregar]);
  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase.from('empresas').select('id, razao_social, nome_fantasia').eq('tipo_pessoa', ehPessoa ? 'PJ' : 'PF').order('razao_social').then(({ data }) => setOpcoes(data || []));
  }, [isSuperAdmin, ehPessoa]);

  const adicionar = async () => {
    if (!escolha) return;
    setSalvando(true);
    const linha = ehPessoa ? { pessoa_id: empresaId, empresa_id: escolha } : { pessoa_id: escolha, empresa_id: empresaId };
    const { error } = await supabase.from('empresa_socios').insert({ ...linha, participacao: participacao === '' ? null : Number(participacao) });
    setSalvando(false);
    if (error) { toast({ title: 'Não foi possível vincular', description: error.message, variant: 'destructive' }); return; }
    setEscolha(''); setParticipacao('');
    carregar();
  };

  const remover = async (id) => {
    if (!window.confirm('Remover este vínculo?')) return;
    const { error } = await supabase.from('empresa_socios').delete().eq('id', id);
    if (error) { toast({ title: 'Não foi possível remover', description: error.message, variant: 'destructive' }); return; }
    carregar();
  };

  const jaVinculados = new Set((lista || []).map((l) => (ehPessoa ? l.empresa_id : l.pessoa_id)));

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> {ehPessoa ? 'Empresas de que participa como sócio(a)' : 'Sócios (pessoas físicas)'}</CardTitle>
        <CardDescription>{ehPessoa ? 'Servem para a visão que junta a pessoa e as empresas dela.' : 'Pessoas físicas ligadas a esta empresa.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lista === null ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum vínculo cadastrado.</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {lista.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-2 text-sm">
                <span className="flex-1">{nome(ehPessoa ? l.empresa : l.pessoa)}</span>
                <span className="text-xs text-muted-foreground">{l.participacao != null ? `${l.participacao}%` : 'participação não informada'}</span>
                {isSuperAdmin && <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => remover(l.id)}><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
          </div>
        )}
        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${sel} min-w-[240px]`} value={escolha} onChange={(e) => setEscolha(e.target.value)}>
              <option value="">{ehPessoa ? '— escolha a empresa —' : '— escolha a pessoa —'}</option>
              {opcoes.filter((o) => !jaVinculados.has(o.id) && o.id !== empresaId).map((o) => <option key={o.id} value={o.id}>{nome(o)}</option>)}
            </select>
            <Input type="number" min="0" max="100" step="0.01" className="w-32 h-9" placeholder="% (opcional)" value={participacao} onChange={(e) => setParticipacao(e.target.value)} />
            <Button type="button" variant="outline" size="sm" disabled={!escolha || salvando} onClick={adicionar}><Plus className="h-4 w-4 mr-1" /> Vincular</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VinculosSocios;
