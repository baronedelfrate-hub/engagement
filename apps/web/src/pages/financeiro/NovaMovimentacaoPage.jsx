import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import PageHeader from '@/components/PageHeader';
import { ArrowLeft, Loader2, Upload, X, File as FileIcon } from 'lucide-react';

const NovaMovimentacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company_id, user } = useAuthContext();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [tipo, setTipo] = useState('pagar');
  const [numeroTitulo, setNumeroTitulo] = useState(`CP-${Date.now()}`);
  const [entidadeId, setEntidadeId] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dataVencimento, setDataVencimento] = useState('');
  const [valorTotal, setValorTotal] = useState('');

  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoriaId, setSubcategoriaId] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [bancoId, setBancoId] = useState('');

  const [gerarParcelamento, setGerarParcelamento] = useState(false);
  const [numeroParcelas, setNumeroParcelas] = useState(2);
  const [periodicidade, setPeriodicidade] = useState('mensal');

  const [documentos, setDocumentos] = useState([]);
  const [observacoes, setObservacoes] = useState('');

  // Dropdown Data
  const [clientes, setClientes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [bancos, setBancos] = useState([]);

  useEffect(() => {
    if (company_id) {
      loadDropdownData();
    }
  }, [company_id]);

  useEffect(() => {
    setNumeroTitulo((tipo === 'pagar' ? 'CP-' : 'CR-') + Date.now());
    setEntidadeId('');
  }, [tipo]);

  const loadDropdownData = async () => {
    setFetchingData(true);
    try {
      const [cliRes, fornRes, catRes, subRes, ccRes, banRes] = await Promise.all([
        supabase.from('clientes').select('id, nome').eq('company_id', company_id).order('nome'),
        supabase.from('fornecedores').select('id, nome').eq('company_id', company_id).order('nome'),
        supabase.from('categorias').select('id, nome').eq('company_id', company_id).order('nome'),
        supabase.from('subcategorias').select('id, nome, categoria_id').eq('company_id', company_id).order('nome'),
        supabase.from('centros_custo').select('id, nome').eq('company_id', company_id).order('nome'),
        supabase.from('bancos').select('id, nome').eq('company_id', company_id).order('nome')
      ]);

      setClientes(cliRes.data || []);
      setFornecedores(fornRes.data || []);
      setCategorias(catRes.data || []);
      setSubcategorias(subRes.data || []);
      setCentrosCusto(ccRes.data || []);
      setBancos(banRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      toast({ title: 'Erro', description: 'Falha ao carregar opções do formulário.', variant: 'destructive' });
    } finally {
      setFetchingData(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocumentos((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setDocumentos((prev) => prev.filter((_, i) => i !== index));
  };

  const addPeriod = (dateStr, num, freq) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    if (freq === 'mensal') {
      d.setMonth(d.getMonth() + num);
    } else if (freq === 'quinzenal') {
      d.setDate(d.getDate() + (15 * num));
    } else if (freq === 'semanal') {
      d.setDate(d.getDate() + (7 * num));
    }
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!valorTotal || isNaN(valorTotal) || Number(valorTotal) <= 0) {
      toast({ title: 'Atenção', description: 'Informe um valor total válido.', variant: 'destructive' });
      return;
    }
    if (!dataVencimento) {
      toast({ title: 'Atenção', description: 'A data de vencimento é obrigatória.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const parcelsCount = gerarParcelamento ? parseInt(numeroParcelas, 10) : 1;
      const baseValue = Number(valorTotal) / parcelsCount;
      let currentParentId = null;

      // Create Movement(s)
      for (let i = 1; i <= parcelsCount; i++) {
        const isFirst = (i === 1);
        const parcelDate = isFirst ? dataVencimento : addPeriod(dataVencimento, i - 1, periodicidade);
        
        const record = {
          company_id,
          tipo,
          numero_titulo: parcelsCount > 1 ? `${numeroTitulo}-${i}/${parcelsCount}` : numeroTitulo,
          cliente_id: tipo === 'receber' ? entidadeId : null,
          fornecedor_id: tipo === 'pagar' ? entidadeId : null,
          valor_total: baseValue,
          data_emissao: dataEmissao,
          data_vencimento: parcelDate,
          categoria_id: categoriaId || null,
          subcategoria_id: subcategoriaId || null,
          centro_custo_id: centroCustoId || null,
          banco_id: bancoId || null,
          status: 'pendente',
          observacoes,
          parcela_atual: i,
          total_parcelas: parcelsCount,
          movimentacao_pai_id: isFirst ? null : currentParentId,
          created_by: user?.id
        };

        const { data: insData, error: insError } = await supabase
          .from('movimentacao_financeira')
          .insert(record)
          .select()
          .single();

        if (insError) throw insError;
        
        if (isFirst) {
          currentParentId = insData.id;
        }
      }

      // Upload Documents (linked to parent)
      if (documentos.length > 0 && currentParentId) {
        const uploadPromises = documentos.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${company_id}/${currentParentId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('movimentacao-docs')
            .upload(filePath, file);

          if (uploadError) {
             console.error("Upload warning: Might fail if bucket or RLS is missing:", uploadError.message);
             // don't break the whole process if only file upload fails, just log it
             return null; 
          }

          return {
            movimentacao_id: currentParentId,
            company_id,
            tipo_documento: 'nota',
            nome_arquivo: file.name,
            storage_path: filePath,
            created_by: user?.id
          };
        });

        const docsData = (await Promise.all(uploadPromises)).filter(Boolean);
        if (docsData.length > 0) {
          await supabase.from('movimentacao_documentos').insert(docsData);
        }
      }

      toast({ title: 'Sucesso', description: 'Movimentação registrada com sucesso.' });
      navigate('/movimentacao-financeira');

    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast({ title: 'Erro', description: err.message || 'Erro ao registrar movimentação.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSubcategorias = subcategorias.filter(s => !categoriaId || s.categoria_id === categoriaId);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/movimentacao-financeira')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader 
          title="Nova Movimentação" 
          description="Crie um novo registro de contas a pagar ou a receber."
        />
      </div>

      {fetchingData ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <Card className="bg-background border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Identificação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Movimentação *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Número do Título *</Label>
                <Input 
                  value={numeroTitulo} 
                  onChange={(e) => setNumeroTitulo(e.target.value)} 
                  required
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label>{tipo === 'pagar' ? 'Fornecedor' : 'Cliente'}</Label>
                <Select value={entidadeId} onValueChange={setEntidadeId}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(tipo === 'pagar' ? fornecedores : clientes).map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor Total (R$) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0.01" 
                  value={valorTotal} 
                  onChange={(e) => setValorTotal(e.target.value)} 
                  required
                  placeholder="0,00"
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Emissão *</Label>
                <Input 
                  type="date" 
                  value={dataEmissao} 
                  onChange={(e) => setDataEmissao(e.target.value)} 
                  required
                  className="bg-background border-border text-foreground block w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Vencimento *</Label>
                <Input 
                  type="date" 
                  value={dataVencimento} 
                  onChange={(e) => setDataVencimento(e.target.value)} 
                  required
                  className="bg-background border-border text-foreground block w-full"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Classificação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoriaId} onValueChange={(val) => { setCategoriaId(val); setSubcategoriaId(''); }}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categorias.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subcategoria</Label>
                <Select value={subcategoriaId} onValueChange={setSubcategoriaId} disabled={!categoriaId || categoriaId === 'none'}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {filteredSubcategorias.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {centrosCusto.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Banco de Preferência</Label>
                <Select value={bancoId} onValueChange={setBancoId}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {bancos.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Parcelamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="parcelamento" 
                  checked={gerarParcelamento} 
                  onCheckedChange={setGerarParcelamento}
                  className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" 
                />
                <Label htmlFor="parcelamento" className="text-foreground">Gerar parcelamento em múltiplos registros</Label>
              </div>

              {gerarParcelamento && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border border-border rounded-md bg-muted/20">
                  <div className="space-y-2">
                    <Label>Número de Parcelas</Label>
                    <Input 
                      type="number" 
                      min="2" 
                      max="120"
                      value={numeroParcelas} 
                      onChange={(e) => setNumeroParcelas(e.target.value)} 
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Periodicidade</Label>
                    <Select value={periodicidade} onValueChange={setPeriodicidade}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Documentos Anexos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer relative">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Clique para fazer upload de documentos</p>
                <p className="text-xs text-muted-foreground/80 mt-1">PDFs, imagens (máx. 10MB)</p>
                <input 
                  type="file" 
                  multiple 
                  accept="application/pdf,image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>

              {documentos.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Label>Arquivos selecionados:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {documentos.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border border-border rounded-md bg-background">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm text-foreground truncate">{file.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => removeFile(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-background border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes adicionais sobre a movimentação..."
                className="min-h-[100px] bg-background border-border text-foreground"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => navigate('/movimentacao-financeira')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Movimentação
            </Button>
          </div>

        </form>
      )}
    </div>
  );
};

export default NovaMovimentacaoPage;