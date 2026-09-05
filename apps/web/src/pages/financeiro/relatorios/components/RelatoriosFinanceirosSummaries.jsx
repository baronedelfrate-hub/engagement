import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Layers, Users, MapPin } from 'lucide-react';

const COLORS = ['#ea580c', '#1e3a8a', '#3b82f6', '#f97316', '#64748b']; // Orange, Navy, Blue, Light Orange, Slate

const formatCurrency = (val) => parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const RelatoriosFinanceirosSummaries = ({ data, source }) => {
    
    const isPagar = source === 'CONTAS_PAGAR';

    // Computations
    const summary = useMemo(() => {
        let total = 0;
        let pago = 0;
        let pendente = 0;
        
        const byDia = {};
        const byEntidade = {};
        const byCategoria = {};
        const byCentro = {};

        data.forEach(item => {
            const val = parseFloat(item.valor_original || 0);
            const isSettled = item.status === 'Pago' || item.status === 'Recebido';
            
            total += val;
            if (isSettled) pago += val; else pendente += val;

            // Grouping helpers
            const addGroup = (groupObj, key, label) => {
                const k = key || 'N/A';
                if (!groupObj[k]) groupObj[k] = { label: label || 'Não Informado', total: 0, pago: 0, pendente: 0 };
                groupObj[k].total += val;
                if (isSettled) groupObj[k].pago += val; else groupObj[k].pendente += val;
            };

            const diaFormatado = item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : 'Sem Data';
            addGroup(byDia, item.data_vencimento, diaFormatado);
            
            const entidadeId = isPagar ? item.fornecedor_id : item.cliente_id;
            const entidadeNome = isPagar ? item.fornecedor_nome : item.cliente_nome;
            addGroup(byEntidade, entidadeId, entidadeNome);
            
            addGroup(byCategoria, item.categoria_id, item.categoria_nome);
            addGroup(byCentro, item.centro_custo_id, item.centro_custo_nome);
        });

        const sortGroups = (obj) => Object.values(obj).sort((a, b) => b.total - a.total);

        return {
            geral: { total, pago, pendente },
            byDia: sortGroups(byDia),
            byEntidade: sortGroups(byEntidade),
            byCategoria: sortGroups(byCategoria),
            byCentro: sortGroups(byCentro)
        };
    }, [data, source]);

    const GeralCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 opacity-20 ${colorClass}`}></div>
            <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-400">{title}</p>
                        <p className="text-2xl sm:text-3xl font-bold text-white">{formatCurrency(value)}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-slate-800 ${colorClass.replace('bg-', 'text-')}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4 text-xs text-slate-500">{subtext}</div>
            </CardContent>
        </Card>
    );

    const TableSummary = ({ title, icon: Icon, dataList }) => (
        <Card className="bg-slate-900 border-slate-800 shadow-lg">
            <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm uppercase text-orange-500 flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[300px] overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-slate-400 font-medium sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-4 py-3 font-medium">Descrição</th>
                                <th className="px-4 py-3 font-medium text-right">Total</th>
                                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Pago/Rec.</th>
                                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Pendente</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {dataList.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhum dado encontrado</td></tr>
                            ) : (
                                dataList.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors text-slate-200">
                                        <td className="px-4 py-3 truncate max-w-[150px]" title={item.label}>{item.label}</td>
                                        <td className="px-4 py-3 text-right font-medium text-white">{formatCurrency(item.total)}</td>
                                        <td className="px-4 py-3 text-right text-emerald-400 hidden sm:table-cell">{formatCurrency(item.pago)}</td>
                                        <td className="px-4 py-3 text-right text-rose-400 hidden sm:table-cell">{formatCurrency(item.pendente)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );

    // Chart Data mapping (Top 5 + Outros)
    const getChartData = (dataList) => {
        if (dataList.length <= 5) return dataList.map(d => ({ name: d.label, value: d.total }));
        const top5 = dataList.slice(0, 5).map(d => ({ name: d.label, value: d.total }));
        const others = dataList.slice(5).reduce((acc, curr) => acc + curr.total, 0);
        return [...top5, { name: 'Outros', value: others }];
    };

    const chartCategoria = getChartData(summary.byCategoria);

    return (
        <div className="space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Secção A: Total Geral */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GeralCard 
                    title={isPagar ? "Total a Pagar" : "Total a Receber"}
                    value={summary.geral.total} 
                    subtext="Soma de todos os títulos filtrados"
                    icon={DollarSign}
                    colorClass="bg-blue-500"
                />
                <GeralCard 
                    title={isPagar ? "Total Pago" : "Total Recebido"}
                    value={summary.geral.pago} 
                    subtext="Títulos com status Pago/Recebido"
                    icon={TrendingUp}
                    colorClass="bg-emerald-500"
                />
                <GeralCard 
                    title="Total Pendente" 
                    value={summary.geral.pendente} 
                    subtext="Títulos aguardando liquidação"
                    icon={TrendingDown}
                    colorClass="bg-rose-500"
                />
            </div>

            {/* Secções Resumo */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TableSummary title="Resumo por Dia (Vencimento)" icon={TrendingUp} dataList={summary.byDia} />
                <TableSummary title={isPagar ? "Resumo por Fornecedor" : "Resumo por Cliente"} icon={Users} dataList={summary.byEntidade} />
                
                {/* Chart & Category Summary combo */}
                <div className="space-y-6">
                    <TableSummary title="Resumo por Categoria" icon={Layers} dataList={summary.byCategoria} />
                </div>
                
                <Card className="bg-slate-900 border-slate-800 shadow-lg flex flex-col">
                    <CardHeader className="pb-0 border-b border-slate-800">
                        <CardTitle className="text-sm uppercase text-orange-500">Distribuição por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center p-6 min-h-[300px]">
                        {chartCategoria.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={chartCategoria}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartCategoria.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => formatCurrency(value)}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-500">Sem dados para exibir</div>
                        )}
                    </CardContent>
                </Card>

                <TableSummary title="Resumo por Centro de Custo" icon={MapPin} dataList={summary.byCentro} />
            </div>
        </div>
    );
};

export default RelatoriosFinanceirosSummaries;