import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useItemClassification } from '@/hooks/useItemClassification';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import ItemTypeToggle from './ItemTypeToggle';
import DynamicItemSelector from './DynamicItemSelector';
import { validateItemFields } from '@/lib/nfeFieldValidator';

export default function ItemTaxModal({ isOpen, onClose, onSave, itemData }) {
    const { 
        categorias, 
        centrosCusto, 
        projetos, 
        produtos, 
        servicos,
        getSubcategoriasPorCategoria, 
        loading,
        error 
    } = useItemClassification();
    
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        tipo_item: 'produto',
        produto_id: '',
        servico_id: '',
        descricao: '',
        ncm: '',
        cfop: '',
        codigo_atividade: '',
        cnae: '',
        quantidade: 1,
        valor_unitario: 0,
        desconto: 0,
        acrescimo: 0,
        aliquota_icms: 0,
        base_calculo_icms: 0,
        valor_icms: 0,
        aliquota_ipi: 0,
        valor_ipi: 0,
        aliquota_pis: 0,
        valor_pis: 0,
        aliquota_cofins: 0,
        valor_cofins: 0,
        valor_total: 0,
        categoria_id: null,
        subcategoria_id: null,
        centro_custos_id: null,
        projeto_id: null
    });

    useEffect(() => {
        if (itemData) {
            setFormData({ 
                ...itemData,
                tipo_item: itemData.tipo_item || (itemData.servico_id ? 'servico' : 'produto'),
                codigo_atividade: itemData.codigo_atividade || '',
                cnae: itemData.cnae || ''
            });
        } else {
            setFormData({
                tipo_item: 'produto', produto_id: '', servico_id: '', descricao: '', ncm: '', cfop: '', 
                codigo_atividade: '', cnae: '',
                quantidade: 1, valor_unitario: 0, desconto: 0, acrescimo: 0, 
                aliquota_icms: 0, base_calculo_icms: 0, valor_icms: 0, 
                aliquota_ipi: 0, valor_ipi: 0, aliquota_pis: 0, valor_pis: 0, aliquota_cofins: 0, valor_cofins: 0, valor_total: 0,
                categoria_id: null, subcategoria_id: null, centro_custos_id: null, projeto_id: null
            });
        }
    }, [itemData, isOpen]);

    useEffect(() => {
        if (error) {
            toast({
                title: 'Erro de Carregamento',
                description: 'Não foi possível carregar as listas de seleção. ' + error,
                variant: 'destructive'
            });
        }
    }, [error, toast]);

    const handleCalcAndSet = (field, value) => {
        const newData = { ...formData, [field]: value };
        
        const q = parseFloat(newData.quantidade) || 0;
        const u = parseFloat(newData.valor_unitario) || 0;
        const d = parseFloat(newData.desconto) || 0;
        const a = parseFloat(newData.acrescimo) || 0;

        let base = (q * u) - d + a;
        if (base < 0) base = 0;

        newData.base_calculo_icms = base;
        newData.valor_icms = base * ((parseFloat(newData.aliquota_icms) || 0) / 100);
        newData.valor_ipi = base * ((parseFloat(newData.aliquota_ipi) || 0) / 100);
        newData.valor_pis = base * ((parseFloat(newData.aliquota_pis) || 0) / 100);
        newData.valor_cofins = base * ((parseFloat(newData.aliquota_cofins) || 0) / 100);

        newData.valor_total = base + newData.valor_ipi;

        setFormData(newData);
    };

    const handleTypeChange = (newType) => {
        setFormData(prev => ({
            ...prev,
            tipo_item: newType,
            produto_id: '',
            servico_id: '',
            descricao: '',
            valor_unitario: 0,
            quantidade: 1,
            desconto: 0,
            acrescimo: 0,
            ncm: '',
            cfop: '',
            codigo_atividade: '',
            cnae: '',
            base_calculo_icms: 0,
            valor_icms: 0,
            valor_ipi: 0,
            valor_pis: 0,
            valor_cofins: 0,
            valor_total: 0
        }));
    };

    const handleItemSelect = (itemId) => {
        if (!itemId) {
            handleCalcAndSet(formData.tipo_item === 'produto' ? 'produto_id' : 'servico_id', null);
            return;
        }

        let selectedItem;
        let newData = { ...formData };

        if (formData.tipo_item === 'produto') {
            selectedItem = produtos?.find(p => p.id === itemId);
            if (selectedItem) {
                newData.produto_id = itemId;
                newData.servico_id = null;
                newData.descricao = selectedItem.nome;
                newData.valor_unitario = selectedItem.preco_venda || 0;
                newData.ncm = selectedItem.ncm || '';
                newData.cfop = selectedItem.cfop || '';
                newData.codigo_atividade = '';
                newData.cnae = '';
            }
        } else {
            selectedItem = servicos?.find(s => s.id === itemId);
            if (selectedItem) {
                newData.servico_id = itemId;
                newData.produto_id = null;
                newData.descricao = selectedItem.nome;
                newData.valor_unitario = selectedItem.preco || selectedItem.valor_padrao || 0;
                newData.ncm = ''; 
                newData.cfop = ''; 
                newData.codigo_atividade = selectedItem.codigo_servico_lc116 || '';
                newData.cnae = selectedItem.cnae || '';
            }
        }

        if (selectedItem) {
            const q = parseFloat(newData.quantidade) || 0;
            const u = parseFloat(newData.valor_unitario) || 0;
            const d = parseFloat(newData.desconto) || 0;
            const a = parseFloat(newData.acrescimo) || 0;
            let base = (q * u) - d + a;
            if (base < 0) base = 0;

            newData.base_calculo_icms = base;
            newData.valor_icms = base * ((parseFloat(newData.aliquota_icms) || 0) / 100);
            newData.valor_ipi = base * ((parseFloat(newData.aliquota_ipi) || 0) / 100);
            newData.valor_pis = base * ((parseFloat(newData.aliquota_pis) || 0) / 100);
            newData.valor_cofins = base * ((parseFloat(newData.aliquota_cofins) || 0) / 100);
            newData.valor_total = base + newData.valor_ipi;

            setFormData(newData);
        }
    };

    const onSubmit = () => {
        const itemErrors = validateItemFields(formData);
        
        if (itemErrors.length > 0) {
            toast({ title: 'Atenção', description: itemErrors.join(' | '), variant: 'destructive' });
            return;
        }

        if (!formData.categoria_id) {
            toast({ title: 'Atenção', description: 'A Categoria é obrigatória para classificação gerencial.', variant: 'destructive' });
            return;
        }
        if (!formData.centro_custos_id) {
            toast({ title: 'Atenção', description: 'O Centro de Custos é obrigatório para classificação gerencial.', variant: 'destructive' });
            return;
        }
        
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{itemData ? 'Editar Item' : 'Adicionar Item'}</DialogTitle>
                </DialogHeader>

                <ItemTypeToggle 
                    selectedType={formData.tipo_item} 
                    onTypeChange={handleTypeChange} 
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                    <div className="space-y-1 md:col-span-2">
                        <DynamicItemSelector 
                            itemType={formData.tipo_item}
                            items={formData.tipo_item === 'produto' ? (produtos || []) : (servicos || [])}
                            loading={loading}
                            selectedId={formData.tipo_item === 'produto' ? formData.produto_id : formData.servico_id}
                            onSelect={handleItemSelect}
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <Label>Descrição</Label>
                        <Input value={formData.descricao || ''} onChange={e => handleCalcAndSet('descricao', e.target.value)} placeholder="Descrição do item" />
                    </div>

                    {formData.tipo_item === 'produto' ? (
                        <>
                            <div className="space-y-1 md:col-span-2">
                                <Label>NCM <span className="text-red-500">*</span></Label>
                                <Input value={formData.ncm || ''} onChange={e => handleCalcAndSet('ncm', e.target.value)} placeholder="Ex: 0000.00.00" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label>CFOP <span className="text-red-500">*</span></Label>
                                <Input value={formData.cfop || ''} onChange={e => handleCalcAndSet('cfop', e.target.value)} placeholder="Ex: 5101" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-1 md:col-span-2">
                                <Label>Código de Atividade (LC 116/03) <span className="text-red-500">*</span></Label>
                                <Input value={formData.codigo_atividade || ''} onChange={e => handleCalcAndSet('codigo_atividade', e.target.value)} placeholder="Ex: 1.01" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label>CNAE <span className="text-red-500">*</span></Label>
                                <Input value={formData.cnae || ''} onChange={e => handleCalcAndSet('cnae', e.target.value)} placeholder="Ex: 6201-5/01" />
                            </div>
                        </>
                    )}

                    <div className="space-y-1">
                        <Label>Quantidade</Label>
                        <Input type="number" min="0" value={formData.quantidade} onChange={e => handleCalcAndSet('quantidade', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Valor Unitário</Label>
                        <Input type="number" min="0" step="0.01" value={formData.valor_unitario} onChange={e => handleCalcAndSet('valor_unitario', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Desconto (R$)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.desconto} onChange={e => handleCalcAndSet('desconto', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Acréscimo (R$)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.acrescimo} onChange={e => handleCalcAndSet('acrescimo', e.target.value)} />
                    </div>

                    {/* Classificação Section */}
                    <div className="col-span-full border-t pt-4 mt-2 font-medium text-sm text-muted-foreground uppercase">Classificação Gerencial</div>
                    
                    <div className="space-y-1">
                        <Label className="flex items-center justify-between">
                            Categoria *
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </Label>
                        <Select 
                            value={formData.categoria_id || 'none'} 
                            onValueChange={v => {
                                const val = v === 'none' ? null : v;
                                setFormData(prev => ({ ...prev, categoria_id: val, subcategoria_id: null }));
                            }}
                            disabled={loading}
                        >
                            <SelectTrigger className={!formData.categoria_id ? "border-red-300" : ""}><SelectValue placeholder={loading ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma</SelectItem>
                                {(categorias || []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>Subcategoria</Label>
                        <Select 
                            value={formData.subcategoria_id || 'none'} 
                            onValueChange={v => handleCalcAndSet('subcategoria_id', v === 'none' ? null : v)}
                            disabled={loading || !formData.categoria_id}
                        >
                            <SelectTrigger><SelectValue placeholder={loading ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhuma</SelectItem>
                                {getSubcategoriasPorCategoria(formData.categoria_id).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="flex items-center justify-between">
                            Centro de Custos *
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </Label>
                        <Select 
                            value={formData.centro_custos_id || 'none'} 
                            onValueChange={v => handleCalcAndSet('centro_custos_id', v === 'none' ? null : v)}
                            disabled={loading}
                        >
                            <SelectTrigger className={!formData.centro_custos_id ? "border-red-300" : ""}><SelectValue placeholder={loading ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {(centrosCusto || []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="flex items-center justify-between">
                            Projeto
                            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </Label>
                        <Select 
                            value={formData.projeto_id || 'none'} 
                            onValueChange={v => handleCalcAndSet('projeto_id', v === 'none' ? null : v)}
                            disabled={loading}
                        >
                            <SelectTrigger><SelectValue placeholder={loading ? "Carregando..." : "Selecione..."} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {(projetos || []).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tax Section */}
                    <div className="col-span-full border-t pt-4 mt-2 font-medium text-sm text-muted-foreground uppercase">Tributos (Alíquotas %)</div>
                    
                    <div className="space-y-1">
                        <Label>ICMS (%)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.aliquota_icms} onChange={e => handleCalcAndSet('aliquota_icms', e.target.value)} />
                        <span className="text-xs text-muted-foreground">Valor: R$ {formData.valor_icms.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                        <Label>IPI (%)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.aliquota_ipi} onChange={e => handleCalcAndSet('aliquota_ipi', e.target.value)} />
                        <span className="text-xs text-muted-foreground">Valor: R$ {formData.valor_ipi.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                        <Label>PIS (%)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.aliquota_pis} onChange={e => handleCalcAndSet('aliquota_pis', e.target.value)} />
                        <span className="text-xs text-muted-foreground">Valor: R$ {formData.valor_pis.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                        <Label>COFINS (%)</Label>
                        <Input type="number" min="0" step="0.01" value={formData.aliquota_cofins} onChange={e => handleCalcAndSet('aliquota_cofins', e.target.value)} />
                        <span className="text-xs text-muted-foreground">Valor: R$ {formData.valor_cofins.toFixed(2)}</span>
                    </div>

                    <div className="col-span-full border-t pt-4 mt-2 flex justify-end">
                        <div className="text-right">
                            <Label className="block text-sm text-muted-foreground mb-1">Valor Total do Item</Label>
                            <span className="text-2xl font-bold text-foreground">
                                R$ {(formData.valor_total || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Salvar Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}