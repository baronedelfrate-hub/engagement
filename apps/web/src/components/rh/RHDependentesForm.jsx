import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RHDependentesForm = ({ funcionarioId }) => {
  const { toast } = useToast();
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novo, setNovo] = useState({ nome: '', parentesco: '', data_nascimento: '' });

  useEffect(() => {
    if (funcionarioId) fetchDependentes();
  }, [funcionarioId]);

  const fetchDependentes = async () => {
    const { data } = await supabase.from('rh_dependentes').select('*').eq('funcionario_id', funcionarioId);
    if (data) setDependentes(data);
  };

  const handleAdd = async () => {
    if (!novo.nome || !novo.parentesco) {
      toast({ title: "Erro", description: "Nome e Parentesco são obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await insertWithCompanyId('rh_dependentes', { ...novo, funcionario_id: funcionarioId });
    if (!error) {
      toast({ title: "Sucesso", description: "Dependente adicionado" });
      setNovo({ nome: '', parentesco: '', data_nascimento: '' });
      fetchDependentes();
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('rh_dependentes').delete().eq('id', id);
    fetchDependentes();
  };

  if (!funcionarioId) return <div className="text-sm text-muted-foreground p-4 text-center">Salve o funcionário primeiro para adicionar dependentes.</div>;

  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>Nome</Label>
            <Input value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} placeholder="Nome do dependente" />
          </div>
          <div className="w-full md:w-1/4 space-y-2">
            <Label>Parentesco</Label>
            <Select value={novo.parentesco} onValueChange={v => setNovo({...novo, parentesco: v})}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Filho(a)">Filho(a)</SelectItem>
                <SelectItem value="Cônjuge">Cônjuge</SelectItem>
                <SelectItem value="Pai/Mãe">Pai/Mãe</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-1/4 space-y-2">
            <Label>Data Nascimento</Label>
            <Input type="date" value={novo.data_nascimento} onChange={e => setNovo({...novo, data_nascimento: e.target.value})} />
          </div>
          <Button onClick={handleAdd} disabled={loading}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {dependentes.map(dep => (
          <div key={dep.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
            <div>
              <p className="font-medium">{dep.nome}</p>
              <p className="text-xs text-muted-foreground">{dep.parentesco} • {dep.data_nascimento ? new Date(dep.data_nascimento).toLocaleDateString() : 'N/I'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(dep.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
        {dependentes.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Nenhum dependente cadastrado.</p>}
      </div>
    </div>
  );
};

export default RHDependentesForm;