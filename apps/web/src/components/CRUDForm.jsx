import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Generic Form Component
 * @param fields Array of field definitions { name, label, type, required, options }
 * @param initialData Object containing initial values (for edit mode)
 * @param title Form title
 * @param loading Loading state
 * @param onSubmit Callback (formData) => void
 * @param onCancel Callback () => void
 */
const CRUDForm = ({
  fields = [],
  initialData = {},
  title = "Formulário",
  loading = false,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Initialize form data with empty strings or initial values
    const initial = {};
    fields.forEach(field => {
      initial[field.name] = initialData[field.name] || '';
      if (field.type === 'boolean') {
          initial[field.name] = initialData[field.name] === undefined ? true : initialData[field.name];
      }
    });
    setFormData(initial);
  }, [initialData, fields]);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("📝 Submitting form data:", formData);
    onSubmit(formData);
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'select':
        return (
          <Select 
            value={String(formData[field.name] || '')} 
            onValueChange={(val) => handleChange(field.name, val)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={loading}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'boolean':
      case 'switch':
        return (
           <div className="flex items-center space-x-2 h-10">
            <Switch
                id={field.name}
                checked={!!formData[field.name]}
                onCheckedChange={(checked) => handleChange(field.name, checked)}
                disabled={loading}
            />
            <Label htmlFor={field.name} className="cursor-pointer font-normal text-muted-foreground">
                {formData[field.name] ? 'Ativo / Sim' : 'Inativo / Não'}
            </Label>
           </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={formData[field.name] ? new Date(formData[field.name]).toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={loading}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={loading}
            step={field.step || "any"}
          />
        );

      default:
        return (
          <Input
            type={field.type || 'text'}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={loading}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" type="button" onClick={onCancel} disabled={loading}>
                <ArrowLeft className="h-4 w-4" />
             </Button>
             <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className={cn("space-y-2", field.fullWidth && "md:col-span-2")}>
                <Label htmlFor={field.name} className="flex gap-1">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Registro
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CRUDForm;