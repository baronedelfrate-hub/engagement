import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function DynamicItemSelector({ itemType, items, loading, selectedId, onSelect }) {
    const isProduto = itemType === 'produto';
    const label = isProduto ? 'Produto *' : 'Serviço *';
    const placeholder = isProduto ? 'Selecione um produto...' : 'Selecione um serviço...';

    return (
        <div className="space-y-1">
            <Label className="flex items-center justify-between">
                {label}
                {loading && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
            </Label>
            <Select 
                value={selectedId || 'none'} 
                onValueChange={v => onSelect(v === 'none' ? null : v)}
                disabled={loading}
            >
                <SelectTrigger>
                    <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Item sem cadastro (Informar descrição manualmente)</SelectItem>
                    {items.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                            {item.sku ? `[${item.sku}] ` : ''}{item.nome}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}