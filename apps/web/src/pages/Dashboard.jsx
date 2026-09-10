import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Truck, Package, Wrench, TrendingUp, DollarSign, Database, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import AnimatedCounter from '@/components/AnimatedCounter';
import AnimatedDivider from '@/components/AnimatedDivider';
import { Button } from '@/components/ui/button';
import { testSupabaseConnection } from '@/lib/databaseTestService';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

function Dashboard() {
  const [stats, setStats] = useState({
    clientes: 0,
    fornecedores: 0,
    produtos: 0,
    servicos: 0
  });
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const [clientes, fornecedores, produtos, servicos] = await Promise.all([
      supabase.from('clientes').select('id', { count: 'exact', head: true }),
      supabase.from('fornecedores').select('id', { count: 'exact', head: true }),
      supabase.from('produtos').select('id', { count: 'exact', head: true }),
      supabase.from('servicos').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      clientes: clientes.count || 0,
      fornecedores: fornecedores.count || 0,
      produtos: produtos.count || 0,
      servicos: servicos.count || 0
    });
    setLoading(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
        const result = await testSupabaseConnection();
        setTestResult(result);
        setShowResultDialog(true);

        if (result.connected) {
             toast({ title: "Sucesso", description: "Conexão com Supabase verificada." });
        } else {
             toast({ title: "Falha", description: result.error || "Não foi possível conectar ao Supabase.", variant: "destructive" });
        }
    } catch (err) {
        setTestResult({ connected: false, error: err.message });
        setShowResultDialog(true);
    } finally {
        setIsTesting(false);
    }
  };

  const statCards = [
    {
      title: 'Clientes',
      value: stats.clientes,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-400',
    },
    {
      title: 'Fornecedores',
      value: stats.fornecedores,
      icon: Truck,
      gradient: 'from-emerald-500 to-teal-400',
    },
    {
      title: 'Produtos',
      value: stats.produtos,
      icon: Package,
      gradient: 'from-purple-500 to-pink-400',
    },
    {
      title: 'Serviços',
      value: stats.servicos,
      icon: Wrench,
      gradient: 'from-orange-500 to-amber-400',
    }
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard - Engagement Soluções</title>
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <PageHeader
            title="Dashboard"
            description="Visão geral da plataforma de gestão Engagement Soluções"
          />
          
          <div className="flex items-center gap-3 bg-card border border-border p-2 rounded-lg shadow-sm mb-4 md:mb-0">
             <Button 
                onClick={handleTestConnection} 
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/50"
             >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4 text-primary" />}
                {isTesting ? 'Testando...' : 'Testar Conexão Supabase'}
             </Button>
          </div>
      </div>
      
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {testResult?.connected ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                        <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    Resultado da Conexão
                </DialogTitle>
                <DialogDescription>
                    {testResult?.connected ? "Conexão estabelecida com sucesso." : "Falha ao tentar conectar."}
                </DialogDescription>
            </DialogHeader>
            
            <div className={`p-4 rounded-md text-sm border ${
                testResult?.connected 
                ? 'bg-green-50 border-green-100 text-green-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
                <p className="font-semibold mb-1">Status:</p>
                <p>{testResult?.error || (testResult?.connected ? 'Conectado com sucesso!' : 'Não foi possível conectar.')}</p>
            </div>

            <DialogFooter>
                <Button onClick={() => setShowResultDialog(false)}>Fechar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard gradient={stat.gradient} className="hover:scale-105 transition-transform duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
                 <stat.icon className="h-24 w-24" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-bold text-foreground drop-shadow-sm">
                    {loading ? (
                        <div className="h-8 w-20 bg-muted/50 animate-pulse rounded" />
                    ) : (
                        <AnimatedCounter value={stat.value} />
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Total cadastrado</p>
              </CardContent>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <AnimatedDivider />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-gradient font-bold">Atividades Recentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted/30 mb-4 flex items-center justify-center animate-pulse-glow">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p>Nenhuma atividade recente</p>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <span className="text-gradient font-bold">Resumo Financeiro</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted/30 mb-4 flex items-center justify-center animate-pulse-glow">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
                <p>Dados financeiros não disponíveis</p>
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>
      </div>
    </>
  );
}

export default Dashboard;