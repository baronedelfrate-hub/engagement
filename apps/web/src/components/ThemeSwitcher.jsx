import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Palette, Moon, Sun, Zap, Waves, Trees, Sunset, RotateCcw, RotateCw, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const themes = [
  { id: 'dark', name: 'Dark Mode', icon: Moon },
  { id: 'light', name: 'Light Mode', icon: Sun },
  { id: 'theme-neon', name: 'Neon Mode', icon: Zap },
  { id: 'theme-ocean', name: 'Ocean Mode', icon: Waves },
  { id: 'theme-forest', name: 'Forest Mode', icon: Trees },
  { id: 'theme-sunset', name: 'Sunset Mode', icon: Sunset },
];

function ThemeSwitcher() {
  const { theme, setTheme, goToPreviousTheme, goToNextTheme, history, historyIndex, presets } = useTheme();
  const navigate = useNavigate();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 opacity-50 group-hover:opacity-80 transition-opacity" />
          <Palette className="h-5 w-5 text-foreground transition-transform group-hover:rotate-12" />
          {presets.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full border border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-popover/95 backdrop-blur-lg border-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
                 <span className="text-xs font-semibold text-muted-foreground">Controles</span>
                 <Badge variant="outline" className="text-[10px] h-5 px-1 bg-background">Hist: {history.length}</Badge>
            </div>
            <div className="flex gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => { e.stopPropagation(); goToPreviousTheme(); }}
                                disabled={!canUndo}
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Desfazer (Ctrl+Z)</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={(e) => { e.stopPropagation(); goToNextTheme(); }}
                                disabled={!canRedo}
                            >
                                <RotateCw className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Refazer (Ctrl+Y)</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
        
        <DropdownMenuLabel className="pt-3 px-3 flex justify-between items-center">
            <span>Temas Rápidos</span>
            {presets.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{presets.length} Presets</Badge>
            )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-2 gap-1 p-2">
            {themes.map((t) => (
            <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-center justify-center gap-1 py-3 cursor-pointer border border-transparent ${
                    theme === t.id 
                    ? 'bg-accent text-accent-foreground border-primary/30' 
                    : 'hover:bg-muted text-muted-foreground'
                } rounded-md transition-all`}
            >
                <t.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{t.name.split(' ')[0]}</span>
            </DropdownMenuItem>
            ))}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="gap-2 cursor-pointer text-primary font-medium py-3 mx-1 mb-1 focus:bg-primary/10"
          onClick={() => navigate('/configuracoes/temas')}
        >
          <Palette className="h-4 w-4" />
          <span>Configurações Avançadas</span>
          <Command className="h-3 w-3 ml-auto opacity-50" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSwitcher;