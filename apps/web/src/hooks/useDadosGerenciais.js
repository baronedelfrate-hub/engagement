import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { buscarTudo } from '@/services/extratoAsaasService';

// Dados das telas gerenciais (DRE, Ponto de Equilíbrio, Dashboard): extrato bancário classificado de uma empresa/ano.
export const useDadosGerenciais = () => {
  const { company_id, isSuperAdmin, loading: authLoading } = useAuthContext();
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [anos, setAnos] = useState([]);
  const [ano, setAno] = useState(null);
  const [bancoId, setBancoId] = useState('TODOS');
  const [bancos, setBancos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const empresaId = isSuperAdmin ? selectedEmpresa : company_id;

  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    supabase.from('empresas').select('id, razao_social').order('razao_social').then(({ data }) => setEmpresas(data || []));
  }, [authLoading, isSuperAdmin]);

  // cadastros e anos com movimento
  useEffect(() => {
    if (authLoading || !empresaId) return;
    let ativo = true;
    (async () => {
      try {
        const [cat, sub, ban, primeiro, ultimo] = await Promise.all([
          supabase.from('categorias').select('id, codigo, nome, grupo_dre').eq('company_id', empresaId),
          supabase.from('subcategorias').select('id, codigo, nome, categoria_id').eq('company_id', empresaId),
          supabase.from('bancos').select('id, nome').eq('company_id', empresaId).order('nome'),
          supabase.from('extrato_bancario').select('data_transacao').eq('company_id', empresaId).order('data_transacao', { ascending: true }).limit(1),
          supabase.from('extrato_bancario').select('data_transacao').eq('company_id', empresaId).order('data_transacao', { ascending: false }).limit(1)
        ]);
        for (const r of [cat, sub, ban, primeiro, ultimo]) if (r.error) throw r.error;
        if (!ativo) return;
        setCategorias(cat.data || []);
        setSubcategorias(sub.data || []);
        setBancos(ban.data || []);
        const a0 = primeiro.data?.[0]?.data_transacao ? Number(primeiro.data[0].data_transacao.slice(0, 4)) : null;
        const a1 = ultimo.data?.[0]?.data_transacao ? Number(ultimo.data[0].data_transacao.slice(0, 4)) : null;
        const lista = a0 && a1 ? Array.from({ length: a1 - a0 + 1 }, (_, i) => a1 - i) : [new Date().getFullYear()];
        setAnos(lista);
        setAno((atual) => (atual && lista.includes(atual) ? atual : lista[0]));
        setBancoId('TODOS');
      } catch (e) {
        if (ativo) setError(e.message || 'Falha ao carregar cadastros.');
      }
    })();
    return () => { ativo = false; };
  }, [authLoading, empresaId]);

  // lançamentos do ano
  useEffect(() => {
    if (authLoading || !empresaId || !ano) return;
    let ativo = true;
    setLoading(true);
    setError(null);
    buscarTudo(() => {
      let q = supabase
        .from('extrato_bancario')
        .select('id, data_transacao, valor, categoria_id, subcategoria_id, cliente_nome, banco_id')
        .eq('company_id', empresaId)
        .gte('data_transacao', `${ano}-01-01`)
        .lte('data_transacao', `${ano}-12-31`)
        .order('data_transacao', { ascending: true })
        .order('id', { ascending: true });
      if (bancoId !== 'TODOS') q = q.eq('banco_id', bancoId);
      return q;
    })
      .then((dados) => { if (ativo) setMovs(dados); })
      .catch((e) => { if (ativo) setError(e.message || 'Falha ao carregar o extrato.'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [authLoading, empresaId, ano, bancoId]);

  return {
    authLoading, isSuperAdmin, empresaId, empresas, selectedEmpresa, setSelectedEmpresa,
    anos, ano, setAno, bancoId, setBancoId, bancos, categorias, subcategorias, movs, loading, error
  };
};
