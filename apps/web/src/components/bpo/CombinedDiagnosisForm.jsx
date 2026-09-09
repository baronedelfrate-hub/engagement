import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Save, ArrowRight, ArrowLeft, Building } from 'lucide-react';
import DiagnosticoUploadSection from './DiagnosticoUploadSection';
import ImplantacaoChecklistSection from './ImplantacaoChecklistSection';
import ImplantacaoUploadsSection from './ImplantacaoUploadsSection';

// Reusable render helpers
const renderInput = (formData, handleFieldChange, bloco, id, label, type = 'text', placeholder = '') => (
  <div className="space-y-1.5 mb-4">
    <Label htmlFor={`${bloco}-${id}`} className="text-foreground font-medium">{label}</Label>
    <Input id={`${bloco}-${id}`} type={type} placeholder={placeholder} value={formData[bloco][id] || ''} onChange={(e) => handleFieldChange(bloco, id, e.target.value)} className="bg-background border-border" />
  </div>
);

const renderTextarea = (formData, handleFieldChange, bloco, id, label, placeholder = '', rows = 3) => (
  <div className="space-y-1.5 mb-4">
    <Label htmlFor={`${bloco}-${id}`} className="text-foreground font-medium">{label}</Label>
    <Textarea id={`${bloco}-${id}`} placeholder={placeholder} rows={rows} value={formData[bloco][id] || ''} onChange={(e) => handleFieldChange(bloco, id, e.target.value)} className="bg-background border-border resize-y" />
  </div>
);

const renderCheckbox = (formData, handleFieldChange, bloco, id, label) => (
  <div className="flex items-center space-x-2 py-2">
    <Checkbox id={`${bloco}-${id}`} checked={formData[bloco][id] || false} onCheckedChange={(checked) => handleFieldChange(bloco, id, checked)} className="border-border data-[state=checked]:bg-primary" />
    <Label htmlFor={`${bloco}-${id}`} className="text-sm font-medium leading-none cursor-pointer text-foreground">{label}</Label>
  </div>
);

const renderRadioGroup = (formData, handleFieldChange, bloco, id, label, options) => (
  <div className="space-y-2 mb-4">
    <Label className="text-foreground font-medium">{label}</Label>
    <RadioGroup value={formData[bloco][id] || ''} onValueChange={(val) => handleFieldChange(bloco, id, val)} className="flex flex-col space-y-2 mt-2">
      {options.map((opt) => (
        <div key={opt.value} className="flex items-center space-x-2">
          <RadioGroupItem value={opt.value} id={`${bloco}-${id}-${opt.value}`} />
          <Label htmlFor={`${bloco}-${id}-${opt.value}`} className="cursor-pointer text-muted-foreground">{opt.label}</Label>
        </div>
      ))}
    </RadioGroup>
  </div>
);

// Progress Header Component
const ProgressHeader = ({ progress }) => (
  <div className="bg-background p-4 rounded-xl border border-border shadow-sm mb-6">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm font-semibold text-muted-foreground">Progresso Geral do Preenchimento</span>
      <span className="text-sm font-bold text-primary">{progress}%</span>
    </div>
    <Progress value={progress} className="h-2 bg-muted" />
  </div>
);

