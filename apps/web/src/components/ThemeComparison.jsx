import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { THEME_DEFINITIONS } from '@/contexts/ThemeContext';
import { ArrowRightLeft, Check, X } from 'lucide-react';

const ThemeCard = ({ title, themeId, customColors }) => {
  const themeDef = THEME_DEFINITIONS.find(t => t.id === themeId) || THEME_DEFINITIONS[0];
  const primaryColor = customColors.primary || themeDef.color || '#3b82f6';
  const accentColor = customColors.accent || themeDef.accent || '#10b981';
  const bgColor = themeDef.color;
  const fgColor = themeDef.foreground;

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-center text-sm text-muted-foreground uppercase tracking-wider">{title}</h3>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: bgColor, borderColor: primaryColor }}>
        <div className="h-32 relative p-4">
          {/* Mock UI Elements */}
          <div className="flex items-center justify-between mb-4">
             <div className="h-2 w-16 rounded-full" style={{ backgroundColor: fgColor, opacity: 0.5 }}></div>
             <div className="h-6 w-6 rounded-full" style={{ backgroundColor: primaryColor }}></div>
          </div>
          <div className="space-y-2">
             <div className="h-8 w-full rounded-md" style={{ backgroundColor: primaryColor, opacity: 0.1, border: `1px solid ${primaryColor}` }}></div>
             <div className="flex gap-2">
                <div className="h-8 w-1/2 rounded-md" style={{ backgroundColor: accentColor }}></div>
                <div className="h-8 w-1/2 rounded-md" style={{ backgroundColor: '#e2e8f0', opacity: 0.2 }}></div>
             </div>
          </div>
        </div>
        <div className="p-3 bg-muted/50 border-t border-border grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
                <span className="text-muted-foreground block">Base</span>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: bgColor }}></div>
                    <span style={{ color: fgColor }}>{themeDef.name}</span>
                </div>
            </div>
            <div className="space-y-1">
                <span className="text-muted-foreground block">Primária</span>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: primaryColor }}></div>
                    <span className="font-mono opacity-70">{primaryColor}</span>
                </div>
            </div>
            <div className="space-y-1">
                <span className="text-muted-foreground block">Acento</span>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: accentColor }}></div>
                    <span className="font-mono opacity-70">{accentColor}</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const ThemeComparison = ({ currentTheme, previousTheme }) => {
  if (!previousTheme) return null;

  const isSameTheme = currentTheme.theme === previousTheme.theme;
  const isSamePrimary = (currentTheme.customColors.primary || 'default') === (previousTheme.customColors.primary || 'default');
  const isSameAccent = (currentTheme.customColors.accent || 'default') === (previousTheme.customColors.accent || 'default');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:gap-8 relative">
         <ThemeCard title="Atual" themeId={currentTheme.theme} customColors={currentTheme.customColors} />
         
         <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-background rounded-full p-2 border shadow-lg hidden md:block">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
         </div>

         <ThemeCard title="Anterior / Comparação" themeId={previousTheme.theme} customColors={previousTheme.customColors} />
      </div>

      <Card className="bg-muted/30 border-dashed">
         <CardHeader className="py-3">
            <CardTitle className="text-sm">Análise de Diferenças</CardTitle>
         </CardHeader>
         <CardContent className="py-3 text-sm space-y-2">
            <div className="flex items-center justify-between border-b pb-2 border-border/50">
                <span>Tema Base</span>
                {isSameTheme ? (
                    <span className="text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3" /> Idêntico</span>
                ) : (
                    <span className="text-amber-500 flex items-center gap-1"><X className="h-3 w-3" /> Alterado</span>
                )}
            </div>
            <div className="flex items-center justify-between border-b pb-2 border-border/50">
                <span>Cor Primária</span>
                {isSamePrimary ? (
                    <span className="text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3" /> Idêntico</span>
                ) : (
                    <span className="text-amber-500 flex items-center gap-1"><X className="h-3 w-3" /> Alterado</span>
                )}
            </div>
            <div className="flex items-center justify-between">
                <span>Cor de Acento</span>
                {isSameAccent ? (
                    <span className="text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3" /> Idêntico</span>
                ) : (
                    <span className="text-amber-500 flex items-center gap-1"><X className="h-3 w-3" /> Alterado</span>
                )}
            </div>
         </CardContent>
      </Card>
    </div>
  );
};

export default ThemeComparison;