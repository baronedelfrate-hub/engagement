// Gera títulos (a pagar / a receber) e baixas a partir das linhas classificadas do extrato. Funções puras.
import { normalizar } from '@/lib/extratoClassificacao';

const ehTarifa = (tipoNorm) => tipoNorm.startsWith('TAXA') || tipoNorm.startsWith('ESTORNO POR CAMPANHA');

// Nome do favorecido que aparece na descrição do Asaas (Pix e pagamento de conta).
export const nomeFavorecido = (descricao, tipoNorm) => {
  const d = String(descricao || '');
  if (tipoNorm === 'TRANSACAO VIA PIX') {
    const m = /\spara\s+(.+)$/i.exec(d);
    return m ? m[1].replace(/^[0-9.\s/-]+/, '').trim() || null : null;
  }
  if (tipoNorm === 'PAGAMENTO DE CONTA' || tipoNorm === 'CANCELAMENTO DO PAGAMENTO DE CONTA') {
    const m = /^.*?conta\s*-\s*(.+)$/i.exec(d);
    return m ? m[1].replace(/\s+REF\b.*$/i, '').trim() || null : null;
  }
  return null;
};

const tokens = (s) => normalizar(s).replace(/[.,\-/()&*:;#]/g, ' ').split(/\s+/).filter((t) => t.length > 1 || /\d/.test(t));
const chave = (s) => tokens(s).join(' ');

// Casa um nome com o cadastro: igualdade, ou todas as palavras de um dentro do outro (mínimo 2 palavras).
export const casarCadastro = (nome, cadastro) => {
  if (!nome) return null;
  const k = chave(nome);
  const exato = cadastro.find((c) => chave(c.nome) === k);
  if (exato) return exato;
  const tn = new Set(tokens(nome));
  if (tn.size === 1) {
    // nome de uma palavra só (ex.: "VIVO"): só casa se essa palavra for de um único fornecedor
    const [unico] = tn;
    const donos = unico.length >= 3 ? cadastro.filter((c) => tokens(c.nome).includes(unico)) : [];
    return donos.length === 1 ? donos[0] : null;
  }
  const candidatos = cadastro.filter((c) => {
    const tc = new Set(tokens(c.nome));
    if (tc.size < 2) return false;
    const [menor, maior] = tn.size <= tc.size ? [tn, tc] : [tc, tn];
    return [...menor].every((t) => maior.has(t));
  });
  return candidatos.length === 1 ? candidatos[0] : null;
};

// linhas: extrato classificado ainda sem baixa. Retorna os títulos planejados e o que ficou de fora.
export const planejarTitulos = (linhas, { clientes, fornecedores, categoriasPorId, incluirTarifas, incluirSocios }) => {
  const clientesPorNome = new Map(clientes.map((c) => [chave(c.nome), c]));
  const titulos = [];
  const fora = { tarifas: 0, socios: 0, semCategoria: 0 };
  const semCadastro = new Map();

  for (const l of linhas) {
    if (!l.categoria_id) { fora.semCategoria++; continue; }
    const grupo = categoriasPorId.get(l.categoria_id)?.grupo_dre;
    if (!incluirTarifas && ehTarifa(l.tipo_norm || '')) { fora.tarifas++; continue; }
    if (!incluirSocios && grupo === 'socios') { fora.socios++; continue; }

    const valor = Number(l.valor);
    const tipo = valor < 0 ? 'pagar' : 'receber';
    let cliente = null;
    let fornecedor = null;
    if (tipo === 'receber' && l.cliente_nome) cliente = clientesPorNome.get(chave(l.cliente_nome)) || null;
    if (tipo === 'pagar') {
      const nome = nomeFavorecido(l.descricao, l.tipo_norm || '');
      fornecedor = casarCadastro(nome, fornecedores);
      if (nome && !fornecedor) semCadastro.set(nome, (semCadastro.get(nome) || 0) + 1);
    }
    titulos.push({ linha: l, tipo, valor: Math.abs(valor), cliente, fornecedor });
  }
  return { titulos, fora, semCadastro: [...semCadastro.entries()].sort((a, b) => b[1] - a[1]) };
};
