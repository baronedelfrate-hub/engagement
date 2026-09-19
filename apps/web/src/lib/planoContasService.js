import { supabase } from '@/lib/customSupabaseClient';
import { lerLinhasPlano, montarPlano, LINHAS_MODELO } from '@/lib/planoContas';

const TAMANHO_LOTE = 100;

const emLotes = (lista, tamanho = TAMANHO_LOTE) => {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
  return lotes;
};

const falhar = (etapa, error) => {
  const e = new Error(`${etapa}: ${error.message || error}`);
  e.cause = error;
  return e;
};

/**
 * Lê um arquivo Excel/CSV e devolve, por aba, os itens do plano encontrados.
 * A aba com mais contas reconhecidas é sugerida como a correta.
 */
export const lerArquivoPlano = async (arquivo) => {
  const XLSX = await import('xlsx');
  const buffer = await arquivo.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const abas = wb.SheetNames.map((nome) => {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, defval: null, blankrows: false });
    const { itens, ignoradas } = lerLinhasPlano(linhas);
    return { nome, itens, ignoradas, plano: montarPlano(itens) };
  });

  const sugerida = abas.reduce((melhor, aba) => (aba.itens.length > (melhor?.itens.length || 0) ? aba : melhor), null);
  return { abas, sugerida: sugerida?.nome || null };
};

/** Baixa uma planilha modelo no mesmo formato aceito na importação. */
export const baixarModeloPlano = async () => {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(LINHAS_MODELO);
  ws['!cols'] = [{ wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plano de Contas');
  XLSX.writeFile(wb, 'modelo_plano_de_contas.xlsx');
};

/**
 * Grava o plano para a empresa: contas contábeis, categorias e subcategorias, ligadas pelo código.
 * Pode ser executada de novo com segurança: o que já existe (pelo código) é mantido, só o que falta é criado.
 * Nomes, tipos e naturezas de contas já existentes NÃO são sobrescritos.
 */
export const importarPlano = async (empresaId, plano) => {
  if (!empresaId) throw new Error('Selecione a empresa antes de importar.');

  const resumo = {
    contas: { novas: 0, existentes: 0 },
    categorias: { novas: 0, existentes: 0 },
    subcategorias: { novas: 0, existentes: 0 }
  };

  // 1) Contas contábeis (hierarquia): processa nível a nível para conhecer o id do pai
  const { data: contasExistentes, error: erroContas } = await supabase
    .from('contas_contabeis')
    .select('id, codigo, analitica, conta_pai_id')
    .eq('empresa_id', empresaId);
  if (erroContas) throw falhar('Ao ler as contas existentes', erroContas);

  const contaPorCodigo = new Map((contasExistentes || []).map(c => [c.codigo, c]));
  const idContaPorCodigo = new Map((contasExistentes || []).map(c => [c.codigo, c.id]));

  const niveis = [...new Set(plano.contas.map(c => c.nivel))].sort((a, b) => a - b);
  for (const nivel of niveis) {
    const novas = [];
    for (const c of plano.contas.filter(x => x.nivel === nivel)) {
      const existente = contaPorCodigo.get(c.codigo);
      const paiId = c.codigo_pai ? (idContaPorCodigo.get(c.codigo_pai) || null) : null;
      if (existente) {
        resumo.contas.existentes += 1;
        const estruturaMudou = existente.analitica !== c.analitica || (existente.conta_pai_id || null) !== paiId;
        if (estruturaMudou) {
          const { error } = await supabase
            .from('contas_contabeis')
            .update({ analitica: c.analitica, conta_pai_id: paiId })
            .eq('id', existente.id);
          if (error) throw falhar(`Ao atualizar a conta ${c.codigo}`, error);
        }
      } else {
        novas.push({
          empresa_id: empresaId,
          codigo: c.codigo,
          nome: c.nome,
          tipo: c.tipo,
          natureza: c.natureza,
          ativa: true,
          analitica: c.analitica,
          conta_pai_id: paiId,
          grupo_dre: c.grupo_dre
        });
      }
    }
    for (const lote of emLotes(novas)) {
      const { data, error } = await supabase.from('contas_contabeis').insert(lote).select('id, codigo');
      if (error) throw falhar('Ao criar contas contábeis', error);
      (data || []).forEach(c => idContaPorCodigo.set(c.codigo, c.id));
      resumo.contas.novas += lote.length;
    }
  }

  // 2) Categorias (agrupamento usado no Financeiro e na DRE)
  const { data: catExistentes, error: erroCat } = await supabase
    .from('categorias')
    .select('id, codigo, grupo_dre')
    .eq('company_id', empresaId)
    .not('codigo', 'is', null);
  if (erroCat) throw falhar('Ao ler as categorias existentes', erroCat);

  const idCategoriaPorCodigo = new Map((catExistentes || []).map(c => [c.codigo, c.id]));
  const catNovas = [];
  for (const c of plano.categorias) {
    if (idCategoriaPorCodigo.has(c.codigo)) {
      resumo.categorias.existentes += 1;
    } else {
      catNovas.push({
        company_id: empresaId,
        codigo: c.codigo,
        nome: c.nome,
        ativo: true,
        grupo_dre: c.grupo_dre,
        ordem: c.ordem
      });
    }
  }
  for (const lote of emLotes(catNovas)) {
    const { data, error } = await supabase.from('categorias').insert(lote).select('id, codigo');
    if (error) throw falhar('Ao criar categorias', error);
    (data || []).forEach(c => idCategoriaPorCodigo.set(c.codigo, c.id));
    resumo.categorias.novas += lote.length;
  }

  // 3) Subcategorias (contas dentro de cada categoria)
  const { data: subExistentes, error: erroSub } = await supabase
    .from('subcategorias')
    .select('codigo')
    .eq('company_id', empresaId)
    .not('codigo', 'is', null);
  if (erroSub) throw falhar('Ao ler as subcategorias existentes', erroSub);

  const codigosSub = new Set((subExistentes || []).map(s => s.codigo));
  const subNovas = [];
  for (const s of plano.subcategorias) {
    if (codigosSub.has(s.codigo)) {
      resumo.subcategorias.existentes += 1;
    } else {
      const categoriaId = idCategoriaPorCodigo.get(s.codigo_categoria);
      if (!categoriaId) continue;
      subNovas.push({ company_id: empresaId, categoria_id: categoriaId, codigo: s.codigo, nome: s.nome, ativo: true });
    }
  }
  for (const lote of emLotes(subNovas)) {
    const { error } = await supabase.from('subcategorias').insert(lote);
    if (error) throw falhar('Ao criar subcategorias', error);
    resumo.subcategorias.novas += lote.length;
  }

  return resumo;
};

/**
 * Reflete no Financeiro (categorias/subcategorias) as contas que já existem no plano da empresa.
 * Usado após cadastrar uma conta manualmente, para o plano não divergir entre os módulos.
 */
export const sincronizarPlanoDaEmpresa = async (empresaId) => {
  const { data, error } = await supabase
    .from('contas_contabeis')
    .select('codigo, nome')
    .eq('empresa_id', empresaId);
  if (error) throw falhar('Ao ler o plano de contas', error);
  const itens = (data || []).map(c => ({ codigo: c.codigo, nome: c.nome }));
  return importarPlano(empresaId, montarPlano(itens));
};
