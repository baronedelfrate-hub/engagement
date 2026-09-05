import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

const ThemeContext = createContext();

export const THEME_DEFINITIONS = [
  { id: 'dark', name: 'Dark (Padrão)', color: '#1e293b', foreground: '#f8fafc' },
  { id: 'light', name: 'Light Mode', color: '#ffffff', foreground: '#0f172a' },
  { id: 'theme-neon', name: 'Neon Night', color: '#0a0a0a', accent: '#ff00ff', foreground: '#e2e8f0' },
  { id: 'theme-ocean', name: 'Deep Ocean', color: '#0c1a2b', accent: '#06b6d4', foreground: '#f1f5f9' },
  { id: 'theme-forest', name: 'Dark Forest', color: '#051a10', accent: '#10b981', foreground: '#f1f5f9' },
  { id: 'theme-sunset', name: 'Sunset', color: '#2b0a12', accent: '#f97316', foreground: '#fff1f2' },
];

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { toast } = useToast();
  
  // Core State
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('erp_theme') || 'light';
  });

  const [customColors, setCustomColorsState] = useState(() => {
    const saved = localStorage.getItem('erp_theme_colors');
    return saved ? JSON.parse(saved) : { primary: null, accent: null };
  });

  // History State
  const [history, setHistory] = useState(() => {
    const savedHistory = localStorage.getItem('erp_theme_history');
    if (savedHistory) {
      return JSON.parse(savedHistory);
    }
    return [{ 
      theme: localStorage.getItem('erp_theme') || 'dark', 
      customColors: JSON.parse(localStorage.getItem('erp_theme_colors') || '{"primary": null, "accent": null}'),
      timestamp: Date.now() 
    }];
  });

  const [historyIndex, setHistoryIndex] = useState(() => {
    const savedIndex = localStorage.getItem('erp_theme_history_index');
    return savedIndex !== null ? parseInt(savedIndex, 10) : 0;
  });

  // Presets State
  const [presets, setPresets] = useState(() => {
    const savedPresets = localStorage.getItem('erp_theme_presets');
    return savedPresets ? JSON.parse(savedPresets) : [];
  });

  // Refs to prevent loops
  const isNavigatingHistory = useRef(false);
  const historyTimeoutRef = useRef(null);

  // Persistence Effects
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-neon', 'theme-ocean', 'theme-forest', 'theme-sunset');
    root.classList.add(theme === 'default' ? 'dark' : theme);
    localStorage.setItem('erp_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (customColors.primary) {
      const [h, s, l] = hexToHSL(customColors.primary);
      root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
      root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
    }

    if (customColors.accent) {
      const [h, s, l] = hexToHSL(customColors.accent);
      root.style.setProperty('--accent', `${h} ${s}% ${l}%`);
    } else {
      root.style.removeProperty('--accent');
    }

    localStorage.setItem('erp_theme_colors', JSON.stringify(customColors));
  }, [customColors]);

  // History Logic with Debounce
  useEffect(() => {
    if (isNavigatingHistory.current) {
      isNavigatingHistory.current = false;
      return;
    }

    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);

    historyTimeoutRef.current = setTimeout(() => {
      setHistory(prevHistory => {
        const currentEntry = prevHistory[historyIndex];
        
        // Check if actual change occurred to avoid duplicates
        if (currentEntry && 
            currentEntry.theme === theme && 
            JSON.stringify(currentEntry.customColors) === JSON.stringify(customColors)) {
          return prevHistory;
        }

        const newEntry = { theme, customColors: { ...customColors }, timestamp: Date.now() };
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(newEntry);
        
        if (newHistory.length > 10) newHistory.shift();
        
        const newIndex = newHistory.length - 1;
        setHistoryIndex(newIndex);
        
        localStorage.setItem('erp_theme_history', JSON.stringify(newHistory));
        localStorage.setItem('erp_theme_history_index', newIndex.toString());
        
        return newHistory;
      });
    }, 1000); 

    return () => {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    };
  }, [theme, customColors]); 

  // Navigation Functions
  const restoreState = (state) => {
    isNavigatingHistory.current = true;
    setThemeState(state.theme);
    setCustomColorsState(state.customColors);
    
    const themeDef = THEME_DEFINITIONS.find(t => t.id === state.theme);
    const themeName = themeDef ? themeDef.name : 'Tema Personalizado';
    toast({
      title: "Tema Restaurado",
      description: `Restaurado para ${themeName}`,
    });
  };

  const goToPreviousTheme = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      localStorage.setItem('erp_theme_history_index', newIndex.toString());
      restoreState(history[newIndex]);
    }
  }, [history, historyIndex]);

  const goToNextTheme = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      localStorage.setItem('erp_theme_history_index', newIndex.toString());
      restoreState(history[newIndex]);
    }
  }, [history, historyIndex]);

  const restoreHistoryItem = (index) => {
    if (index >= 0 && index < history.length) {
      setHistoryIndex(index);
      localStorage.setItem('erp_theme_history_index', index.toString());
      restoreState(history[index]);
    }
  };

  const deleteHistoryItem = (index) => {
    const newHistory = history.filter((_, i) => i !== index);
    
    // Adjust current index if necessary
    let newIndex = historyIndex;
    if (index < historyIndex) {
      newIndex--;
    } else if (index === historyIndex) {
      newIndex = Math.max(0, newHistory.length - 1);
    } else if (index > historyIndex) {
      // No change needed
    }

    if (newHistory.length === 0) {
       // Don't allow deleting the last item (current state), or handle empty state?
       // Actually, we should probably keep at least one entry or the current state.
       // For simplicity, if empty, we re-initialize with current
       return; 
    }

    setHistory(newHistory);
    setHistoryIndex(newIndex);
    localStorage.setItem('erp_theme_history', JSON.stringify(newHistory));
    localStorage.setItem('erp_theme_history_index', newIndex.toString());
    toast({ title: "Item excluído", description: "Item removido do histórico." });
  };

  const clearHistory = () => {
    const current = history[historyIndex];
    const newHistory = [current];
    setHistory(newHistory);
    setHistoryIndex(0);
    localStorage.setItem('erp_theme_history', JSON.stringify(newHistory));
    localStorage.setItem('erp_theme_history_index', '0');
    toast({ title: "Histórico Limpo", description: "Apenas o tema atual foi mantido." });
  };

  // Preset Management
  const savePreset = (name) => {
    const newPreset = {
      id: Date.now().toString(),
      name,
      theme,
      customColors: { ...customColors },
      timestamp: Date.now()
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('erp_theme_presets', JSON.stringify(updatedPresets));
    toast({ title: "Preset Salvo", description: `O preset "${name}" foi salvo com sucesso.` });
  };

  const loadPreset = (preset) => {
    isNavigatingHistory.current = true;
    setThemeState(preset.theme);
    setCustomColorsState(preset.customColors);
    toast({ title: "Preset Carregado", description: `Aplicado: ${preset.name}` });
  };

  const deletePreset = (id) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('erp_theme_presets', JSON.stringify(updatedPresets));
    toast({ title: "Preset Excluído", description: "O preset foi removido." });
  };

  const importTheme = (jsonData) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.theme && parsed.customColors) {
        isNavigatingHistory.current = true;
        setThemeState(parsed.theme);
        setCustomColorsState(parsed.customColors);
        toast({ title: "Tema Importado", description: "Configurações aplicadas com sucesso." });
      } else {
        throw new Error("Formato inválido");
      }
    } catch (e) {
      toast({ title: "Erro na Importação", description: "Arquivo inválido ou corrompido.", variant: "destructive" });
    }
  };

  const resetCustomColors = () => {
    setCustomColorsState({ primary: null, accent: null });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        goToPreviousTheme();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        goToNextTheme();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPreviousTheme, goToNextTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme: setThemeState, 
      customColors, 
      setCustomColors: setCustomColorsState, 
      resetCustomColors,
      history,
      historyIndex,
      goToPreviousTheme,
      goToNextTheme,
      restoreHistoryItem,
      deleteHistoryItem,
      clearHistory,
      presets,
      savePreset,
      loadPreset,
      deletePreset,
      importTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

function hexToHSL(H) {
  let r = 0, g = 0, b = 0;
  if (!H) return [0, 0, 0];
  if (H.length === 4) {
    r = "0x" + H[1] + H[1];
    g = "0x" + H[2] + H[2];
    b = "0x" + H[3] + H[3];
  } else if (H.length === 7) {
    r = "0x" + H[1] + H[2];
    g = "0x" + H[3] + H[4];
    b = "0x" + H[5] + H[6];
  }
  r /= 255;
  g /= 255;
  b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0,
      s = 0,
      l = 0;

  if (delta === 0)
    h = 0;
  else if (cmax === r)
    h = ((g - b) / delta) % 6;
  else if (cmax === g)
    h = (b - r) / delta + 2;
  else
    h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return [h, s, l];
}