import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Trash2, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const RHHoleritesPage = () => {
  const { toast } = useToast();
  const [holerites, setHolerites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState([]);
  const [filtroMesAno, setFiltroMesAno] = useState('');
  const [filtroFunc, setFiltroFunc] = useState('all');

  // Últimos 12 meses, gerados a partir da data atual (em vez de uma lista fixa que ficava desatualizada)
  const competencias = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    return `${mes}/${d.getFullYear()}`;
  });

  useEffect(() => {
    fetchData();
  }, [filtroMesAno, filtroFunc]);

  const fetchData = async () => {
    setLoading(true);
    const { data: func } = await supabase.from('rh_funcionarios').select('id, nome_completo').order('nome_completo');
    if (func) setFuncionarios(func);

    let query = supabase.from('rh_holerites').select('*, funcionario:rh_funcionarios(nome_completo)').order('created_at', { ascending: false });
    
    if (filtroMesAno) query = query.eq('mes_ano', filtroMesAno);
    if (filtroFunc && filtroFunc !== 'all') query = query.eq('funcionario_id', filtroFunc);

    const { data } = await query;
    if (data) setHolerites(data);
    setLoading(false);
  };

  const handleUpload = () => {
    toast({ title: "Upload em Lote", description: "🚧 Funcionalidade de processamento em lote em desenvolvimento.", variant: "default" });
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir este holerite?')) {
      await supabase.from('rh_holerites').delete().eq('id', id);
      fetchData();
      toast({ title: "Sucesso", description: "Holerite removido." });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Helmet><title>Holerites e Pagamentos - RH</title></Helmet>
      <PageHeader 
        title="Holerites e Folha de Pagamento" 
        description="Gestão de contracheques e recibos"
        action={<Button onClick={handleUpload}><Upload className="mr-2 h-4 w-4" /> Importar Arquivo Folha</Button>}
      />

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 bg-muted/30">
          <div className="w-full md:w-1/3">
            <Select value={filtroFunc} onValueChange={setFiltroFunc}>
              <SelectTrigger><SelectValue placeholder="Todos os Funcionários" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Funcionários</SelectItem>
                {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/4">
             <Select value={filtroMesAno} onValueChange={setFiltroMesAno}>
              <SelectTrigger><SelectValue placeholder="Competência (Mês/Ano)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {competencias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead className="text-right">Valor Líquido</TableHead>
              <TableHead className="text-center">Data Processamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell></TableRow>
            ) : holerites.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
            ) : (
              holerites.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.funcionario?.nome_completo}</TableCell>
                  <TableCell>{h.mes_ano}</TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(h.valor_liquido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>
                  <TableCell className="text-center">{new Date(h.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => h.arquivo_url ? window.open(h.arquivo_url, '_blank') : toast({description:"Arquivo não disponível"})}><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(h.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default RHHoleritesPage;