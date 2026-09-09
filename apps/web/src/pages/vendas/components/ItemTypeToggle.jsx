import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function ItemTypeToggle({ selectedType = 'produto', onTypeChange }) {
    return (
        <div className="space-y-3 bg-muted p-4 rounded-md border border-border mb-4">
            <Label className="text-sm font-semibold text-foreground">Tipo de Item</Label>
            <RadioGroup 
                value={selectedType} 
                onValueChange={onTypeChange} 
                className="flex space-x-6"
            >
                <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border border-border shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <RadioGroupItem value="produto" id="produto" />
                    <Label htmlFor="produto" className="cursor-pointer font-medium text-muted-foreground">Produto</Label>
                </div>
                <div className="flex items-center space-x-2 bg-background px-3 py-2 rounded border border-border shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <RadioGroupItem value="servico" id="servico" />
                    <Label htmlFor="servico" className="cursor-pointer font-medium text-muted-foreground">Serviço</Label>
                </div>
            </RadioGroup>
        </div>
    );
}