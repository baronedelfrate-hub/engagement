import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
    Database, 
    Wifi, 
    WifiOff, 
    Loader2,
    CheckCircle2,
    XCircle,
    ServerCrash,
    HardDrive
} from 'lucide-react';
import { testSupabaseConnection } from '@/lib/databaseTestService';
import { testStorageConnection } from '@/lib/storageConnectionTest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DatabaseTest = () => {
    const [dbStatus, setDbStatus] = useState('idle'); // idle, testing, success, error
    const [dbResult, setDbResult] = useState(null);

    const [storageStatus, setStorageStatus] = useState('idle');
    const [storageResult, setStorageResult] = useState(null);

    const handleTestDbConnection = async () => {
        setDbStatus('testing');
        setDbResult(null);
        
        try {
            const data = await testSupabaseConnection();
            setDbResult(data);
            setDbStatus(data.connected ? 'success' : 'error');
        } catch (error) {
            setDbResult({ connected: false, error: error.message });
            setDbStatus('error');
        }
    };

    const handleTestStorageConnection = async () => {
        setStorageStatus('testing');
        setStorageResult(null);
        
        try {
            const data = await testStorageConnection();
            setStorageResult(data);
            setStorageStatus(data.connected ? 'success' : 'error');
        } catch (error) {
            setStorageResult({ connected: false, error: error.message });
            setStorageStatus('error');
        }
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
                <ServerCrash className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Diagnóstico de Conexão</h1>
                    <p className="text-muted-foreground">Verificação de conectividade com Banco de Dados e Storage Supabase</p>
                </div>
            </div>

            <Tabs defaultValue="database" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="database" className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Banco de Dados (PostgreSQL)
                    </TabsTrigger>
                    <TabsTrigger value="storage" className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Armazenamento (Storage)
                    </TabsTrigger>
                </TabsList>

                {/* DATABASE TAB */}
                <TabsContent value="database">
                    <Card className="border-t-4 border-t-primary shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Teste de Banco de Dados
                            </CardTitle>
                            <CardDescription>
                                Verifica se a API do Supabase consegue consultar as tabelas do projeto.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-8 min-h-[250px]">
                                {dbStatus === 'idle' && (
                                    <div className="text-center text-muted-foreground">
                                        <Wifi className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                        <p>Clique no botão abaixo para testar a conexão com o banco.</p>
                                    </div>
                                )}

                                {dbStatus === 'testing' && (
                                    <div className="text-center text-primary">
                                        <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                                        <p className="font-medium">Verificando comunicação com Banco de Dados...</p>
                                    </div>
                                )}

                                {dbStatus === 'success' && (
                                    <div className="text-center text-green-600 animate-in zoom-in-50 duration-300">
                                        <CheckCircle2 className="h-20 w-20 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold">Banco Conectado!</h3>
                                        <p className="text-green-700/80 mt-2">A comunicação com a API de dados está funcionando corretamente.</p>
                                    </div>
                                )}

                                {dbStatus === 'error' && (
                                    <div className="text-center text-red-600 animate-in zoom-in-50 duration-300 w-full">
                                        <XCircle className="h-20 w-20 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold">Falha na Conexão com Banco</h3>
                                        
                                        <Alert variant="destructive" className="mt-6 text-left border-red-200 bg-red-50">
                                            <WifiOff className="h-4 w-4" />
                                            <AlertTitle>Detalhes do Erro</AlertTitle>
                                            <AlertDescription className="font-mono text-xs mt-2 p-2 bg-background/50 rounded overflow-auto max-h-[100px] break-words">
                                                {dbResult?.error || "Erro desconhecido ao tentar conectar."}
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t flex justify-center">
                                <Button 
                                    onClick={handleTestDbConnection} 
                                    disabled={dbStatus === 'testing'} 
                                    size="lg"
                                    className="w-full sm:w-auto min-w-[200px]"
                                >
                                    {dbStatus === 'testing' ? 'Testando...' : (dbStatus === 'idle' ? 'Testar Conexão' : 'Testar Novamente')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STORAGE TAB */}
                <TabsContent value="storage">
                    <Card className="border-t-4 border-t-amber-500 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                Teste de Storage (Arquivos)
                            </CardTitle>
                            <CardDescription>
                                Verifica se a API do Supabase consegue acessar os buckets de armazenamento de arquivos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-8 min-h-[250px]">
                                {storageStatus === 'idle' && (
                                    <div className="text-center text-muted-foreground">
                                        <HardDrive className="h-16 w-16 mx-auto mb-4 opacity-20" />
                                        <p>Clique no botão abaixo para testar o envio/leitura de arquivos.</p>
                                    </div>
                                )}

                                {storageStatus === 'testing' && (
                                    <div className="text-center text-amber-500">
                                        <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                                        <p className="font-medium">Comunicando com o serviço de Storage...</p>
                                    </div>
                                )}

                                {storageStatus === 'success' && (
                                    <div className="text-center text-green-600 animate-in zoom-in-50 duration-300 w-full">
                                        <CheckCircle2 className="h-20 w-20 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold">Storage Acessível!</h3>
                                        <p className="text-green-700/80 mt-2">{storageResult?.message}</p>
                                        
                                        {storageResult?.buckets && storageResult.buckets.length > 0 && (
                                            <div className="mt-6 text-left w-full max-w-md mx-auto bg-green-50 p-4 rounded-lg border border-green-100">
                                                <p className="text-sm font-semibold text-green-800 mb-2">Buckets encontrados ({storageResult.buckets.length}):</p>
                                                <ul className="text-xs font-mono text-green-700 space-y-1 list-disc pl-5">
                                                    {storageResult.buckets.map((b, i) => <li key={i}>{b}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {storageStatus === 'error' && (
                                    <div className="text-center text-red-600 animate-in zoom-in-50 duration-300 w-full">
                                        <XCircle className="h-20 w-20 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold">Falha no Storage</h3>
                                        
                                        <Alert variant="destructive" className="mt-6 text-left border-red-200 bg-red-50">
                                            <WifiOff className="h-4 w-4" />
                                            <AlertTitle>Detalhes do Erro</AlertTitle>
                                            <div className="mt-2 space-y-2">
                                                <p className="font-medium text-sm">{storageResult?.error}</p>
                                                {storageResult?.details && (
                                                    <pre className="font-mono text-xs p-2 bg-background/60 rounded overflow-auto max-h-[120px] whitespace-pre-wrap text-red-900 border border-red-100">
                                                        {storageResult.details}
                                                    </pre>
                                                )}
                                            </div>
                                        </Alert>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t flex justify-center">
                                <Button 
                                    onClick={handleTestStorageConnection} 
                                    disabled={storageStatus === 'testing'} 
                                    size="lg"
                                    className="w-full sm:w-auto min-w-[200px] bg-amber-500 hover:bg-amber-600 text-white"
                                >
                                    {storageStatus === 'testing' ? 'Testando Storage...' : (storageStatus === 'idle' ? 'Testar Storage' : 'Testar Storage Novamente')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DatabaseTest;