import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Trash2, Calculator } from 'lucide-react';

const STANDARD_TAXES = ['ICMS', 'PIS', 'COFINS', 'ISS', 'IRRF', 'CSLL', 'INSS'];

export default function ParametrosTributosSection({ initialData = [], onSave, loading }) {
  
  const [tributos, setTributos] = useState([]);

  useEffect(() => {
    // Initialize standard taxes if missing
    let current = [...initialData];
    STANDARD_TAXES.forEach(st => {
      if (!current.find(t => t.tipo_tributo === st)) {
        current.push({ tipo_tributo: st, aliquota_padrao: 0, retencao_padrao: 0, aplicavel_em: 'Ambos', isStandard: true });
      }
    });
    // Mark existing as standard or custom
    current = current.map(t => ({ ...t, isStandard: STANDARD_TAXES.includes(t.tipo_tributo) }));
    setTributos(current);
  }, [initialData]);

  const handleChange = (index, field, value) => {
    const updated = [...tributos];
    updated[index][field] = value;
    setTributos(updated);
  };

  const handleAddCustom = () => {
    setTributos([...tributos, { tipo_tributo: '', aliquota_padrao: 0, retencao_padrao: 0, aplicavel_em: 'Ambos', isStandard: false }]);
  };

  const handleRemove = (index) => {
    const updated = [...tributos];
    updated.splice(index, 1);
    setTributos(updated);
  };

  const handleSaveClick = () => {
    // Filter out invalid custom ones
    const toSave = tributos.filter(t => t.tipo_tributo && t.tipo_tributo.trim() !== '');
    onSave(toSave);
  };

  const standardTaxes = tributos.filter(t => t.isStandard);
  const customTaxes = tributos.filter(t => !t.isStandard);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-600" /> 
            Tributos e Retenções Padrão
          </CardTitle>
          <CardDescription>
            Alíquotas e margens padrão utilizadas como base para cálculos automáticos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Tributo</TableHead>
                <TableHead className="w-32 text-right">Alíquota (%)</TableHead>
                <TableHead className="w-32 text-right">Retenção (%)</TableHead>
                <TableHead className="w-48">Aplicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tributos.map((t, index) => t.isStandard && (
                <TableRow key={t.tipo_tributo}>
                  <TableCell className="font-medium text-foreground">{t.tipo_tributo}</TableCell>
                  <TableCell>
                    <Input 
                      type="number" step="0.01" min="0" max="100"
                      value={t.aliquota_padrao || 0}
                      onChange={(e) => handleChange(index, 'aliquota_padrao', e.target.value)}
                      className="text-right text-foreground h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" step="0.01" min="0" max="100"
                      value={t.retencao_padrao || 0}
                      onChange={(e) => handleChange(index, 'retencao_padrao', e.target.value)}
                      className="text-right text-foreground h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={t.aplicavel_em || 'Ambos'} onValueChange={(v) => handleChange(index, 'aplicavel_em', v)}>
                      <SelectTrigger className="h-8 text-foreground"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ambos">Ambos</SelectItem>
                        <SelectItem value="NF-e">NF-e</SelectItem>
                        <SelectItem value="NFS-e">NFS-e</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/50 border-b border-border flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Tributos Customizados</CardTitle>
            <CardDescription className="mt-1">Adicione impostos ou taxas específicas locais/regionais.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddCustom}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          {customTaxes.length === 0 ? (
             <div className="p-6 text-center text-muted-foreground text-sm">
               Nenhum tributo customizado adicionado.
             </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Nome do Tributo</TableHead>
                  <TableHead className="w-32 text-right">Alíquota (%)</TableHead>
                  <TableHead className="w-32 text-right">Retenção (%)</TableHead>
                  <TableHead className="w-48">Aplicação</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tributos.map((t, index) => !t.isStandard && (
                  <TableRow key={`custom-${index}`}>
                    <TableCell>
                      <Input 
                        placeholder="Nome"
                        value={t.tipo_tributo || ''}
                        onChange={(e) => handleChange(index, 'tipo_tributo', e.target.value)}
                        className="text-foreground h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="0.01" min="0" max="100"
                        value={t.aliquota_padrao || 0}
                        onChange={(e) => handleChange(index, 'aliquota_padrao', e.target.value)}
                        className="text-right text-foreground h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="0.01" min="0" max="100"
                        value={t.retencao_padrao || 0}
                        onChange={(e) => handleChange(index, 'retencao_padrao', e.target.value)}
                        className="text-right text-foreground h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={t.aplicavel_em || 'Ambos'} onValueChange={(v) => handleChange(index, 'aplicavel_em', v)}>
                        <SelectTrigger className="h-8 text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ambos">Ambos</SelectItem>
                          <SelectItem value="NF-e">NF-e</SelectItem>
                          <SelectItem value="NFS-e">NFS-e</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(index)} className="h-8 w-8 text-muted-foreground hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSaveClick} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Salvar Tributos
        </Button>
      </div>
    </div>
  );
}