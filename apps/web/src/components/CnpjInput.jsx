import React, { useRef, useState } from 'react';
import { Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cnpjService } from '@/lib/cnpjService';
import { formatCnpj, unformatCnpj, isCnpjValid } from '@/lib/cnpjUtils';

// CPF (até 11 dígitos) ou CNPJ (14) com máscara.
export const formatarDocumento = (valor) => {
  const d = unformatCnpj(valor).slice(0, 14);
  if (d.length <= 11) return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  return formatCnpj(d);
};

// Campo de CPF/CNPJ que, ao completar um CNPJ válido, consulta a Receita e devolve os dados em onDataFound.
// onChange recebe um evento no formato { target: { name, value } } para encaixar nos formulários que já usam handleChange.
// auto=false: só consulta pelo botão da lupa (use ao editar um cadastro existente, para não sobrescrever dados sem querer).
const CnpjInput = ({ id, name, value, onChange, onDataFound, auto = true, required, placeholder = '00.000.000/0000-00', disabled }) => {
  const [estado, setEstado] = useState(null); // { tipo: 'buscando' | 'ok' | 'erro', texto }
  const ultimo = useRef('');

  const consultar = async (digitos) => {
    ultimo.current = digitos;
    setEstado({ tipo: 'buscando', texto: 'Consultando a Receita Federal…' });
    const r = await cnpjService.fetchCnpjData(digitos);
    if (ultimo.current !== digitos) return; // o usuário já mudou o número
    if (r.success) {
      setEstado({ tipo: 'ok', texto: 'Dados da Receita preenchidos. Confira e ajuste se precisar.' });
      if (onDataFound) onDataFound(r.data);
    } else {
      setEstado({ tipo: 'erro', texto: r.error });
    }
  };

  const mudou = (e) => {
    const formatado = formatarDocumento(e.target.value);
    onChange({ target: { name, value: formatado } });
    const d = unformatCnpj(formatado);
    if (d.length < 14) { ultimo.current = ''; if (estado) setEstado(null); return; }
    if (auto && d.length === 14 && isCnpjValid(d) && d !== ultimo.current) consultar(d);
    else if (d.length === 14 && !isCnpjValid(d)) setEstado({ tipo: 'erro', texto: 'CNPJ inválido (confira os dígitos).' });
  };

  const manual = () => {
    const d = unformatCnpj(value);
    if (d.length !== 14) { setEstado({ tipo: 'erro', texto: 'Digite os 14 números do CNPJ para consultar.' }); return; }
    consultar(d);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input id={id} name={name} value={value} onChange={mudou} required={required} placeholder={placeholder} disabled={disabled} inputMode="numeric" maxLength={18} className="font-mono" />
        <Button type="button" variant="outline" size="icon" onClick={manual} disabled={disabled || estado?.tipo === 'buscando'} title="Buscar os dados deste CNPJ na Receita Federal">
          {estado?.tipo === 'buscando' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {estado && (
        <p className={`text-xs flex items-center gap-1.5 ${estado.tipo === 'ok' ? 'text-emerald-600' : estado.tipo === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`}>
          {estado.tipo === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" /> : estado.tipo === 'erro' ? <AlertCircle className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {estado.texto}
        </p>
      )}
    </div>
  );
};

export default CnpjInput;
