import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Package, Wrench } from 'lucide-react';
import ItemTaxModal from './ItemTaxModal';
import { useItemClassification } from '@/hooks/useItemClassification';
import { Skeleton } from '@/components/ui/skeleton';

export default function PedidoVendaItensSection({ itens, setItens }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    
    const { 
        categorias, 
        subcategorias, 
        centrosCusto, 
        projetos, 
        produtos,
        servicos,
        loading 
    } = useItemClassification();

    const getItemName = (item) => {
        const type = item.tipo_item || (item.servico_id ? 'servico' : 'produto');
        if (type === 'produto') {
            if (!item.produto_id) return item.descricao || 'Item sem cadastro';
            const p = produtos.find(x => x.id === item.produto_id);
            return p ? p.nome : item.descricao || 'Desconhecido';
        } else {
            if (!item.servico_id) return item.descricao || 'Serviço sem cadastro';
            const s = servicos.find(x => x.id === item.servico_id);
            return s ? s.nome : item.descricao || 'Desconhecido';
        }
    };

    const getCatName = (id) => categorias.find(c => c.id === id)?.nome || '-';
    const getSubcatName = (id) => subcategorias.find(c => c.id === id)?.nome || '-';
    const getCcName = (id) => centrosCusto.find(c => c.id === id)?.nome || '-';
    const getProjName = (id) => projetos.find(c => c.id === id)?.nome || '-';

    const handleAdd = () => {
        setEditingIndex(null);
        setModalOpen(true);
    };

    const handleEdit = (index) => {
        setEditingIndex(index);
        setModalOpen(true);
    };

    const handleDelete = (index) => {
        const newItens = [...itens];
        newItens.splice(index, 1);
        setItens(newItens);
    };

    const handleSaveItem = (item) => {
        const newItens = [...itens];
        if (editingIndex !== null) {
            newItens[editingIndex] = item;
        } else {
            newItens.push(item);
        }
        setItens(newItens);
        setModalOpen(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Itens do Documento</CardTitle>
                <Button onClick={handleAdd} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
                    <Plus className="w-4 h-4 mr-2"/> Adicionar Item
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border rounded-md">
                        <thead className="bg-muted border-b text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2 w-16">Tipo</th>
                                <th className="px-3 py-2">Item / Descrição</th>
                                <th className="px-3 py-2">Categoria</th>
                                <th className="px-3 py-2">Subcategoria</th>
                                <th className="px-3 py-2">C. Custos</th>
                                <th className="px-3 py-2 text-right">Qtd</th>
                                <th className="px-3 py-2 text-right">V. Unit.</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-3 py-2 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && itens.length > 0 && (
                                <tr>
                                    <td colSpan="9" className="px-3 py-4 text-center">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && itens.length === 0 && (
                                <tr><td colSpan="9" className="px-3 py-6 text-center text-muted-foreground">Nenhum item adicionado. Clique no botão acima para inserir produtos ou serviços.</td></tr>
                            )}
                            {!loading && itens.map((item, idx) => {
                                const isProduct = (item.tipo_item === 'produto' || (!item.tipo_item && item.produto_id));
                                const typeName = isProduct ? 'Produto' : 'Serviço';
                                const TypeIcon = isProduct ? Package : Wrench;
                                const actualName = getItemName(item);
                                
                                return (
                                <tr key={idx} className="hover:bg-muted/50">
                                    <td className="px-3 py-2">
                                        <Badge variant="outline" className={`flex items-center gap-1 w-max ${isProduct ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'}`}>
                                            <TypeIcon className="w-3 h-3" />
                                            {typeName}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2 font-medium text-foreground">
                                        <div className="flex flex-col">
                                            <span>{actualName}</span>
                                            {item.descricao && item.descricao !== actualName && (
                                                <span className="text-xs text-muted-foreground font-normal">{item.descricao}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs">{getCatName(item.categoria_id)}</td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs">{getSubcatName(item.subcategoria_id)}</td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs">{getCcName(item.centro_custos_id)}</td>
                                    <td className="px-3 py-2 text-right">{item.quantidade}</td>
                                    <td className="px-3 py-2 text-right">R$ {parseFloat(item.valor_unitario||0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-foreground">R$ {parseFloat(item.valor_total||0).toFixed(2)}</td>
                                    <td className="px-3 py-2 flex justify-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30" onClick={() => handleEdit(idx)}><Edit2 className="w-4 h-4"/></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => handleDelete(idx)}><Trash2 className="w-4 h-4"/></Button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                <ItemTaxModal 
                    isOpen={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    onSave={handleSaveItem} 
                    itemData={editingIndex !== null ? itens[editingIndex] : null}
                />
            </CardContent>
        </Card>
    );
}