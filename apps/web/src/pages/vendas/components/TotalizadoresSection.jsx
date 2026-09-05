import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function TotalizadoresSection({ itens, frete }) {
    const totals = useMemo(() => {
        let subtotal = 0;
        let desconto = 0;
        let acrescimo = 0;
        let icms = 0;
        let ipi = 0;
        let pis = 0;
        let cofins = 0;

        itens.forEach(i => {
            const q = parseFloat(i.quantidade) || 0;
            const u = parseFloat(i.valor_unitario) || 0;
            subtotal += (q * u);
            desconto += parseFloat(i.desconto) || 0;
            acrescimo += parseFloat(i.acrescimo) || 0;
            icms += parseFloat(i.valor_icms) || 0;
            ipi += parseFloat(i.valor_ipi) || 0;
            pis += parseFloat(i.valor_pis) || 0;
            cofins += parseFloat(i.valor_cofins) || 0;
        });

        const vFrete = parseFloat(frete) || 0;
        const total = (subtotal - desconto + acrescimo + ipi + vFrete);

        return { subtotal, desconto, acrescimo, icms, ipi, pis, cofins, total };
    }, [itens, frete]);

    const formatCurrency = (val) => `R$ ${val.toFixed(2)}`;

    return (
        <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-inner">
            <CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Subtotal Produtos</p>
                    <p className="font-semibold">{formatCurrency(totals.subtotal)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Descontos</p>
                    <p className="font-semibold text-red-500">-{formatCurrency(totals.desconto)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Acréscimos</p>
                    <p className="font-semibold text-green-600">+{formatCurrency(totals.acrescimo)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Total ICMS</p>
                    <p className="font-semibold">{formatCurrency(totals.icms)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Total IPI</p>
                    <p className="font-semibold">{formatCurrency(totals.ipi)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">PIS/COFINS</p>
                    <p className="font-semibold">{formatCurrency(totals.pis + totals.cofins)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">Frete</p>
                    <p className="font-semibold">{formatCurrency(parseFloat(frete)||0)}</p>
                </div>
                <div className="space-y-1 border-l pl-4">
                    <p className="text-sm font-bold text-slate-600 uppercase">Valor Total</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.total)}</p>
                </div>
            </CardContent>
        </Card>
    );
}