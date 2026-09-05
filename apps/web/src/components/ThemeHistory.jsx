import React from 'react';
import { useTheme, THEME_DEFINITIONS } from '@/contexts/ThemeContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Trash2, Clock, History, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ThemeHistory = () => {
  const { history, historyIndex, restoreHistoryItem, clearHistory, deleteHistoryItem } = useTheme();

  const formatDate = (timestamp) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(timestamp));
  };

  const getThemeName = (t) => {
     const def = THEME_DEFINITIONS.find(def => def.id === t);
     return def ? def.name : 'Desconhecido';
  };

  const getThemeColors = (item) => {
     const def = THEME_DEFINITIONS.find(d => d.id === item.theme) || THEME_DEFINITIONS[0];
     return {
         bg: def.color,
         primary: item.customColors.primary || def.color,
         accent: item.customColors.accent || def.accent || '#888'
     };
  };

  const downloadItem = (e, item) => {
      e.stopPropagation();
      const dataStr = JSON.stringify(item, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `theme-${item.timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm border-l border-border/50 rounded-none lg:rounded-xl lg:border-l-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico
          </CardTitle>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="ghost" size="icon" title="Limpar Histórico">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                 </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
                <AlertDialogDescription>
                    Isso removerá todos os itens do histórico, exceto o tema atual. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clearHistory}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
        <CardDescription className="text-xs">
          {history.length} alterações salvas (Max 10)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[400px] lg:h-[500px] px-4 pb-4">
          <div className="space-y-3 pt-2">
            <AnimatePresence initial={false}>
              {history.slice().reverse().map((item, reverseIndex) => {
                const originalIndex = history.length - 1 - reverseIndex;
                const isActive = originalIndex === historyIndex;
                const isFuture = originalIndex > historyIndex;
                const colors = getThemeColors(item);
                
                return (
                  <motion.div
                    key={item.timestamp}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: isFuture ? 0.5 : 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`relative group rounded-lg border p-3 text-sm transition-all cursor-pointer hover:shadow-md
                      ${isActive 
                        ? 'bg-primary/10 border-primary ring-1 ring-primary/20' 
                        : 'bg-card border-border hover:border-primary/30'
                      }
                      ${isFuture ? 'grayscale opacity-50' : ''}
                    `}
                    onClick={() => restoreHistoryItem(originalIndex)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                          {/* Small preview swatch */}
                          <div className="w-4 h-4 rounded-full border overflow-hidden relative shadow-sm">
                             <div className="absolute inset-0" style={{ backgroundColor: colors.bg }} />
                             <div className="absolute bottom-0 right-0 w-2 h-2" style={{ backgroundColor: colors.primary }} />
                          </div>
                          <span className={`font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {getThemeName(item.theme)}
                          </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-background/50 px-1.5 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    <div className="space-y-1 pl-6">
                        {(item.customColors.primary || item.customColors.accent) ? (
                            <div className="flex gap-2 items-center text-xs text-muted-foreground">
                                {item.customColors.primary && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.customColors.primary }} />
                                        <span className="text-[10px]">Primária</span>
                                    </div>
                                )}
                                {item.customColors.accent && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.customColors.accent }} />
                                        <span className="text-[10px]">Acento</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-[10px] text-muted-foreground italic">Cores padrão</span>
                        )}
                    </div>
                    
                    {/* Action buttons overlay */}
                    <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            variant="outline" size="icon" className="h-6 w-6 bg-background" 
                            onClick={(e) => downloadItem(e, item)}
                            title="Exportar JSON"
                        >
                            <Download className="h-3 w-3" />
                        </Button>
                        {!isActive && (
                            <Button 
                                variant="outline" size="icon" className="h-6 w-6 bg-background hover:text-destructive" 
                                onClick={(e) => { e.stopPropagation(); deleteHistoryItem(originalIndex); }}
                                title="Remover"
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                    
                    {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full" />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ThemeHistory;