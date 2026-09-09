import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { erpServices } from '@/lib/erpServices';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, Calendar } from 'lucide-react';
import { FEBRABAN_BANKS } from '@/lib/febrabanBanks';

const BancosForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCustomBank, setIsCustomBank] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    agencia: '',
    conta: '',
    tipo_conta: 'Corrente',
    saldo: '',
    data_saldo_inicial: '',
    ativo: true
  });

  useEffect(() => {
    if (id) {
      setLoading(true);
      erpServices.bancos.read(id).then(res => {
        if (res.success) {
          const data = res.data;
          setFormData({
            ...data,
            saldo: data.saldo !== undefined && data.saldo !== null ? data.saldo : '',
            data_saldo_inicial: data.data_saldo_inicial || ''
          });
          
          // Check if the loaded bank is in our list
          const isStandard = FEBRABAN_BANKS.some(b => b.code === data.codigo);
          setIsCustomBank(!isStandard);
        } else {
          toast({ title: 'Erro', description: res.error, variant: 'destructive' });
          navigate('/cadastros/bancos');
        }
        setLoading(false);
      });
    }
  }, [id, navigate, toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, ativo: checked }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBankSelection = (value) => {
    if (value === 'custom') {
      setIsCustomBank(true);
      setFormData(prev => ({ ...prev, codigo: '', nome: '' }));
    } else {
      setIsCustomBank(false);
      const selectedBank = FEBRABAN_BANKS.find(b => b.code === value);
      if (selectedBank) {
        setFormData(prev => ({ 
          ...prev, 
          codigo: selectedBank.code,
          nome: selectedBank.name 
        }));
      }
    }
  };

  const parseCurrency = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    // Replace comma with dot if user typed it, remove other non-numeric chars except dot/minus
    const cleaned = value.toString().replace(',', '.').replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate numeric fields before submission
      const saldoNumeric = parseCurrency(formData.saldo);
      
      if (isNaN(saldoNumeric)) {
        throw new Error("O valor do saldo é inválido");
      }

      // Validate: if saldo is provided, data_saldo_inicial is required
      if (saldoNumeric !== 0 && !formData.data_saldo_inicial) {
        throw new Error("A data do saldo inicial é obrigatória quando há um saldo inicial");
      }

      // Validate: data_saldo_inicial cannot be in the future
      if (formData.data_saldo_inicial) {
        const saldoDate = new Date(formData.data_saldo_inicial);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (saldoDate > today) {
          throw new Error("A data do saldo inicial não pode ser no futuro");
        }
      }

      // Prepare payload with clean numbers
      const payload = {
        ...formData,
        saldo: saldoNumeric,
        data_saldo_inicial: formData.data_saldo_inicial || null,
        // Ensure codigo is string
        codigo: formData.codigo?.toString() || ''
      };

      const res = id 
        ? await erpServices.bancos.update(id, payload) 
        : await erpServices.bancos.create(payload);

      if (res.success) {
        toast({ title: 'Sucesso', description: 'Banco salvo com sucesso.', variant: 'success' });
        navigate('/cadastros/bancos');
      } else {
        toast({ title: 'Erro', description: res.error || 'Erro ao salvar', variant: 'destructive' });
      }
    } catch(err) {
      toast({ title: 'Erro', description: err.message || 'Erro de conexão.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/cadastros/bancos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{id ? "Editar Conta Bancária" : "Nova Conta Bancária"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bank Selection */}
              <div className="space-y-2">
                <Label htmlFor="bancoSelect">Instituição Bancária</Label>
                <Select 
                  onValueChange={handleBankSelection} 
                  value={isCustomBank ? 'custom' : formData.codigo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {FEBRABAN_BANKS.map(bank => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.code} - {bank.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" className="font-semibold text-primary border-t mt-1 pt-1">
                      + Adicionar Banco Customizado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Name */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Conta / Banco *</Label>
                <Input
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Conta Principal Bradesco"
                  required
                />
              </div>

              {/* Custom Code Input (only visible if custom) */}
              {isCustomBank && (
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código do Banco (Manual)</Label>
                  <Input
                    id="codigo"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    placeholder="Ex: 999"
                  />
                </div>
              )}

              {/* Agency */}
              <div className="space-y-2">
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  name="agencia"
                  value={formData.agencia}
                  onChange={handleChange}
                  placeholder="Ex: 1234-5"
                />
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="conta">Número da Conta</Label>
                <Input
                  id="conta"
                  name="conta"
                  value={formData.conta}
                  onChange={handleChange}
                  placeholder="Ex: 12345-6"
                />
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                <Select 
                  value={formData.tipo_conta} 
                  onValueChange={(val) => handleSelectChange('tipo_conta', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrente">Conta Corrente</SelectItem>
                    <SelectItem value="Poupanca">Conta Poupança</SelectItem>
                    <SelectItem value="Investimento">Conta Investimento</SelectItem>
                    <SelectItem value="Caixa">Caixa Físico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Balance */}
              <div className="space-y-2">
                <Label htmlFor="saldo">Saldo Inicial (R$)</Label>
                <Input
                  id="saldo"
                  name="saldo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.saldo}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Use ponto para decimais (ex: 1500.50)
                </p>
              </div>

              {/* Initial Balance Date */}
              <div className="space-y-2">
                <Label htmlFor="data_saldo_inicial" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data do Saldo Inicial {parseCurrency(formData.saldo) !== 0 && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="data_saldo_inicial"
                  name="data_saldo_inicial"
                  type="date"
                  value={formData.data_saldo_inicial}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  required={parseCurrency(formData.saldo) !== 0}
                  className="text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  {parseCurrency(formData.saldo) !== 0 
                    ? "Obrigatório quando há saldo inicial" 
                    : "Data de referência para o saldo informado"}
                </p>
              </div>

              {/* Active Status */}
              <div className="space-y-2 flex flex-col justify-end pb-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">
                    {formData.ativo ? 'Conta Ativa' : 'Conta Inativa'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/cadastros/bancos')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {id ? 'Salvar Alterações' : 'Criar Conta Bancária'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BancosForm;