// ==============================================
// BLOCO 01 - TAB CONTENT
// ==============================================
export function Bloco01Tab({ formData, handleFieldChange, onNext, progress, faseId, diagnosticoUploads, onUploadSuccess, onDeleteSuccess }) {
  const b = 'bloco01';
  return (
    <div className="space-y-6">
      <ProgressHeader progress={progress} />

      <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Bloco 01 – Diagnóstico & Processo</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderInput(formData, handleFieldChange, b, 'empresa_nome', 'Empresa (Razão Social/Fantasia)')}
          {renderInput(formData, handleFieldChange, b, 'responsavel_entrevista', 'Responsável pela entrevista')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">1. Estrutura Organizacional</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderInput(formData, handleFieldChange, b, 's1_tamanho_equipe', '1.1 Quantidade de pessoas no financeiro?', 'number')}
          {renderInput(formData, handleFieldChange, b, 's1_responsavel_aprovacoes', '1.2 Responsável por aprovações?')}
          <div className="col-span-1 md:col-span-2">
            {renderTextarea(formData, handleFieldChange, b, 's1_descricao_papeis', '1.3 Descreva os papéis atuais.')}
          </div>
          <div className="col-span-1 md:col-span-2">
            <Label className="text-foreground font-medium mb-2 block">1.4 Áreas com interface direta</Label>
            <div className="grid grid-cols-2 gap-2 mb-4 bg-muted p-3 rounded-lg">
              {renderCheckbox(formData, handleFieldChange, b, 's1_interface_rh', 'Recursos Humanos')}
              {renderCheckbox(formData, handleFieldChange, b, 's1_interface_compras', 'Compras/Suprimentos')}
              {renderCheckbox(formData, handleFieldChange, b, 's1_interface_vendas', 'Vendas/Comercial')}
              {renderCheckbox(formData, handleFieldChange, b, 's1_interface_logistica', 'Logística/Estoque')}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">2. Sistemas & Tecnologia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderInput(formData, handleFieldChange, b, 's2_erp_atual', '2.1 ERP/Sistema atual')}
          {renderRadioGroup(formData, handleFieldChange, b, 's2_implantacao_erp', '2.2 Implantação ERP', [
            { value: 'sim', label: 'Sim, funcional' }, { value: 'parcial', label: 'Parcialmente' }, { value: 'nao', label: 'Não' }
          ])}
          <div className="col-span-1 md:col-span-2">
            {renderTextarea(formData, handleFieldChange, b, 's2_dificuldades_sistema', '2.5 Dificuldades com tecnologia')}
          </div>
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">3. Estrutura Bancária</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderInput(formData, handleFieldChange, b, 's3_qtd_contas', '3.1 Quantas contas PJ ativas?', 'number')}
          {renderTextarea(formData, handleFieldChange, b, 's3_bancos_principais', '3.2 Bancos utilizados')}
          <div className="col-span-1 md:col-span-2">
            {renderRadioGroup(formData, handleFieldChange, b, 's3_mistura_pf_pj', '3.5 Mistura de contas PF/PJ?', [
              { value: 'frequente', label: 'Frequente' }, { value: 'raro', label: 'Raramente' }, { value: 'nunca', label: 'Nunca' }
            ])}
          </div>
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">4. Operacional e 5. Governança</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderTextarea(formData, handleFieldChange, b, 's41_recebimento_docs', '4.1.1 Recebimento de docs')}
          {renderTextarea(formData, handleFieldChange, b, 's5_fechamento_mensal', '5.2 Fechamento mensal')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">6. Estratégico</h3>
        {renderTextarea(formData, handleFieldChange, b, 's6_visao_futuro', 'Visão de 12 meses')}
      </div>

      {/* Assinaturas Bloco 01 */}
      <div className="bg-muted rounded-xl border border-border p-6">
        <h4 className="text-md font-bold text-foreground mb-4">Assinaturas e Validação (Bloco 01)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput(formData, handleFieldChange, b, 'assinatura_cliente_nome_b1', 'Nome do Cliente')}
          {renderInput(formData, handleFieldChange, b, 'assinatura_engagement_nome_b1', 'Responsável Engagement')}
          {renderInput(formData, handleFieldChange, b, 'assinatura_data_b1', 'Data de Validação', 'date')}
        </div>
      </div>

      <DiagnosticoUploadSection 
        clienteFasesId={faseId} 
        uploads={diagnosticoUploads}
        onUploadSuccess={onUploadSuccess}
        onDeleteSuccess={onDeleteSuccess}
      />

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} className="bg-primary text-primary-foreground">
          Próxima Etapa: Análise e Aprovação <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}


// ==============================================
// BLOCO 02 - TAB CONTENT
// ==============================================
export function Bloco02Tab({ formData, handleFieldChange, onPrev, handleSave, progress, faseId, clienteId }) {
  const b = 'bloco02';
  return (
    <div className="space-y-6">
      <ProgressHeader progress={progress} />

      <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Bloco 02 – Recebimento de Acessos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderInput(formData, handleFieldChange, b, 'empresa_nome', 'Empresa (Razão Social/Fantasia)')}
          {renderInput(formData, handleFieldChange, b, 'responsavel_entrevista', 'Responsável pela entrevista')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">1. Bancos & Financeiro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderTextarea(formData, handleFieldChange, b, 'b2_s1_q1', '1.1 Internet Banking (Acessos, tokens)')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s1_q2', '1.2 Plataformas de cobrança')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s1_q3', '1.3 Gateways de pagamento')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s1_q4', '1.4 Aplicações financeiras')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">2. ERP / Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderTextarea(formData, handleFieldChange, b, 'b2_s2_q1', '2.1 Acesso ao ERP (Login)')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s2_q2', '2.2 Módulos liberados')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">3. Faturamento & Fiscal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderTextarea(formData, handleFieldChange, b, 'b2_s3_q1', '3.1 Acesso ao emissor NF')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s3_q2', '3.2 Certificado digital (A1/A3)')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">4. Contábil e 5. Operacional</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderTextarea(formData, handleFieldChange, b, 'b2_s4_q1', '4.1 Contato do escritório contábil')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s5_q1', '5.1 Sistema de compras')}
        </div>
      </div>

      <div className="bg-background rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 border-b border-border pb-2">6. Infraestrutura</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderTextarea(formData, handleFieldChange, b, 'b2_s6_q1', '6.1 E-mail financeiro')}
          {renderTextarea(formData, handleFieldChange, b, 'b2_s6_q3', '6.3 Pastas compartilhadas')}
        </div>
      </div>

      <hr className="my-8 border-border" />
      
      <ImplantacaoChecklistSection clienteFasesId={faseId} />

      <ImplantacaoUploadsSection clienteId={clienteId} clienteFasesId={faseId} />

      <hr className="my-8 border-border" />

      {/* Assinaturas Bloco 02 */}
      <div className="bg-muted rounded-xl border border-border p-6">
        <h4 className="text-md font-bold text-foreground mb-4">Assinaturas e Validação (Bloco 02)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderInput(formData, handleFieldChange, b, 'assinatura_cliente_nome_b2', 'Nome do Cliente')}
          {renderInput(formData, handleFieldChange, b, 'assinatura_engagement_nome_b2', 'Responsável Engagement')}
          {renderInput(formData, handleFieldChange, b, 'assinatura_data_b2', 'Data de Validação', 'date')}
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={onPrev} className="border-border text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
        </Button>
        <Button onClick={handleSave} className="bg-primary text-primary-foreground px-8">
          <Save className="w-4 h-4 mr-2" />
          Salvar Dados Completos
        </Button>
      </div>
    </div>
  );
}