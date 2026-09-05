import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function ItemTypeToggle({ selectedType = 'produto', onTypeChange }) {
    return (
        <div className="space-y-3 bg-slate-50 p-4 rounded-md border border-slate-100 mb-4">
            <Label className="text-sm font-semibold text-slate-700">Tipo de Item</Label>
            <RadioGroup 
                value={selectedType} 
                onValueChange={onTypeChange} 
                className="flex space-x-6"
            >
                <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <RadioGroupItem value="produto" id="produto" />
                    <Label htmlFor="produto" className="cursor-pointer font-medium text-slate-600">Produto</Label>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <RadioGroupItem value="servico" id="servico" />
                    <Label htmlFor="servico" className="cursor-pointer font-medium text-slate-600">Serviço</Label>
                </div>
            </RadioGroup>
        </div>
    );
}