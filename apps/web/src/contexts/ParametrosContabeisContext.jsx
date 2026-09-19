import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { compararCodigos, normalizarCodigo } from '@/lib/planoContas';
import { importarPlano, sincronizarPlanoDaEmpresa } from '@/lib/planoContasService';

const ParametrosContabeisContext = createContext();

// Traduz o erro do banco em uma mensagem que o usuário consegue agir sobre
const mensagemDeErro = (error, padrao) => {
  if (error?.code === '42501' || /row-level security/i.test(error?.message || '')) {
    return 'Sem permissão para gravar aqui. Selecione uma empresa (configurações globais só o superadmin altera).';
  }
  if (error?.code === '23503') return 'Este registro está em uso e não pode ser removido. Inative-o em vez de excluir.';
  if (error?.code === '23505') return 'Já existe um registro com este código.';
  return error?.message || padrao;
};

export const useParametrosContabeis = () => {
  const context = useContext(ParametrosContabeisContext);
  if (!context) throw new Error('useParametrosContabeis must be used within ParametrosContabeisProvider');
  return context;
};

export const ParametrosContabeisProvider = ({ children }) => {
  const { toast } = useToast();
  const [empresaId, setEmpresaId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [data, setData] = useState({
    contas: [],
    vinculacoes: [],
    centrosCusto: [],
    historicos: [],
    competencias: [],
    layouts: [],
    regras: [],
    fechamento: null
  });

  useEffect(() => {
    const fetchEmpresas = async () => {
      const { data: emp } = await supabase.from('empresas').select('id, razao_social').eq('ativo', true);
      if (emp) {
        setEmpresas(emp);
        // Quem enxerga uma única empresa (admin) já começa com ela selecionada: "todas" gravaria sem empresa e seria recusado
        if (emp.length === 1) setEmpresaId(emp[0].id);
      }
    };
    fetchEmpresas();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filter = empresaId !== 'all' ? empresaId : null;

      // Plano único: contas_contabeis (as pc_* antigas ficam sem uso)
      let consultaContas = supabase.from('contas_contabeis').select('*');
      if (filter) consultaContas = consultaContas.eq('empresa_id', filter);

      const promises = [
        consultaContas,
        supabase.from('pc_vinculacoes').select('*'),
        supabase.from('centros_custo').select('*'),
        supabase.from('pc_historicos').select('*').order('codigo'),
        supabase.from('pc_competencias').select('*').order('competencia', { ascending: false }),
        supabase.from('pc_layouts').select('*'),
        supabase.from('pc_regras_integracao').select('*'),
        supabase.from('pc_parametros_fechamento').select('*').limit(1)
      ];

      const results = await Promise.all(promises);
      
      setData({
        contas: (results[0].data || []).slice().sort((a, b) => compararCodigos(a.codigo, b.codigo)),
        vinculacoes: results[1].data || [],
        centrosCusto: results[2].data || [],
        historicos: results[3].data || [],
        competencias: results[4].data || [],
        layouts: results[5].data || [],
        regras: results[6].data || [],
        fechamento: results[7].data?.[0] || null
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Falha ao carregar parâmetros.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [empresaId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveItem = async (table, item) => {
    try {
      const payload = { ...item, empresa_id: empresaId !== 'all' ? empresaId : null };
      let res;
      if (item.id) {
        res = await supabase.from(table).update(payload).eq('id', item.id);
      } else {
        res = await supabase.from(table).insert([payload]);
      }
      if (res.error) throw res.error;
      toast({ title: 'Sucesso', description: 'Registro salvo com sucesso.' });
      fetchData();
      return true;
    } catch (error) {
      toast({ title: 'Erro', description: mensagemDeErro(error, 'Falha ao salvar.'), variant: 'destructive' });
      return false;
    }
  };

  const deleteItem = async (table, id) => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Registro removido.' });
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: mensagemDeErro(error, 'Falha ao remover.'), variant: 'destructive' });
    }
  };

  // Plano de contas: grava em contas_contabeis e reflete no Financeiro (categorias/subcategorias)
  const saveConta = async (conta) => {
    if (empresaId === 'all') {
      toast({ title: 'Selecione a empresa', description: 'O plano de contas pertence a uma empresa.', variant: 'destructive' });
      return false;
    }
    const codigo = normalizarCodigo(conta.codigo || '');
    if (!codigo || !(conta.nome || '').trim()) {
      toast({ title: 'Erro', description: 'Informe o código e a descrição da conta.', variant: 'destructive' });
      return false;
    }
    try {
      const partes = codigo.split('.');
      const codigoPai = partes.length > 1 ? partes.slice(0, -1).join('.') : null;
      const pai = codigoPai ? data.contas.find(c => c.codigo === codigoPai) : null;
      const payload = {
        empresa_id: empresaId,
        codigo,
        nome: conta.nome.trim(),
        tipo: conta.tipo || null,
        natureza: conta.natureza || null,
        analitica: conta.analitica !== false,
        ativa: conta.ativa !== false,
        conta_pai_id: pai?.id || null
      };
      const res = conta.id
        ? await supabase.from('contas_contabeis').update(payload).eq('id', conta.id)
        : await supabase.from('contas_contabeis').insert([payload]);
      if (res.error) throw res.error;
      await sincronizarPlanoDaEmpresa(empresaId);
      toast({ title: 'Sucesso', description: 'Conta salva.' });
      fetchData();
      return true;
    } catch (error) {
      toast({ title: 'Erro', description: mensagemDeErro(error, 'Falha ao salvar a conta.'), variant: 'destructive' });
      return false;
    }
  };

  const importarPlanoExcel = async (plano) => {
    if (empresaId === 'all') throw new Error('Selecione a empresa antes de importar.');
    const resumo = await importarPlano(empresaId, plano);
    fetchData();
    return resumo;
  };

  return (
    <ParametrosContabeisContext.Provider value={{
      empresaId, setEmpresaId, empresas, data, loading, fetchData, saveItem, deleteItem, saveConta, importarPlanoExcel
    }}>
      {children}
    </ParametrosContabeisContext.Provider>
  );
};