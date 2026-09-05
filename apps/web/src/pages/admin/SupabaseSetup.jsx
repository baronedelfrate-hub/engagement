import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Database, Play, RefreshCw, AlertTriangle, FileCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { checkTablesExist, initializeBPOTables, seedInitialData } from '@/lib/supabaseInitService';
import { BPO_TABLES } from '@/lib/supabaseTableUtils';
import { supabase } from '@/services/supabaseClient';

const SupabaseSetup = () => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [tableStatus, setTableStatus] = useState({});
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
  };

  const checkStatus = async () => {
    setStatus('loading');
    addLog('Verificando conexão e tabelas...', 'info');
    
    // Defensive check for Supabase client
    if (!supabase || supabase.isConnected === false) {
        setStatus('error');
        setMessage('Cliente Supabase não configurado. Verifique as variáveis de ambiente.');
        addLog('Erro: Cliente Supabase não configurado.', 'error');
        return;
    }

    const result = await checkTablesExist();
    
    if (!result.success && result.message.includes('não inicializado')) {
        setStatus('error');
        setMessage(result.message);
        addLog(result.message, 'error');
        return;
    }

    const newTableStatus = {};
    if (result.results) {
        Object.entries(result.results).forEach(([table, exists]) => {
            newTableStatus[table] = exists;
            addLog(`Tabela ${table}: ${exists ? 'Encontrada' : 'Não encontrada'}`, exists ? 'success' : 'warning');
        });
    }
    setTableStatus(newTableStatus);
    
    const allExist = Object.values(newTableStatus).every(v => v === true);
    if (allExist && Object.keys(newTableStatus).length > 0) {
        setStatus('success');
        setMessage('Todas as tabelas estão configuradas corretamente.');
    } else {
        setStatus('idle');
        setMessage('Algumas tabelas estão faltando.');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleInitialize = async () => {
    setStatus('loading');
    addLog('Iniciando processo de configuração...', 'info');
    
    if (!supabase || supabase.isConnected === false) {
        setStatus('error');
        setMessage('Cliente Supabase não configurado.');
        addLog('Erro: Cliente Supabase não configurado.', 'error');
        return;
    }

    const result = await initializeBPOTables();
    
    if (result.partial) {
        setStatus('warning');
        setMessage(result.message);
        addLog('Criação automática bloqueada pelo navegador.', 'warning');
        addLog('Por favor, copie o SQL abaixo e execute no Supabase.', 'info');
    } else if (result.success) {
        setStatus('success');
        setMessage(result.message);
        addLog('Inicialização concluída com sucesso!', 'success');
        checkStatus();
    } else {
        setStatus('error');
        setMessage(result.message);
        addLog(`Erro: ${result.message}`, 'error');
    }
  };

  const handleSeed = async () => {
    setStatus('loading');
    addLog('Inserindo dados de teste...', 'info');
    
    if (!supabase || supabase.isConnected === false) {
        setStatus('error');
        setMessage('Cliente Supabase não configurado.');
        addLog('Erro: Cliente Supabase não configurado.', 'error');
        return;
    }

    const result = await seedInitialData();
    
    if (result.success) {
        addLog(result.message, 'success');
        setStatus('success');
    } else {
        addLog(result.message, 'error');
        setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
             <Database className="h-8 w-8 text-primary" /> 
             Configuração do Supabase - BPO
           </h1>
           <p className="text-muted-foreground mt-2">
             Gerenciamento do esquema de banco de dados e inicialização do módulo.
           </p>
        </div>
        <div className="flex gap-3">
            <Button variant="outline" onClick={checkStatus} disabled={status === 'loading'}>
                <RefreshCw className={`h-4 w-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
                Verificar Status
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Status Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Estado das Tabelas</CardTitle>
            <CardDescription>Verificação em tempo real da estrutura do banco de dados.</CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
                <Alert variant={status === 'error' ? 'destructive' : 'default'} className="mb-6 bg-muted/50 border-none">
                    {status === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                    <AlertTitle>{status === 'error' ? 'Erro' : status === 'warning' ? 'Ação Manual Necessária' : 'Status'}</AlertTitle>
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BPO_TABLES.map((table) => (
                    <div key={table} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                        <span className="font-mono text-sm">{table}</span>
                        {tableStatus[table] ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Existe
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                                <XCircle className="h-3 w-3" /> Ausente
                            </Badge>
                        )}
                    </div>
                ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
             <Button variant="secondary" onClick={handleSeed} disabled={status === 'loading' || Object.values(tableStatus).every(v => !v)}>
                Carregar Dados de Teste
             </Button>
             <Button onClick={handleInitialize} disabled={status === 'loading'} className="gap-2">
                <Play className="h-4 w-4" /> Inicializar Tabelas
             </Button>
          </CardFooter>
        </Card>

        {/* Logs & Actions */}
        <div className="space-y-6">
            <Card className="h-[400px] flex flex-col">
                <CardHeader>
                    <CardTitle className="text-base">Logs de Execução</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-2">
                            {logs.length === 0 && <span className="text-sm text-muted-foreground">Nenhum log registrado.</span>}
                            {logs.map((log, i) => (
                                <div key={i} className="text-xs font-mono border-b pb-1 mb-1 last:border-0">
                                    <span className="text-muted-foreground">[{log.time}]</span>{' '}
                                    <span className={
                                        log.type === 'error' ? 'text-red-600' : 
                                        log.type === 'success' ? 'text-green-600' : 
                                        log.type === 'warning' ? 'text-amber-600' : 'text-blue-600'
                                    }>
                                        {log.msg}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-blue-800 flex items-center gap-2 text-base">
                        <FileCode className="h-4 w-4" /> Script SQL
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-700 mb-4">
                        Se a inicialização automática falhar, utilize o arquivo SQL gerado em <code>src/lib/supabase_bpo_init.sql</code>.
                    </p>
                    <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                        Copiar SQL para Clipboard
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default SupabaseSetup;