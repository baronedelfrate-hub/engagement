import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useTheme, THEME_DEFINITIONS } from '@/contexts/ThemeContext';
import PageHeader from '@/components/PageHeader';
import ThemeHistory from '@/components/ThemeHistory';
import ThemePresets from '@/components/ThemePresets';
import ThemeComparison from '@/components/ThemeComparison';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Palette, RotateCcw, Check, Monitor, Upload, Download, SplitSquareHorizontal, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function SettingsTema() {
  const { theme, setTheme, customColors, setCustomColors, resetCustomColors, importTheme, history, historyIndex } = useTheme();
  const fileInputRef = useRef(null);
  const [localColors, setLocalColors] = useState(customColors);

  useEffect(() => {
    setLocalColors(customColors);
  }, [customColors]);

  const handleColorChange = (type, value) => {
    setLocalColors(prev => ({ ...prev, [type]: value }));
  };

  const handleColorBlur = (type) => {
    if (localColors[type] !== customColors[type]) {
        setCustomColors(prev => ({ ...prev, [type]: localColors[type] }));
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              importTheme(event.target.result);
          };
          reader.readAsText(file);
      }
      e.target.value = null; 
  };

  const handleExportCurrent = () => {
    const data = { theme, customColors, timestamp: Date.now() };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previousHistoryItem = historyIndex > 0 ? history[historyIndex - 1] : history[0];
  const currentHistoryItem = history[historyIndex];

  return (
    <>
      <Helmet>
        <title>Personalizar Tema - ERP Platform</title>
      </Helmet>

      <PageHeader 
        title="Personalização de Tema" 
        description="Ajuste a aparência, cores e gerencie o histórico de alterações"
      />
      
      <div className="flex justify-end gap-2 mb-6">
           <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               accept=".json" 
               className="hidden" 
           />
           <Button variant="outline" onClick={handleImportClick}>
               <Upload className="h-4 w-4 mr-2" /> Importar
           </Button>
           <Button variant="outline" onClick={handleExportCurrent}>
               <Download className="h-4 w-4 mr-2" /> Exportar Atual
           </Button>
           
           <Dialog>
               <DialogTrigger asChild>
                   <Button variant="secondary">
                       <SplitSquareHorizontal className="h-4 w-4 mr-2" /> Comparar
                   </Button>
               </DialogTrigger>
               <DialogContent className="max-w-3xl">
                   <DialogHeader>
                       <DialogTitle>Comparação de Temas</DialogTitle>
                   </DialogHeader>
                   <div className="py-4">
                       <ThemeComparison 
                           currentTheme={currentHistoryItem || { theme, customColors }} 
                           previousTheme={previousHistoryItem} 
                       />
                   </div>
               </DialogContent>
           </Dialog>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Settings (8/12) */}
        <div className="xl:col-span-8 space-y-8">
            <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
            >
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Temas Base
                </CardTitle>
                <CardDescription>Escolha a fundação do seu design</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {THEME_DEFINITIONS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`
                        relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 hover:scale-105
                        ${theme === t.id ? 'border-primary ring-2 ring-primary/20 bg-accent/10' : 'border-border hover:border-primary/50'}
                        `}
                    >
                        <div 
                        className="w-12 h-12 rounded-full shadow-lg border border-white/10"
                        style={{ backgroundColor: t.color }}
                        />
                        <span className="text-sm font-medium">{t.name}</span>
                        {theme === t.id && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                        </div>
                        )}
                    </button>
                    ))}
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Customização de Cores
                </CardTitle>
                <CardDescription>Personalize a identidade visual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-3 items-center">
                        <div className="relative overflow-hidden w-12 h-12 rounded-lg border border-border shadow-inner ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <input 
                            type="color" 
                            value={localColors.primary || '#3b82f6'}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            onBlur={() => handleColorBlur('primary')}
                            className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 m-0 opacity-0"
                        />
                        <div 
                            className="w-full h-full pointer-events-none" 
                            style={{ backgroundColor: localColors.primary || 'hsl(var(--primary))' }}
                        />
                        </div>
                        <div className="flex-1">
                            <Input 
                                value={localColors.primary || ''} 
                                placeholder="Padrão do tema"
                                readOnly
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                    </div>

                    <div className="space-y-2">
                    <Label>Cor de Acento</Label>
                    <div className="flex gap-3 items-center">
                        <div className="relative overflow-hidden w-12 h-12 rounded-lg border border-border shadow-inner ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <input 
                            type="color" 
                            value={localColors.accent || '#10b981'}
                            onChange={(e) => handleColorChange('accent', e.target.value)}
                            onBlur={() => handleColorBlur('accent')}
                            className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 m-0 opacity-0"
                        />
                        <div 
                            className="w-full h-full pointer-events-none" 
                            style={{ backgroundColor: localColors.accent || 'hsl(var(--accent))' }}
                        />
                        </div>
                        <div className="flex-1">
                            <Input 
                                value={localColors.accent || ''} 
                                placeholder="Padrão do tema"
                                readOnly
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                    <Button 
                    variant="outline" 
                    onClick={resetCustomColors}
                    className="gap-2"
                    >
                    <RotateCcw className="h-4 w-4" />
                    Restaurar Padrão
                    </Button>
                </div>
                </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                <CardHeader>
                <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                <div className="flex flex-wrap gap-3">
                    <Button>Botão</Button>
                    <Button variant="secondary">Secundário</Button>
                    <Button variant="destructive">Perigo</Button>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
                    <h4 className="font-semibold text-lg mb-2 text-primary">Componente Exemplo</h4>
                    <p className="text-muted-foreground text-sm">
                        Demonstração de tipografia e <span className="text-accent font-bold">cores de destaque</span>.
                    </p>
                </div>
                </CardContent>
            </Card>
            </motion.div>
        </div>

        {/* Right Column: History & Presets (4/12) */}
        <div className="xl:col-span-4">
             <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-full sticky top-6"
            >
                <Tabs defaultValue="history" className="h-full flex flex-col">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="history">Histórico</TabsTrigger>
                        <TabsTrigger value="presets">Presets</TabsTrigger>
                    </TabsList>
                    <div className="mt-4 flex-1 relative">
                        <TabsContent value="history" className="absolute inset-0">
                            <ThemeHistory />
                        </TabsContent>
                        <TabsContent value="presets" className="absolute inset-0">
                             <ThemePresets />
                        </TabsContent>
                    </div>
                </Tabs>
            </motion.div>
        </div>

      </div>
    </>
  );
}

export default SettingsTema;