import React, { useState } from 'react';
import { useTheme, THEME_DEFINITIONS } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bookmark, Trash2, Play, Save, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

const ThemePresets = () => {
  const { presets, loadPreset, deletePreset, savePreset } = useTheme();
  const [newPresetName, setNewPresetName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSave = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName);
      setNewPresetName('');
      setIsDialogOpen(false);
    }
  };

  const getPreviewColors = (preset) => {
     const themeDef = THEME_DEFINITIONS.find(t => t.id === preset.theme) || THEME_DEFINITIONS[0];
     return {
         bg: themeDef.color,
         primary: preset.customColors.primary || themeDef.color,
         accent: preset.customColors.accent || themeDef.accent || '#555'
     };
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" /> 
            Meus Presets
        </h3>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Preset
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Salvar Preset Atual</DialogTitle>
                    <DialogDescription>
                        Salve a configuração atual de tema e cores para usar depois.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    <Label htmlFor="name">Nome do Preset</Label>
                    <Input 
                        id="name" 
                        placeholder="Ex: Meu Tema Noturno" 
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={!newPresetName.trim()}>
                        <Save className="h-4 w-4 mr-2" /> Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      {presets.length === 0 ? (
         <Card className="flex-1 flex items-center justify-center bg-muted/20 border-dashed">
             <div className="text-center p-6">
                 <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                 <p className="text-sm text-muted-foreground">Nenhum preset salvo.</p>
             </div>
         </Card>
      ) : (
        <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-3">
                {presets.map(preset => {
                    const colors = getPreviewColors(preset);
                    return (
                        <Card key={preset.id} className="overflow-hidden hover:border-primary/50 transition-colors group">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg shadow-inner border flex overflow-hidden relative">
                                        <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}></div>
                                        <div className="absolute bottom-0 left-0 w-full h-1/2" style={{ backgroundColor: colors.primary, opacity: 0.8 }}></div>
                                        <div className="absolute top-0 right-0 w-1/2 h-full" style={{ backgroundColor: colors.accent, opacity: 0.5 }}></div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{preset.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(preset.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => loadPreset(preset)} title="Aplicar">
                                        <Play className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deletePreset(preset.id)} title="Excluir">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default ThemePresets;