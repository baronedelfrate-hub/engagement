import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { storage } from '@/lib/storage';
import { F5_PERMISSIONS } from '@/lib/permissions';
import PermissionGate from '@/components/PermissionGate';
import { Search, RefreshCw } from 'lucide-react';

function F5AuditoriaLog() {
    const [logs, setLogs] = useState([]);
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');

    const loadLogs = () => {
        const allLogs = storage.get('LOGS_AUDITORIA') || [];
        setLogs(allLogs);
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchUser = filterUser ? log.usuario_id.toLowerCase().includes(filterUser.toLowerCase()) : true;
        const matchAction = (filterAction && filterAction !== 'ALL') ? log.acao.includes(filterAction) : true;
        return matchUser && matchAction;
    });

    return (
        <>
            <Helmet><title>Auditoria F5 - Logs</title></Helmet>
            <PageHeader title="Logs de Auditoria" description="Histórico completo de ações no sistema F5." />

            <PermissionGate permission={F5_PERMISSIONS.AUDIT_VIEW} fallback>
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Filtros</CardTitle>
                                <Button variant="ghost" size="sm" onClick={loadLogs}><RefreshCw className="h-4 w-4 mr-2"/> Atualizar</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <div className="flex-1">
                                <Input 
                                    placeholder="Filtrar por Usuário (ID)" 
                                    value={filterUser} 
                                    onChange={e => setFilterUser(e.target.value)}
                                    icon={<Search className="h-4 w-4 text-muted-foreground"/>}
                                />
                            </div>
                            <div className="w-64">
                                <Select value={filterAction} onValueChange={setFilterAction}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas as Ações" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todas as Ações</SelectItem>
                                        <SelectItem value="CREATE">Criação</SelectItem>
                                        <SelectItem value="UPDATE">Edição</SelectItem>
                                        <SelectItem value="DELETE">Exclusão</SelectItem>
                                        <SelectItem value="EXPORT">Exportação</SelectItem>
                                        <SelectItem value="UPLOAD">Upload</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted text-foreground font-medium">
                                        <tr>
                                            <th className="p-4 text-left">Data/Hora</th>
                                            <th className="p-4 text-left">Usuário</th>
                                            <th className="p-4 text-left">Ação</th>
                                            <th className="p-4 text-left">Entidade</th>
                                            <th className="p-4 text-left">IP</th>
                                            <th className="p-4 text-left">Detalhes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y bg-background">
                                        {filteredLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-muted transition-colors">
                                                <td className="p-4 text-muted-foreground whitespace-nowrap">
                                                    {new Date(log.data_hora).toLocaleString()}
                                                </td>
                                                <td className="p-4 font-medium text-foreground">{log.usuario_id}</td>
                                                <td className="p-4">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${
                                                        log.acao === 'DELETE' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' :
                                                        log.acao === 'UPDATE' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' :
                                                        'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                                                    }`}>
                                                        {log.acao}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-muted-foreground">{log.tabela_afetada}</td>
                                                <td className="p-4 text-muted-foreground text-xs">{log.ip}</td>
                                                <td className="p-4 text-muted-foreground max-w-md truncate" title={log.details}>
                                                    {log.details || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredLogs.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-muted-foreground">Nenhum registro encontrado.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PermissionGate>
        </>
    );
}

export default F5AuditoriaLog;