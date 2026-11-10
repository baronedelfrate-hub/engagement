// Recibos emitidos a partir das baixas de títulos. Cada recibo é numerado por empresa (tabela recibos) e pode ser reimpresso a qualquer momento.
import { supabase } from '@/lib/customSupabaseClient';
import { gerarReciboPdf } from '@/lib/reciboPdf';

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export const dadosDaEmpresa = async (companyId) => ok(await supabase.from('empresas').select('razao_social, nome_fantasia, cnpj, cidade, logo').eq('id', companyId).maybeSingle());

// Baixas do período com o título, a pessoa (fornecedor ou cliente) e o recibo já emitido, se houver.
export const listarBaixasComRecibo = async (companyId, { de, ate } = {}) => {
  let q = supabase.from('movimentacao_baixas')
    .select('id, data_baixa, valor_baixa, valor_juros, valor_desconto, observacoes, movimentacao:movimentacao_financeira(id, tipo, numero_titulo, observacoes, status, fornecedor:fornecedores(nome, cnpj, cidade, telefone), cliente:clientes(nome, cnpj:cnpj_cpf))')
    .eq('company_id', companyId).order('data_baixa', { ascending: false }).limit(1000);
  if (de) q = q.gte('data_baixa', de);
  if (ate) q = q.lte('data_baixa', ate);
  const baixas = ok(await q);
  const recibos = ok(await supabase.from('recibos').select('*').eq('company_id', companyId).order('numero', { ascending: false }).limit(2000));
  const porBaixa = new Map();
  recibos.forEach((r) => { if (r.baixa_id) { if (!porBaixa.has(r.baixa_id)) porBaixa.set(r.baixa_id, []); porBaixa.get(r.baixa_id).push(r); } });
  return { baixas: baixas.filter((b) => b.movimentacao).map((b) => ({ ...b, recibos: porBaixa.get(b.id) || [] })), recibos };
};

// Texto padrão do "referente a": a observação do título, sem as frases de operação interna.
export const referentePadrao = (mov) => String(mov?.observacoes || mov?.numero_titulo || 'serviços prestados')
  .replace(/\s*Emitir recibo na baixa\.?/i, '').replace(/\s*Pix para a chave.*$/i, '').replace(/[.\s]+$/, '').trim();

// Monta quem pagou e quem recebeu: no pagamento, a empresa paga e o fornecedor assina; no recebimento, o cliente paga e a empresa assina.
export const partesDoRecibo = (baixa, empresa) => {
  const mov = baixa.movimentacao;
  const pagar = String(mov.tipo || '').toLowerCase() !== 'receber';
  const emp = { nome: empresa?.razao_social || empresa?.nome_fantasia || '', documento: empresa?.cnpj || '' };
  const pessoa = pagar ? { nome: mov.fornecedor?.nome || '', documento: mov.fornecedor?.cnpj || '' } : { nome: mov.cliente?.nome || '', documento: mov.cliente?.cnpj || '' };
  return { tipo: pagar ? 'pagar' : 'receber', pagador: pagar ? emp : pessoa, recebedor: pagar ? pessoa : emp };
};

export const emitirRecibo = async ({ companyId, baixa, empresa, referente, forma = 'Pix / transferência bancária' }) => {
  const { tipo, pagador, recebedor } = partesDoRecibo(baixa, empresa);
  if (!recebedor.nome || !pagador.nome) throw new Error(`O título precisa ter ${tipo === 'pagar' ? 'fornecedor' : 'cliente'} cadastrado para emitir o recibo.`);
  const valor = Number((Number(baixa.valor_baixa) || 0).toFixed(2));
  const linha = {
    company_id: companyId, baixa_id: baixa.id, movimentacao_id: baixa.movimentacao.id, tipo,
    pagador_nome: pagador.nome, pagador_documento: pagador.documento || null, recebedor_nome: recebedor.nome, recebedor_documento: recebedor.documento || null,
    valor, data: baixa.data_baixa, referente: referente.trim(), forma, local: baixa.movimentacao.fornecedor?.cidade || empresa?.cidade || null
  };
  return ok(await supabase.from('recibos').insert(linha).select('*').single());
};

export const pdfDoRecibo = async (r, opcoes = { base64: true }) => gerarReciboPdf({
  logo: (await supabase.from('empresas').select('logo').eq('id', r.company_id).maybeSingle()).data?.logo || null,
  numero: r.numero, pagador: { nome: r.pagador_nome, documento: r.pagador_documento }, recebedor: { nome: r.recebedor_nome, documento: r.recebedor_documento },
  valor: r.valor, referente: r.referente, data: r.data, local: r.local, forma: r.forma
}, opcoes);

export const excluirRecibo = async (id) => { ok(await supabase.from('recibos').delete().eq('id', id)); };
