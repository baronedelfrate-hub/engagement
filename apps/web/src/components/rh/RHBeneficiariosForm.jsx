import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { insertWithCompanyId } from '@/lib/companyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';

const RHBeneficiariosForm = ({ funcionarioId }) => {
  const { toast } = useToast();
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novo, setNovo] = useState({ nome: '', parentesco: '', percentual: '' });

  useEffect(() => {
    if (funcionarioId) fetchBeneficiarios();
  }, [funcionarioId]);

  const fetchBeneficiarios = async () => {
    const { data } = await supabase.from('rh_beneficiarios').select('*').eq('funcionario_id', funcionarioId);
    if (data) setBeneficiarios(data);
  };

  const handleAdd = async () => {
    if (!novo.nome || !novo.parentesco || !novo.percentual) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await insertWithCompanyId('rh_beneficiarios', { ...novo, percentual: Number(novo.percentual), funcionario_id: funcionarioId });
    if (!error) {
      toast({ title: "Sucesso", description: "Beneficiário adicionado" });
      setNovo({ nome: '', parentesco: '', percentual: '' });
      fetchBeneficiarios();
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('rh_beneficiarios').delete().eq('id', id);
    fetchBeneficiarios();
  };

  if (!funcionarioId) return <div className="text-sm text-muted-foreground p-4 text-center">Salve o funcionário primeiro para adicionar beneficiários.</div>;

  return (
    <div className="space-y-4">
      <Card className="bg-muted/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>Nome</Label>
            <Input value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} placeholder="Nome do beneficiário" />
          </div>
          <div className="w-full md:w-1/4 space-y-2">
            <Label>Parentesco</Label>
            <Input value={novo.parentesco} onChange={e => setNovo({...novo, parentesco: e.target.value})} placeholder="Ex: Filho, Cônjuge" />
          </div>
          <div className="w-full md:w-1/4 space-y-2">
            <Label>Percentual (%)</Label>
            <Input type="number" min="0" max="100" value={novo.percentual} onChange={e => setNovo({...novo, percentual: e.target.value})} placeholder="Ex: 50" />
          </div>
          <Button onClick={handleAdd} disabled={loading}><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {beneficiarios.map(ben => (
          <div key={ben.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
            <div>
              <p className="font-medium">{ben.nome}</p>
              <p className="text-xs text-muted-foreground">{ben.parentesco} • {ben.percentual}%</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(ben.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
        {beneficiarios.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Nenhum beneficiário cadastrado.</p>}
      </div>
    </div>
  );
};

export default RHBeneficiariosForm;