import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, RefreshCcw, AlertTriangle, History } from 'lucide-react';

function FichaTecnicaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [isSimulation, setIsSimulation] = useState(false); // Simulation Mode Toggle

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    versao: 'v1',
    rendimento: 100,
    cif_alocados: 0,
    mp_insumos: [], // { nome, quantidade, custo_unitario, total }
    mod_horas: [],  // { descricao, horas, custo_hora, total }
    custo_unitario_final: 0
  });

  useEffect(() => {
    setProdutos(storage.get('PRODUTOS'));
    if (id) {
      const item = storage.getById('FICHA_TECNICA', id);
      if (item) setFormData(item);
    }
  }, [id]);

  const handleProductLink = (prodId) => {
      const prod = produtos.find(p => p.id === prodId);
      if (prod) {
          setFormData({
              ...formData,
              codigo: prod.codigo,
              nome: prod.nome,
              descricao: prod.descricao || ''
          });
      }
  };

  // Calculation Logic
  const calculateTotal = (data = formData) => {
      const totalMP = data.mp_insumos.reduce((acc, item) => acc + (parseFloat(item.quantidade) * parseFloat(item.custo_unitario)), 0);
      const totalMOD = data.mod_horas.reduce((acc, item) => acc + (parseFloat(item.horas) * parseFloat(item.custo_hora)), 0);
      const totalCIF = parseFloat(data.cif_alocados || 0);
      
      const subtotal = totalMP + totalMOD + totalCIF;
      const yieldFactor = parseFloat(data.rendimento || 100) / 100;
      
      return yieldFactor > 0 ? (subtotal / yieldFactor) : 0;
  };

  useEffect(() => {
      // Auto-recalculate total on changes
      const total = calculateTotal();
      setFormData(prev => ({ ...prev, custo_unitario_final: total }));
  }, [formData.mp_insumos, formData.mod_horas, formData.cif_alocados, formData.rendimento]);

  const addMP = () => {
      setFormData({
          ...formData,
          mp_insumos: [...formData.mp_insumos, { nome: '', quantidade: 1, custo_unitario: 0 }]
      });
  };

  const addMOD = () => {
      setFormData({
          ...formData,
          mod_horas: [...formData.mod_horas, { descricao: 'Operador', horas: 1, custo_hora: 0 }]
      });
  };

  const updateRow = (section, index, field, value) => {
      const newArr = [...formData[section]];
      newArr[index][field] = value;
      setFormData({ ...formData, [section]: newArr });
  };

  const removeRow = (section, index) => {
      const newArr = [...formData[section]];
      newArr.splice(index, 1);
      setFormData({ ...formData, [section]: newArr });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSimulation) {
        toast({ title: "Modo Simulação", description: "Alterações não são salvas neste modo." });
        return;
    }

    if (id) {
      storage.update('FICHA_TECNICA', id, formData);
      toast({ title: "Sucesso", description: "Ficha atualizada." });
    } else {
      storage.add('FICHA_TECNICA', formData);
      toast({ title: "Sucesso", description: "Ficha criada." });
    }
    navigate('/custos/ficha-tecnica');
  };

  const createNewVersion = () => {
      const parts = formData.versao.match(/v(\d+)/);
      const nextVer = parts ? `v${parseInt(parts[1]) + 1}` : 'v2';
      
      const newVersionData = {
          ...formData,
          id: undefined, // clear ID to create new
          versao: nextVer
      };
      
      storage.add('FICHA_TECNICA', newVersionData);
      toast({ title: "Nova Versão", description: `Versão ${nextVer} criada com sucesso!` });
      navigate('/custos/ficha-tecnica');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <>
      <Helmet><title>{id ? 'Editar' : 'Nova'} Ficha Técnica</title></Helmet>
      <PageHeader 
        title={id ? `Ficha Técnica: ${formData.codigo}` : 'Nova Ficha Técnica'} 
        showBack 
        action={id && (
            <Button onClick={createNewVersion} variant="outline" className="gap-2">
                <History className="h-4 w-4" /> Criar Nova Versão
            </Button>
        )}
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit} className={isSimulation ? "border-2 border-yellow-400 rounded-lg p-2" : ""}>
            {isSimulation && (
                <div className="bg-yellow-50 p-3 rounded mb-4 flex items-center gap-2 text-yellow-800 font-bold border border-yellow-200">
                    <AlertTriangle className="h-5 w-5" /> MODO SIMULAÇÃO ATIVO - Alterações não serão salvas
                </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vincular Produto (Opcional)</Label>
                            <select onChange={(e) => handleProductLink(e.target.value)} className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                                <option value="">Selecione...</option>
                                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                        </div>
                         <div className="space-y-2">
                            <Label>Versão</Label>
                            <Input name="versao" value={formData.versao} onChange={handleChange} readOnly className="bg-slate-50" />
                        </div>
                        <div className="space-y-2">
                            <Label>Código *</Label>
                            <Input name="codigo" value={formData.codigo} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Nome *</Label>
                            <Input name="nome" value={formData.nome} onChange={handleChange} required />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Descrição</Label>
                            <Textarea name="descricao" value={formData.descricao} onChange={handleChange} rows={2} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-center py-3">
                        <CardTitle className="text-base">MP / Insumos (Matéria Prima)</CardTitle>
                        <Button type="button" size="sm" variant="outline" onClick={addMP}><Plus className="h-3 w-3" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left p-2 pl-4">Item</th>
                                    <th className="w-24 p-2">Qtd</th>
                                    <th className="w-24 p-2">Custo Unit.</th>
                                    <th className="w-24 p-2 text-right">Total</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {formData.mp_insumos.map((item, i) => (
                                    <tr key={i}>
                                        <td className="p-2 pl-4"><Input value={item.nome} onChange={e => updateRow('mp_insumos', i, 'nome', e.target.value)} className="h-8" /></td>
                                        <td className="p-2"><Input type="number" step="0.01" value={item.quantidade} onChange={e => updateRow('mp_insumos', i, 'quantidade', e.target.value)} className="h-8" /></td>
                                        <td className="p-2"><Input type="number" step="0.01" value={item.custo_unitario} onChange={e => updateRow('mp_insumos', i, 'custo_unitario', e.target.value)} className="h-8" /></td>
                                        <td className="p-2 text-right font-medium">{(item.quantidade * item.custo_unitario).toFixed(2)}</td>
                                        <td className="p-2 text-center"><button type="button" onClick={() => removeRow('mp_insumos', i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row justify-between items-center py-3">
                        <CardTitle className="text-base">MOD (Mão de Obra Direta)</CardTitle>
                        <Button type="button" size="sm" variant="outline" onClick={addMOD}><Plus className="h-3 w-3" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left p-2 pl-4">Descrição</th>
                                    <th className="w-24 p-2">Horas</th>
                                    <th className="w-24 p-2">Custo/Hora</th>
                                    <th className="w-24 p-2 text-right">Total</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {formData.mod_horas.map((item, i) => (
                                    <tr key={i}>
                                        <td className="p-2 pl-4"><Input value={item.descricao} onChange={e => updateRow('mod_horas', i, 'descricao', e.target.value)} className="h-8" /></td>
                                        <td className="p-2"><Input type="number" step="0.01" value={item.horas} onChange={e => updateRow('mod_horas', i, 'horas', e.target.value)} className="h-8" /></td>
                                        <td className="p-2"><Input type="number" step="0.01" value={item.custo_hora} onChange={e => updateRow('mod_horas', i, 'custo_hora', e.target.value)} className="h-8" /></td>
                                        <td className="p-2 text-right font-medium">{(item.horas * item.custo_hora).toFixed(2)}</td>
                                        <td className="p-2 text-center"><button type="button" onClick={() => removeRow('mod_horas', i)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Custos Indiretos & Eficiência</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>CIF Alocados (Valor)</Label>
                            <Input type="number" step="0.01" name="cif_alocados" value={formData.cif_alocados} onChange={handleChange} />
                            <p className="text-xs text-slate-400">Energia, Aluguel rateado, Depreciação...</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Rendimento / Eficiência (%)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" min="1" max="100" name="rendimento" value={formData.rendimento} onChange={handleChange} />
                                <span className="text-slate-500 font-bold">%</span>
                            </div>
                            <p className="text-xs text-slate-400">Se menor que 100%, aumenta o custo unitário.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-2 ${isSimulation ? 'border-yellow-400 bg-yellow-50/20' : 'border-blue-100 bg-blue-50/20'}`}>
                    <CardHeader><CardTitle>Custo Final Calculado</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-slate-800 text-center py-4">
                            R$ {formData.custo_unitario_final.toFixed(2)}
                        </div>
                        <div className="text-center text-xs text-slate-500 mb-4">Por Unidade Produzida</div>
                        
                        <Button 
                            type="button" 
                            variant={isSimulation ? "destructive" : "outline"} 
                            className="w-full gap-2 mb-2" 
                            onClick={() => setIsSimulation(!isSimulation)}
                        >
                            <RefreshCcw className="h-4 w-4" /> {isSimulation ? 'Sair da Simulação' : 'Simular Cenário'}
                        </Button>
                        
                        {!isSimulation && (
                             <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                                {id ? 'Salvar Alterações' : 'Criar Ficha'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </form>
      </motion.div>
    </>
  );
}

export default FichaTecnicaForm;