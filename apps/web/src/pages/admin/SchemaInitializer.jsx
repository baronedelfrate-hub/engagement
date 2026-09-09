import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { 
    Database, 
    Play, 
    Copy, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Code,
    RefreshCw,
    Search
} from 'lucide-react';
import { initializeERPSchema, validateTablesExist, ERP_SCHEMA_SQL } from '@/lib/supabaseSchemaInit';

const SchemaInitializer = () => {
    const [status, setStatus] = useState('idle'); // idle, running, success, error
    const [validationStatus, setValidationStatus] = useState('idle'); // idle, running, done
    const [validationResults, setValidationResults] = useState(null);
    const [logs, setLogs] = useState([]);
    const { toast } = useToast();

    const addLog = (msg, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, msg, type }]);
    };

    const handleInitialize = async () => {
        setStatus('running');
        setLogs([]);
        addLog("Iniciando processo de inicialização...", 'info');

        try {
            const result = await initializeERPSchema();
            
            if (result.success) {
                addLog(result.message, 'success');
                setStatus('success');
                toast({
                    title: "Sucesso",
                    description: "Comandos SQL executados com sucesso.",
                    variant: "success"
                });
            } else {
                addLog(result.message, 'error');
                addLog("Falha na execução automática. Utilize o método manual abaixo.", 'warning');
                setStatus('error');
            }
            
            // Auto validate after attempt
            handleValidate();

        } catch (error) {
            addLog(`Erro crítico: ${error.message}`, 'error');
            setStatus('error');
        }
    };

    const handleValidate = async () => {
        setValidationStatus('running');
        addLog("Verificando existência das tabelas...", 'info');
        
        try {
            const result = await validateTablesExist();
            setValidationResults(result);
            setValidationStatus('done');
            
            const total = result.existing.length + result.missing.length;
            const percent = Math.round((result.existing.length / total) * 100);
            
            if (result.missing.length === 0) {
                addLog(`Sucesso! Todas as ${total} tabelas foram encontradas.`, 'success');
            } else {
                addLog(`Atenção: ${result.missing.length} tabelas não foram encontradas.`, 'warning');
            }
        } catch (error) {
            addLog(`Erro na validação: ${error.message}`, 'error');
            setValidationStatus('idle');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(ERP_SCHEMA_SQL);
        toast({
            title: "Copiado!",
            description: "Script SQL copiado para a área de transferência.",
        });
        addLog("SQL copiado para a área de transferência.", 'info');
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Database className="h-8 w-8 text-primary" />
                        Inicializador de Banco de Dados
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Ferramenta para verificação e criação das tabelas do ERP no Supabase.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Validation & Actions */}
                <div className="space-y-6">
                    
                    {/* Validation Section */}
                    <Card className="border-t-4 border-t-blue-500">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Diagnóstico de Tabelas
                            </CardTitle>
                            <CardDescription>
                                Verifique quais tabelas do sistema já existem no seu banco de dados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button 
                                onClick={handleValidate}
                                disabled={validationStatus === 'running'}
                                className="w-full"
                                variant="outline"
                            >
                                {validationStatus === 'running' ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Verificar Existência de Tabelas
                                    </>
                                )}
                            </Button>

                            {validationResults && (
                                <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-100 dark:border-green-900">
                                            <div className="text-2xl font-bold text-green-600">
                                                {validationResults.existing.length}
                                            </div>
                                            <div className="text-xs text-green-700 dark:text-green-400 font-medium">Encontradas</div>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-100 dark:border-red-900">
                                            <div className="text-2xl font-bold text-red-600">
                                                {validationResults.missing.length}
                                            </div>
                                            <div className="text-xs text-red-700 dark:text-red-400 font-medium">Ausentes</div>
                                        </div>
                                    </div>

                                    <ScrollArea className="h-[250px] w-full rounded border p-2">
                                        {validationResults.missing.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-xs font-bold text-red-600 mb-2 uppercase tracking-wider">Tabelas Ausentes</h4>
                                                <div className="space-y-1">
                                                    {validationResults.missing.map(table => (
                                                        <div key={table} className="text-xs flex items-center gap-2 text-red-500 dark:text-red-400 font-mono bg-red-50/50 dark:bg-red-950/20 p-1 rounded">
                                                            <XCircle className="h-3 w-3" /> {table}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div>
                                            <h4 className="text-xs font-bold text-green-600 mb-2 uppercase tracking-wider">Tabelas Encontradas</h4>
                                            {validationResults.existing.length === 0 ? (
                                                <span className="text-xs text-muted-foreground italic">Nenhuma tabela encontrada ainda.</span>
                                            ) : (
                                                <div className="space-y-1">
                                                    {validationResults.existing.map(table => (
                                                        <div key={table} className="text-xs flex items-center gap-2 text-green-600 dark:text-green-400 font-mono bg-green-50/50 dark:bg-green-950/20 p-1 rounded">
                                                            <CheckCircle2 className="h-3 w-3" /> {table}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Logs Console */}
                    <Card className="bg-slate-950 text-slate-50 border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-mono flex items-center gap-2">
                                <Code className="h-4 w-4" /> Console
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[150px] w-full rounded border border-slate-800 bg-slate-900 p-4">
                                <div className="space-y-1 font-mono text-xs">
                                    {logs.length === 0 && <span className="text-slate-500 italic">Aguardando ação...</span>}
                                    {logs.map((log, i) => (
                                        <div key={i} className={`
                                            ${log.type === 'error' ? 'text-red-400' : ''}
                                            ${log.type === 'success' ? 'text-green-400' : ''}
                                            ${log.type === 'warning' ? 'text-amber-400' : ''}
                                            ${log.type === 'info' ? 'text-slate-300' : ''}
                                        `}>
                                            <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                                            {log.msg}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: SQL & Execution */}
                <div className="h-full flex flex-col space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Execução de Migração</CardTitle>
                            <CardDescription>
                                Tente criar as tabelas automaticamente ou copie o SQL para execução manual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex gap-4">
                                <Button 
                                    onClick={handleInitialize} 
                                    disabled={status === 'running'}
                                    className="flex-1"
                                >
                                    {status === 'running' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                    Executar Migração Automática
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    onClick={copyToClipboard}
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copiar SQL
                                </Button>
                            </div>
                            
                            <Alert variant="warning" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800 dark:text-amber-400">Nota Importante</AlertTitle>
                                <AlertDescription className="text-amber-700 dark:text-amber-500 text-xs">
                                    A execução automática pode falhar dependendo das permissões do seu usuário Supabase. 
                                    Se falhar, copie o SQL abaixo e execute no "SQL Editor" do painel do Supabase.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 flex flex-col">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">SQL Gerado</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[400px] p-0 relative">
                            <div className="absolute inset-0 p-4">
                                <Textarea 
                                    value={ERP_SCHEMA_SQL} 
                                    readOnly 
                                    className="font-mono text-xs h-full resize-none bg-muted/50 text-muted-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SchemaInitializer;