import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Briefcase, DollarSign, CreditCard, Link as LinkIcon, FileText, Check, ChevronsUpDown, Info, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../utils/nfseUtils';
import { nfseServicosService } from '../services/nfseServicosService';
import { useFiscalMunicipios } from '@/hooks/useFiscalMunicipios';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/customSupabaseClient';

const RET = ['ret_pis', 'ret_cofins', 'ret_csll', 'ret_irrf', 'ret_inss'];

export default function NfseServicosForm({ formData, setFormData, vinculacoes, setVinculacoes, dropdowns }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMunicipioDisplay, setSelectedMunicipioDisplay] = useState('');
  
  const [localMunicipios, setLocalMunicipios] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  const dropdownRef = useRef(null);
  
  const { getMunicipioById } = useFiscalMunicipios(50);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carrega o display name inicial
  useEffect(() => {
    const loadInitialDisplay = async () => {
      if (formData.municipio_id) {
        if (formData.municipio_incidencia_iss_nome) {
          // Use form data instantly if available
          setSelectedMunicipioDisplay(`${formData.municipio_incidencia_iss_nome} - ${formData.municipio_incidencia_iss_uf || ''}`);
        } else {
          // Fetch from DB if name isn't directly in formData yet
          const mun = await getMunicipioById(formData.municipio_id);
          if (mun) {
            setSelectedMunicipioDisplay(mun.nome_formatado || `${mun.nome_municipio} - ${mun.uf}`);
          }
        }
      } else {
        setSelectedMunicipioDisplay('');
      }
    };
    loadInitialDisplay();
  }, [formData.municipio_id, formData.municipio_incidencia_iss_nome, formData.municipio_incidencia_iss_uf, getMunicipioById]);

  // Efeito com Debounce para a busca de municípios
  useEffect(() => {
    if (!isDropdownOpen) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      
      try {
        let query = supabase.from('fiscal_municipios_ibge').select('*');
        
        if (searchTerm && searchTerm.trim() !== '') {
          const safeTerm = searchTerm.trim();
          query = query.or(`nome_municipio.ilike.%${safeTerm}%,nome_formatado.ilike.%${safeTerm}%`);
        }
        
        query = query.limit(50);
        const { data, error } = await query;
        
        if (error) throw error;
        
        console.log("Resultados encontrados:", data?.length || 0);
        setLocalMunicipios(data || []);
      } catch (err) {
        console.error('Erro na busca de municípios:', err);
        setSearchError('Erro ao buscar municípios: ' + err.message);
        setLocalMunicipios([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isDropdownOpen]);

  // Cálculos automáticos de impostos
  useEffect(() => {
    try {
      const qtd = parseFloat(formData.quantidade) || 0;
      const vSrv = parseFloat(formData.valor_servico) || 0;
      const aliq = parseFloat(formData.aliquota) || 0;
      const totalServico = qtd * vSrv;
      const vImp = (totalServico * aliq) / 100;
      // retenção com % informado é calculada sobre o valor do serviço; sem %, vale o valor digitado
      const calc = {};
      for (const k of RET) {
        const pct = parseFloat(formData[k.replace('ret_', 'pct_')]) || 0;
        calc[k] = pct > 0 ? Number(((totalServico * pct) / 100).toFixed(2)) : (parseFloat(formData[k]) || 0);
      }
      const ret = RET.reduce((t, k) => t + calc[k], 0);
      const vLiq = totalServico - vImp - ret;

      setFormData(prev => ({
        ...prev,
        valor_imposto: vImp,
        ...calc,
        retencoes: Number(ret.toFixed(2)),
        valor_liquido: vLiq
      }));
    } catch (err) {
      console.error('[NfseServicosForm ERRO] Falha ao calcular totais:', err);
    }
  }, [formData.quantidade, formData.valor_servico, formData.aliquota, formData.ret_pis, formData.ret_cofins, formData.ret_csll, formData.ret_irrf, formData.ret_inss, formData.pct_pis, formData.pct_cofins, formData.pct_csll, formData.pct_irrf, formData.pct_inss, setFormData]);

  useEffect(() => { if (formData.empresa_id && !formData.id) aplicarPadroes(formData.empresa_id); }, [formData.empresa_id]); // eslint-disable-line

  const handleChange = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));
  const handleVincChange = (k, v) => setVinculacoes(prev => ({ ...prev, [k]: v === 'none' ? null : v }));

  const handleServicoSelect = (id) => {
    const srv = dropdowns.servicos?.find(s => s.id === id);
    if (srv) {
      handleChange('servico_id', id);
      handleChange('codigo_servico', srv.codigo_servico_lc116 || '');
      handleChange('descricao_servico', srv.descricao || srv.nome);
      if (!formData.valor_servico) handleChange('valor_servico', srv.preco || 0);
      if (!formData.aliquota) handleChange('aliquota', srv.aliquota_issqn || 0);
    }
  };

  // Preenche só o que estiver vazio com o padrão da empresa (Parâmetros Fiscais / card da Focus NFe)
  const aplicarPadroes = async (empresaId) => {
    if (!empresaId) return;
    const { data: p } = await supabase.from('parametros_nfse').select('*').eq('empresa_id', empresaId).maybeSingle();
    if (!p) return;
    let mun = null;
    if (!formData.municipio_id && p.municipio_prestacao_id) {
      const { data: m } = await supabase.from('fiscal_municipios_ibge').select('*').eq('id', p.municipio_prestacao_id).maybeSingle();
      mun = m;
    }
    setFormData(prev => {
      const vazio = (v) => v === undefined || v === null || v === '' || v === 0;
      const n = { ...prev };
      if (vazio(prev.codigo_servico) && p.codigo_tributacao_nacional) n.codigo_servico = p.codigo_tributacao_nacional;
      if (vazio(prev.codigo_tributacao_municipal) && p.codigo_tributacao_municipal) n.codigo_tributacao_municipal = p.codigo_tributacao_municipal;
      if (vazio(prev.codigo_nbs) && p.codigo_nbs) n.codigo_nbs = p.codigo_nbs;
      if (vazio(prev.ibs_cbs_cst) && p.ibs_cbs_cst) n.ibs_cbs_cst = p.ibs_cbs_cst;
      if (vazio(prev.ibs_cbs_class_trib) && p.ibs_cbs_class_trib) n.ibs_cbs_class_trib = p.ibs_cbs_class_trib;
      if (vazio(prev.codigo_indicador_operacao) && p.codigo_indicador_operacao) n.codigo_indicador_operacao = p.codigo_indicador_operacao;
      if (p.tributacao_iss) n.tributacao_iss = prev.tributacao_iss || p.tributacao_iss;
      if (p.iss_retido != null && !prev.id) n.iss_retido = !!p.iss_retido;
      if (vazio(prev.aliquota) && p.aliquota_iss_padrao) n.aliquota = Number(p.aliquota_iss_padrao);
      if (vazio(prev.pct_irrf) && p.retencao_irrf_padrao) n.pct_irrf = Number(p.retencao_irrf_padrao);
      if (vazio(prev.pct_pis) && p.retencao_pis_padrao) n.pct_pis = Number(p.retencao_pis_padrao);
      if (vazio(prev.pct_cofins) && p.retencao_cofins_padrao) n.pct_cofins = Number(p.retencao_cofins_padrao);
      if (vazio(prev.pct_csll) && p.retencao_csll_padrao) n.pct_csll = Number(p.retencao_csll_padrao);
      if (mun) { n.municipio_id = mun.id; n.municipio_incidencia_iss_codigo_ibge = mun.codigo_ibge; n.municipio_incidencia_iss_nome = mun.nome_municipio; n.municipio_incidencia_iss_uf = mun.uf; }
      return n;
    });
  };

  const handleEmpresaSelect = async (id) => {
    handleChange('empresa_id', id);
    await aplicarPadroes(id);
    if (!formData.numero) {
      const nextNum = await nfseServicosService.getNextNfseNumber(id);
      handleChange('numero', nextNum);
    }
  };

  const handleSelectMunicipio = (municipio) => {
    if (!municipio) return;
    
    setFormData(prev => ({
      ...prev,
      municipio_id: municipio.id,
      municipio_incidencia_iss_codigo_ibge: municipio.codigo_ibge,
      municipio_incidencia_iss_nome: municipio.nome_municipio,
      municipio_incidencia_iss_uf: municipio.uf
    }));
    
    setSelectedMunicipioDisplay(municipio.nome_formatado || `${municipio.nome_municipio} - ${municipio.uf}`);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SEÇÃO 1 - DADOS BÁSICOS */}
        <Card className="shadow-sm border-border">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> 1. Dados Básicos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Empresa Emitente *</Label>
              <Select value={formData.empresa_id} onValueChange={handleEmpresaSelect}>
                <SelectTrigger className="text-foreground bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dropdowns.empresas?.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Número da Nota *</Label>
              <Input value={formData.numero} onChange={e => handleChange('numero', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Série *</Label>
              <Input value={formData.serie} onChange={e => handleChange('serie', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>RPS *</Label>
              <Input value={formData.rps} onChange={e => handleChange('rps', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Data de Emissão *</Label>
              <Input type="date" value={formData.data_emissao} onChange={e => handleChange('data_emissao', e.target.value)} className="text-foreground bg-background" />
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 2 - CLIENTE E LOCALIZAÇÃO */}
        {/* z-20: o Card é um motion.div (cria contexto de empilhamento próprio); sem isso o card seguinte cobre a lista de municípios */}
        <Card className="shadow-sm border-border h-fit overflow-visible z-20">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> 2. Cliente e Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 overflow-visible">
            <div className="space-y-1">
              <Label>Cliente / Tomador *</Label>
              <Select value={formData.cliente_id} onValueChange={v => handleChange('cliente_id', v)}>
                <SelectTrigger className="text-foreground bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dropdowns.clientes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1 flex flex-col relative z-50" ref={dropdownRef}>
              <div className="flex justify-between items-center mb-1">
                <Label className={searchError || !formData.municipio_id ? "text-red-500" : ""}>
                  Município de Incidência do ISS *
                </Label>
                {formData.municipio_incidencia_iss_codigo_ibge && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center text-xs text-muted-foreground cursor-help">
                          <Info className="h-3 w-3 mr-1" />
                          Cod. IBGE: {formData.municipio_incidencia_iss_codigo_ibge}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Código oficial do município no IBGE</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              {/* Custom Combobox Trigger */}
              <div 
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 text-sm bg-background border rounded-md cursor-pointer transition-colors hover:bg-muted ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  isDropdownOpen ? "ring-2 ring-ring ring-offset-2" : "",
                  (searchError || !formData.municipio_id) ? "border-red-500" : "border-input"
                )}
                onClick={() => setIsDropdownOpen(true)}
              >
                <span className={cn("truncate", !selectedMunicipioDisplay ? "text-muted-foreground" : "text-foreground")}>
                  {selectedMunicipioDisplay || "Buscar por cidade (ex: Indaiatuba)..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </div>

              {/* Custom Combobox Dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-[9999] min-w-full rounded-md border bg-background shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="flex items-center border-b px-3 py-2 bg-muted/50">
                    <Search className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <input 
                      autoFocus
                      className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                      placeholder="Ex: São Paulo, Indaiatuba..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsDropdownOpen(false);
                      }}
                    />
                  </div>
                  
                  <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar bg-background">
                    {isSearching ? (
                      <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" /> Buscando...
                      </div>
                    ) : localMunicipios.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum município encontrado.
                      </div>
                    ) : (
                      localMunicipios.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between px-3 py-2 cursor-pointer rounded-sm hover:bg-muted transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault(); 
                            handleSelectMunicipio(m);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground text-sm">{m.nome_formatado || `${m.nome_municipio} - ${m.uf}`}</span>
                            <span className="text-xs text-muted-foreground">IBGE: {m.codigo_ibge}</span>
                          </div>
                          {formData.municipio_id === m.id && (
                            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {searchError && (
                <div className="mt-2 p-2 bg-red-50 text-red-600 rounded text-xs flex items-start gap-1 border border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{searchError}</p>
                </div>
              )}
              {!formData.municipio_id && !searchError && (
                <p className="text-xs text-red-500 mt-1">Este campo é obrigatório</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 3 - SERVIÇO */}
        <Card className="shadow-sm border-border col-span-1 lg:col-span-2">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" /> 3. Detalhes do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-full md:col-span-3 space-y-1">
              <Label>Serviço Prestado *</Label>
              <Select value={formData.servico_id} onValueChange={handleServicoSelect}>
                <SelectTrigger className="text-foreground bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dropdowns.servicos?.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Código LC 116/03</Label>
              <Input value={formData.codigo_servico || ''} onChange={e => handleChange('codigo_servico', e.target.value)} placeholder="Ex.: 17.01 (preenche sozinho se o serviço tiver o código)" className="text-foreground bg-background" />
            </div>
            <div className="col-span-full space-y-1">
              <Label>Descrição Completa do Serviço</Label>
              <Textarea 
                value={formData.descricao_servico} 
                onChange={e => handleChange('descricao_servico', e.target.value)} 
                className="text-foreground min-h-[80px] bg-background" 
              />
            </div>
            <div className="space-y-1">
              <Label>Quantidade *</Label>
              <Input type="number" min="1" step="0.01" value={formData.quantidade} onChange={e => handleChange('quantidade', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Valor Unitário (R$) *</Label>
              <Input type="number" min="0" step="0.01" value={formData.valor_servico} onChange={e => handleChange('valor_servico', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="col-span-2 space-y-1 bg-muted p-2 rounded flex flex-col justify-center items-end border border-border">
              <Label className="text-xs text-muted-foreground">Valor Total do Serviço</Label>
              <span className="text-lg font-semibold text-foreground">{formatCurrency((parseFloat(formData.quantidade)||0) * (parseFloat(formData.valor_servico)||0))}</span>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 4 - IMPOSTOS E RETENÇÕES */}
        <Card className="shadow-sm border-border">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-600" /> 4. Impostos e Retenções
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Alíquota ISS (%)</Label>
              <Input type="number" min="0" step="0.01" value={formData.aliquota} onChange={e => handleChange('aliquota', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Valor do Imposto</Label>
              <Input value={formatCurrency(formData.valor_imposto)} readOnly className="bg-muted text-foreground" />
            </div>
            <div className="col-span-full space-y-2">
              <div className="flex items-center justify-between">
                <Label>Retenções na fonte (informe o % e o valor é calculado)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, pct_irrf: 1.5, pct_pis: 0.65, pct_cofins: 3, pct_csll: 1 }))}>Aplicar padrão (IRRF 1,5% + PIS/COFINS/CSLL 4,65%)</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[['pis', 'PIS'], ['cofins', 'COFINS'], ['csll', 'CSLL'], ['irrf', 'IRRF'], ['inss', 'INSS']].map(([k, rot]) => {
                  const pct = parseFloat(formData[`pct_${k}`]) || 0;
                  return (
                    <div className="space-y-1 rounded border border-border p-2" key={k}>
                      <Label>{rot}</Label>
                      <div className="flex gap-2">
                        <Input type="number" min="0" step="0.01" placeholder="%" value={formData[`pct_${k}`] ?? 0} onChange={e => handleChange(`pct_${k}`, e.target.value)} className="w-20 text-foreground bg-background" />
                        <Input type="number" min="0" step="0.01" placeholder="R$" value={formData[`ret_${k}`] ?? 0} readOnly={pct > 0} onChange={e => handleChange(`ret_${k}`, e.target.value)} className={`text-red-600 font-medium ${pct > 0 ? 'bg-muted' : 'bg-background'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Total de retenções (R$)</Label>
              <Input value={formatCurrency(formData.retencoes)} readOnly className="bg-muted text-foreground" />
            </div>
            <div className="space-y-1 bg-emerald-50 p-2 rounded border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 flex flex-col justify-center items-end">
              <Label className="text-xs text-emerald-700 dark:text-emerald-400">Valor Líquido da Nota</Label>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(formData.valor_liquido)}</span>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 4B - NFS-e NACIONAL / REFORMA TRIBUTÁRIA */}
        <Card className="shadow-sm border-border lg:col-span-2">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" /> NFS-e Nacional: tributação e Reforma Tributária (IBS/CBS)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Código de tributação nacional</Label>
              <Input value={formData.codigo_servico || ''} onChange={e => handleChange('codigo_servico', e.target.value)} placeholder="17.10.01" className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Código de tributação municipal</Label>
              <Input value={formData.codigo_tributacao_municipal || ''} onChange={e => handleChange('codigo_tributacao_municipal', e.target.value)} className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>NBS</Label>
              <Input value={formData.codigo_nbs || ''} onChange={e => handleChange('codigo_nbs', e.target.value)} placeholder="1.1806.63.00" className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de tributação do ISS</Label>
              <Select value={String(formData.tributacao_iss || 1)} onValueChange={v => handleChange('tributacao_iss', Number(v))}>
                <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Operação tributável</SelectItem>
                  <SelectItem value="2">Imunidade</SelectItem>
                  <SelectItem value="3">Exportação de serviço</SelectItem>
                  <SelectItem value="4">Não incidência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>ISS retido pelo tomador?</Label>
              <Select value={formData.iss_retido ? 'sim' : 'nao'} onValueChange={v => handleChange('iss_retido', v === 'sim')}>
                <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não retido</SelectItem>
                  <SelectItem value="sim">Retido pelo tomador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Enviar a alíquota do ISS na nota?</Label>
              <Select value={formData.enviar_aliquota_iss ? 'sim' : 'nao'} onValueChange={v => handleChange('enviar_aliquota_iss', v === 'sim')}>
                <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não (usar a alíquota do município)</SelectItem>
                  <SelectItem value="sim">Sim, enviar a alíquota da tela</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>CST IBS/CBS</Label>
              <Input value={formData.ibs_cbs_cst || ''} onChange={e => handleChange('ibs_cbs_cst', e.target.value)} placeholder="000" className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>cClassTrib (classificação IBS/CBS)</Label>
              <Input value={formData.ibs_cbs_class_trib || ''} onChange={e => handleChange('ibs_cbs_class_trib', e.target.value)} placeholder="000001" className="text-foreground bg-background" />
            </div>
            <div className="space-y-1">
              <Label>Indicador da operação (cIndOp)</Label>
              <Input value={formData.codigo_indicador_operacao || ''} onChange={e => handleChange('codigo_indicador_operacao', e.target.value)} placeholder="040101" className="text-foreground bg-background" />
            </div>
            <div className="col-span-full text-xs text-muted-foreground">
              Os valores de IBS (estadual e municipal) e CBS são calculados pela própria Receita e aparecem na nota emitida; em 2026 são só informativos. O município e o código IBGE de incidência são os do campo "Município de Incidência do ISS", na seção 2.
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 5 - VINCULAÇÕES E PAGAMENTO */}
        <Card className="shadow-sm border-border">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-muted-foreground" /> 5. Pagamento e Vinculações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label>Condição de Pagamento *</Label>
              <Select value={formData.condicao_pagamento_id} onValueChange={v => handleChange('condicao_pagamento_id', v)}>
                <SelectTrigger className="text-foreground bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {dropdowns.condicoes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Pedido de Venda</Label>
                <Select value={vinculacoes.pedido_venda_id || 'none'} onValueChange={v => handleVincChange('pedido_venda_id', v)}>
                  <SelectTrigger className="text-foreground bg-background"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {dropdowns.pedidos?.map(p => <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Proposta Comercial</Label>
                <Select value={vinculacoes.proposta_id || 'none'} onValueChange={v => handleVincChange('proposta_id', v)}>
                  <SelectTrigger className="text-foreground bg-background"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {dropdowns.propostas?.map(p => <SelectItem key={p.id} value={p.id}>{p.numero || 'S/N'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEÇÃO 6 - OBSERVAÇÕES */}
        <Card className="shadow-sm border-border">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> 6. Observações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Textarea 
              value={formData.observacoes} 
              onChange={e => handleChange('observacoes', e.target.value)} 
              className="min-h-[120px] text-foreground text-sm bg-background"
              placeholder="Texto livre para aparecer no corpo da nota (rodapé)..."
            />
          </CardContent>
        </Card>

        {/* SEÇÃO 7 - STATUS */}
        <Card className="shadow-sm border-border col-span-1 lg:col-span-2">
          <CardHeader className="py-3 border-b border-border bg-muted/50">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" /> 7. Status e Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="max-w-md space-y-1">
              <Label>Status da NFS-e *</Label>
              <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger className="text-foreground font-medium bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em digitação">Em digitação</SelectItem>
                  <SelectItem value="Aguardando emissão">Aguardando emissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-blue-50 text-blue-800 rounded text-sm border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Certifique-se de que o Município de Incidência do ISS está corretamente selecionado. O código IBGE será utilizado para as regras de retenção.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}