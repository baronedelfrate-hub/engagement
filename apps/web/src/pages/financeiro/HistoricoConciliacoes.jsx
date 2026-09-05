import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { storage } from '@/lib/storage';

const HistoricoConciliacoes = () => {
    // This would list past reconciliation sessions
    // Mock data for visualization
    const historico = [
        { id: 1, data: '2023-10-01', banco: 'Banco Demo', usuario: 'ADM001', status: 'Concluído' },
        { id: 2, data: '2023-10-15', banco: 'Banco Demo', usuario: 'ADM001', status: 'Concluído' },
    ];

    return (
        <>
            <Helmet><title>Histórico de Conciliações</title></Helmet>
            <PageHeader title="Histórico de Conciliações" description="Registro de fechamentos bancários." />
            
            <Card>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 font-medium text-slate-700">
                            <tr>
                                <th className="p-4 text-left">Data Fechamento</th>
                                <th className="p-4 text-left">Banco</th>
                                <th className="p-4 text-left">Responsável</th>
                                <th className="p-4 text-left">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {historico.map(h => (
                                <tr key={h.id} className="hover:bg-slate-50">
                                    <td className="p-4">{h.data}</td>
                                    <td className="p-4">{h.banco}</td>
                                    <td className="p-4">{h.usuario}</td>
                                    <td className="p-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{h.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </>
    );
};

export default HistoricoConciliacoes;