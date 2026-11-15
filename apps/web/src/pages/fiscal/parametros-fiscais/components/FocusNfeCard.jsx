import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Save, Activity, Plug } from 'lucide-react';
import { focusNfe } from '@/services/focusNfeService';

export default function FocusNfeCard() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState(null);
  const [f, setF] = useState({ ambiente: 'homologacao', cnpj: '', tipo_nfse: 'nacional', token_homologacao: '', token_producao: '' });
  const [busy, setBusy] = useState(false);

  const aplicar = (c) => { setCfg(c); setF((p) => ({ ...p, ambiente: c.ambiente, cnpj: c.cnpj || '', tipo_nfse: c.tipo_nfse, token_homologacao: '', token_producao: '' })); };
  useEffect(() => { focusNfe.getConfig().then((r) => aplicar(r.config)).catch((e) => toast({ title: 'Focus NFe', description: e.message, variant: 'destructive' })); }, []); // eslint-disable-line

  const salvar = async () => {
    setBusy(true);
    try { const r = await focusNfe.saveConfig(f); aplicar(r.config); toast({ title: 'Focus NFe salva', description: 'Credenciais gravadas com segurança para esta empresa.' }); }
    catch (e) { toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }); }
    setBusy(false);
  };
  const testar = async () => {
    setBusy(true);
    try { const r = await focusNfe.testar(); toast({ title: r.status }); aplicar((await focusNfe.getConfig()).config); }
    catch (e) { toast({ title: 'Falha no teste', description: e.message, variant: 'destructive' }); }
    setBusy(false);
  };
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const ph = (ok) => (ok ? '•••••• configurado (deixe em branco para manter)' : 'Cole o token aqui');

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><Plug className="w-5 h-5 text-emerald-600" /> Focus NFe (emissão e recebimento)</CardTitle>
          <CardDescription className="mt-1">Credenciais próprias desta empresa. Os tokens ficam só no servidor e nunca voltam para a tela.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {cfg?.status_conexao && <Badge variant="outline">{cfg.status_conexao}</Badge>}
          <Button variant="outline" onClick={testar} disabled={busy}><Activity className="w-4 h-4 mr-2" /> Testar</Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Ambiente em uso</Label>
          <Select value={f.ambiente} onValueChange={(v) => set('ambiente', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="homologacao">Homologação (testes)</SelectItem>
              <SelectItem value="producao">Produção (notas valem de verdade)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>CNPJ da empresa na Focus</Label>
          <Input value={f.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="Somente números" />
        </div>
        <div className="space-y-2">
          <Label>Token de homologação</Label>
          <Input type="password" autoComplete="off" value={f.token_homologacao} onChange={(e) => set('token_homologacao', e.target.value)} placeholder={ph(cfg?.token_homologacao_configurado)} />
        </div>
        <div className="space-y-2">
          <Label>Token de produção</Label>
          <Input type="password" autoComplete="off" value={f.token_producao} onChange={(e) => set('token_producao', e.target.value)} placeholder={ph(cfg?.token_producao_configurado)} />
        </div>
        <div className="space-y-2">
          <Label>NFS-e emitida por</Label>
          <Select value={f.tipo_nfse} onValueChange={(v) => set('tipo_nfse', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nacional">NFS-e Nacional</SelectItem>
              <SelectItem value="municipal">NFS-e municipal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end justify-end">
          <Button onClick={salvar} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="w-4 h-4 mr-2" /> Salvar Focus NFe</Button>
        </div>
      </CardContent>
    </Card>
  );
}
