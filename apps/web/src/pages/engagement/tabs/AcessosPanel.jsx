import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Copy, KeyRound, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  criarAcessoImpl, atualizarAcessoImpl, excluirAcessoImpl, definirSenhaAcesso, revelarSenhaAcesso, formatarData
} from '@/lib/engService';

// Um acesso: sistema/plataforma, link, usuário, senha (cifrada no banco), contato e observações.
const CartaoAcesso = ({ acesso, rotuloItem, onMudou, onExcluir, consulta }) => {
  const { toast } = useToast();
  const [senhaVisivel, setSenhaVisivel] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [editandoSenha, setEditandoSenha] = useState(!acesso.tem_senha);
  const [ocupado, setOcupado] = useState(false);

  const salvarCampo = async (campo, valor) => {
    if ((acesso[campo] || '') === valor) return;
    try { onMudou(await atualizarAcessoImpl(acesso.id, { [campo]: valor || null })); }
    catch (e) { toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }); }
  };

  const salvarSenha = async () => {
    setOcupado(true);
    try {
      await definirSenhaAcesso(acesso.id, novaSenha);
      onMudou({ ...acesso, tem_senha: novaSenha !== '', senha_alterada_em: new Date().toISOString() });
      setNovaSenha(''); setSenhaVisivel(null); setEditandoSenha(novaSenha === '');
      toast({ title: novaSenha ? 'Senha guardada (cifrada)' : 'Senha removida' });
    } catch (e) { toast({ title: 'Não foi possível guardar a senha', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(false); }
  };

  const ver = async () => {
    if (senhaVisivel !== null) { setSenhaVisivel(null); return; }
    setOcupado(true);
    try { setSenhaVisivel((await revelarSenhaAcesso(acesso.id)) ?? ''); }
    catch (e) { toast({ title: 'Não foi possível mostrar a senha', description: e.message, variant: 'destructive' }); }
    finally { setOcupado(false); }
  };

  const copiar = async () => {
    try {
      const s = senhaVisivel ?? (await revelarSenhaAcesso(acesso.id)) ?? '';
      await navigator.clipboard.writeText(s);
      toast({ title: 'Senha copiada' });
    } catch (e) { toast({ title: 'Não foi possível copiar', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Label className="text-xs">Sistema / plataforma {rotuloItem ? <span className="text-muted-foreground">· {rotuloItem}</span> : null}</Label>
          <Input readOnly={consulta} defaultValue={acesso.nome} onBlur={(e) => salvarCampo('nome', e.target.value.trim() || acesso.nome)} placeholder="ex.: Internet Banking Itaú — operador" />
        </div>
        {!consulta && <button type="button" title="Excluir este acesso" className="text-muted-foreground hover:text-destructive mt-6" onClick={onExcluir}><Trash2 className="h-4 w-4" /></button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Link / endereço</Label>
          <div className="flex gap-1">
            <Input readOnly={consulta} defaultValue={acesso.url || ''} onBlur={(e) => salvarCampo('url', e.target.value.trim())} placeholder="https://..." />
            {acesso.url && /^https?:\/\//i.test(acesso.url) && (
              <a href={acesso.url} target="_blank" rel="noopener noreferrer" title="Abrir" className="inline-flex items-center justify-center w-9 shrink-0 rounded-md border border-input hover:bg-muted"><ExternalLink className="h-4 w-4" /></a>
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs">Usuário / login</Label>
          <Input readOnly={consulta} defaultValue={acesso.usuario || ''} onBlur={(e) => salvarCampo('usuario', e.target.value.trim())} autoComplete="off" />
        </div>
      </div>

      <div>
        <Label className="text-xs flex items-center gap-1"><KeyRound className="h-3 w-3" /> Senha <span className="text-muted-foreground">(guardada cifrada; só a equipe Engagement vê)</span></Label>
        {!acesso.tem_senha && consulta ? (
          <p className="text-sm text-muted-foreground">Sem senha cadastrada.</p>
        ) : acesso.tem_senha && !editandoSenha ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="px-3 py-1.5 rounded-md bg-muted text-sm min-w-[160px]">{senhaVisivel === null ? '••••••••••' : (senhaVisivel || '(vazia)')}</code>
            <Button type="button" variant="outline" size="sm" onClick={ver} disabled={ocupado}>{ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : senhaVisivel === null ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}{senhaVisivel === null ? 'Mostrar' : 'Ocultar'}</Button>
            <Button type="button" variant="outline" size="sm" onClick={copiar}><Copy className="h-4 w-4 mr-1" />Copiar</Button>
            {!consulta && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditandoSenha(true); setSenhaVisivel(null); }}>Alterar</Button>}
            {acesso.senha_alterada_em && <span className="text-xs text-muted-foreground">definida em {formatarData(acesso.senha_alterada_em)}</span>}
          </div>
        ) : (
          <div className="flex gap-2">
            <Input type="password" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="digite a senha" />
            <Button type="button" size="sm" onClick={salvarSenha} disabled={ocupado || (!novaSenha && !acesso.tem_senha)}>{ocupado && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Guardar</Button>
            {acesso.tem_senha && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditandoSenha(false); setNovaSenha(''); }}>Cancelar</Button>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Contato (nome, telefone, e-mail)</Label>
          <Input readOnly={consulta} defaultValue={acesso.contato || ''} onBlur={(e) => salvarCampo('contato', e.target.value.trim())} />
        </div>
        <div>
          <Label className="text-xs">Observações</Label>
          <Textarea rows={1} readOnly={consulta} defaultValue={acesso.observacao || ''} onBlur={(e) => salvarCampo('observacao', e.target.value.trim())} placeholder="perfil, token, pergunta de segurança, quem autorizou..." />
        </div>
      </div>
    </div>
  );
};

// Lista os acessos de um item do checklist (itemId) ou de todo o cliente (sem itemId).
const AcessosPanel = ({ clienteId, itemId, acessos, itensPorId, onAtualizar, consulta = false }) => {
  const { toast } = useToast();
  const [criando, setCriando] = useState(false);
  const lista = acessos.filter((a) => (itemId ? a.item_id === itemId : true));

  const adicionar = async () => {
    setCriando(true);
    try { onAtualizar([...acessos, await criarAcessoImpl(clienteId, itemId, {})]); }
    catch (e) { toast({ title: 'Não foi possível adicionar', description: e.message, variant: 'destructive' }); }
    finally { setCriando(false); }
  };

  return (
    <div className="space-y-3">
      {lista.length === 0 && <p className="text-xs text-muted-foreground">{consulta ? 'Nenhum acesso cadastrado ainda. Cadastre pelos itens da aba Implantação.' : 'Nenhuma informação cadastrada.'}</p>}
      {lista.map((a) => (
        <CartaoAcesso
          key={a.id}
          acesso={a}
          consulta={consulta}
          rotuloItem={!itemId && a.item_id ? itensPorId?.[a.item_id] : null}
          onMudou={(nv) => onAtualizar(acessos.map((x) => (x.id === a.id ? { ...x, ...nv } : x)))}
          onExcluir={async () => {
            if (!window.confirm(`Excluir "${a.nome}" e a senha guardada?`)) return;
            try { await excluirAcessoImpl(a.id); onAtualizar(acessos.filter((x) => x.id !== a.id)); }
            catch (e) { toast({ title: 'Não foi possível excluir', description: e.message, variant: 'destructive' }); }
          }}
        />
      ))}
      {!consulta && <Button type="button" variant="outline" size="sm" onClick={adicionar} disabled={criando}>{criando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}Adicionar acesso / informação</Button>}
    </div>
  );
};

export default AcessosPanel;
