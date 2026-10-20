import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { listarAcessosImpl, listarImplantacao } from '@/lib/engService';
import AcessosPanel from './AcessosPanel';

// Todos os acessos e dados cadastrados na implantação do cliente, em um lugar só.
const AcessosTab = ({ cliente }) => {
  const { toast } = useToast();
  const [acessos, setAcessos] = useState([]);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    Promise.all([listarAcessosImpl(cliente.id), listarImplantacao(cliente.id)])
      .then(([a, i]) => { if (vivo) { setAcessos(a); setItens(i); } })
      .catch((e) => toast({ title: 'Erro ao carregar os acessos', description: e.message, variant: 'destructive' }))
      .finally(() => vivo && setLoading(false));
    return () => { vivo = false; };
  }, [cliente.id, toast]);

  const itensPorId = useMemo(() => Object.fromEntries(itens.map((i) => [i.id, i.item])), [itens]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Acessos e dados do cliente</CardTitle>
        <CardDescription>
          Logins, links, contatos e observações recebidos na implantação. As senhas são guardadas cifradas e só a equipe Engagement as vê; cada vez que uma senha é mostrada, fica registrado. Também dá para cadastrar direto em cada item da aba Implantação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcessosPanel clienteId={cliente.id} acessos={acessos} itensPorId={itensPorId} onAtualizar={setAcessos} />
      </CardContent>
    </Card>
  );
};

export default AcessosTab;
