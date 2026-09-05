import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function FreteEPagamentoSection({ pedido, onChange }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle className="text-lg">Frete e Transporte</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label>Modalidade de Frete</Label>
                        <Select value={pedido.tipo_frete || ''} onValueChange={v => onChange('tipo_frete', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CIF">CIF (Emitente)</SelectItem>
                                <SelectItem value="FOB">FOB (Destinatário)</SelectItem>
                                <SelectItem value="SEM_FRETE">Sem Frete</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label>Valor do Frete (R$)</Label>
                        <Input type="number" min="0" step="0.01" value={pedido.valor_frete || 0} onChange={e => onChange('valor_frete', e.target.value)} />
                    </div>

                    <div className="space-y-1 col-span-2">
                        <Label>Nome da Transportadora</Label>
                        <Input value={pedido.transportadora_nome || ''} onChange={e => onChange('transportadora_nome', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>CNPJ da Transportadora</Label>
                        <Input value={pedido.transportadora_cnpj || ''} onChange={e => onChange('transportadora_cnpj', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Placa do Veículo</Label>
                        <Input value={pedido.placa_veiculo || ''} onChange={e => onChange('placa_veiculo', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Nome do Motorista</Label>
                        <Input value={pedido.motorista_nome || ''} onChange={e => onChange('motorista_nome', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>CPF do Motorista</Label>
                        <Input value={pedido.motorista_cpf || ''} onChange={e => onChange('motorista_cpf', e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="text-lg">Pagamento e Observações</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label>Forma de Pagamento</Label>
                        <Select value={pedido.forma_pagamento || ''} onValueChange={v => onChange('forma_pagamento', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                <SelectItem value="cheque">Cheque</SelectItem>
                                <SelectItem value="cartao">Cartão</SelectItem>
                                <SelectItem value="boleto">Boleto Bancário</SelectItem>
                                <SelectItem value="transferencia">Transferência/PIX</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label>Condição de Pagamento</Label>
                        <Select value={pedido.condicao_pagamento || ''} onValueChange={v => onChange('condicao_pagamento', v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="a_vista">À Vista</SelectItem>
                                <SelectItem value="30_dias">30 Dias</SelectItem>
                                <SelectItem value="30_60_dias">30/60 Dias</SelectItem>
                                <SelectItem value="parcelado">Parcelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="space-y-1">
                        <Label>Número de Parcelas</Label>
                        <Input type="number" min="1" value={pedido.numero_parcelas || 1} onChange={e => onChange('numero_parcelas', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Primeiro Vencimento</Label>
                        <Input type="date" value={pedido.data_vencimento || ''} onChange={e => onChange('data_vencimento', e.target.value)} />
                    </div>

                    <div className="space-y-1 col-span-2">
                        <Label>Observações do Pedido / Fisco</Label>
                        <Textarea rows={4} value={pedido.observacoes || ''} onChange={e => onChange('observacoes', e.target.value)} placeholder="Informações adicionais para a nota fiscal..." />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}