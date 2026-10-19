// Cobrança sobre a Movimentação Financeira: títulos a receber em aberto, régua por fase de vencimento e histórico de ações.
import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';
import { PHASES } from '@/lib/cobrancaService';

const hojeLocal = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dois = (n) => String(n).padStart(2, '0');
export const chaveLocal = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const dataLocal = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

// dias até o vencimento (negativo = atrasado), no fuso local e sem deslocar o dia
export const diasAteVencimento = (key) => Math.round((dataLocal(key) - hojeLocal()) / 86400000);

// mesma régua de sempre: D-3, D+1, D+5, D+10, D+15, D+30
export const faseDaRegua = (dias) => {
  if (dias >= 3) return 'd-3';
  if (dias >= -4) return 'd+1';
  if (dias >= -9) return 'd+5';
  if (dias >= -14) return 'd+10';
  if (dias >= -29) return 'd+15';
  return 'd+30';
};

const abatido = (b) => (Number(b.valor_baixa) || 0) - (Number(b.valor_juros) || 0) + (Number(b.valor_desconto) || 0);
const saldoDoTitulo = (t) => Math.max(0, (Number(t.valor_total) || 0) - (t.baixas || []).reduce((s, b) => s + abatido(b), 0));
const ultimaBaixa = (t) => (t.baixas || []).map((b) => b.data_baixa).filter(Boolean).sort().pop() || null;

const lotes = (lista, n = 150) => { const o = []; for (let i = 0; i < lista.length; i += n) o.push(lista.slice(i, i + n)); return o; };

const SELECT_TITULO = `
  id, company_id, numero_titulo, valor_total, data_vencimento, data_emissao, status, observacoes, cliente_id,
  cliente:clientes(id, nome, email, telefone),
  categoria:categorias(nome), subcategoria:subcategorias(nome), centro_custo:centros_custo(nome), banco:bancos(nome),
  baixas:movimentacao_baixas(valor_baixa, valor_juros, valor_desconto, data_baixa)
`;

// Resume as ações de um título: último contato, promessa de pagamento, suspensão
const resumirAcoes = (acoes) => {
  const ordenadas = [...acoes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)); // mais recente primeiro
  const ultimoContato = ordenadas.find((a) => ['contato', 'negociacao'].includes(a.tipo)) || null;
  const promessa = ordenadas.find((a) => a.tipo === 'promessa') || null;
  const ultimaSusp = ordenadas.find((a) => ['suspensao', 'retomada'].includes(a.tipo)) || null;
  const hoje = chaveLocal(hojeLocal());
  return {
    acoes: ordenadas,
    ultimoContatoEm: ultimoContato ? ultimoContato.created_at : null,
    promessa: promessa ? { data: promessa.data_promessa, valor: promessa.valor_prometido, vencida: promessa.data_promessa < hoje } : null,
    suspensa: ultimaSusp?.tipo === 'suspensao'
  };
};

// Carrega os cartões da cobrança: títulos a receber em aberto (fase pela régua) e os recuperados nos últimos 60 dias.
export const carregarCobranca = async (companyId) => {
  const hoje = hojeLocal();
  const limiteRecuperados = (() => { const d = new Date(hoje); d.setDate(d.getDate() - 60); return chaveLocal(d); })();
  const limiteVenc = (() => { const d = new Date(hoje); d.setDate(d.getDate() - 180); return chaveLocal(d); })();

  const [abertos, pagos] = await Promise.all([
    buscarTudo(() => supabase.from('movimentacao_financeira').select(SELECT_TITULO)
      .eq('company_id', companyId).eq('tipo', 'receber').eq('provisao', false)
      .in('status', ['pendente', 'pago_parcial', 'vencido']).order('data_vencimento').order('id')),
    buscarTudo(() => supabase.from('movimentacao_financeira').select(SELECT_TITULO)
      .eq('company_id', companyId).eq('tipo', 'receber').eq('provisao', false)
      .eq('status', 'pago').gte('data_vencimento', limiteVenc).order('data_vencimento').order('id'))
  ]);

  // recuperado = título pago com atraso (a última baixa depois do vencimento), nos últimos 60 dias
  const recuperados = pagos.filter((t) => { const u = ultimaBaixa(t); return u && u > t.data_vencimento && u >= limiteRecuperados; });
  const titulos = [...abertos.filter((t) => saldoDoTitulo(t) > 0.005), ...recuperados];

  const acoesPorTitulo = new Map();
  for (const lote of lotes(titulos.map((t) => t.id))) {
    const { data, error } = await supabase.from('cobranca_acoes').select('*').in('movimentacao_id', lote);
    if (error) throw error;
    (data || []).forEach((a) => { if (!acoesPorTitulo.has(a.movimentacao_id)) acoesPorTitulo.set(a.movimentacao_id, []); acoesPorTitulo.get(a.movimentacao_id).push(a); });
  }

  return titulos.map((t) => {
    const recuperado = t.status === 'pago';
    const dias = diasAteVencimento(t.data_vencimento);
    const resumo = resumirAcoes(acoesPorTitulo.get(t.id) || []);
    const pagoEm = ultimaBaixa(t);
    return {
      ...t,
      ...resumo,
      recuperado,
      saldo: recuperado ? 0 : saldoDoTitulo(t),
      valor_recebido: recuperado ? (t.baixas || []).reduce((s, b) => s + (Number(b.valor_baixa) || 0), 0) : 0,
      pago_em: pagoEm,
      dias_ate_vencimento: dias,
      dias_atraso: dias < 0 ? -dias : 0,
      fase: recuperado ? 'recuperado' : faseDaRegua(dias),
      dias_para_receber: recuperado && pagoEm ? Math.round((dataLocal(pagoEm) - dataLocal(t.data_vencimento)) / 86400000) : null
    };
  });
};

export const registrarAcao = async ({ companyId, movimentacaoId, tipo, canal = null, descricao = null, dataPromessa = null, valorPrometido = null }) => {
  const { error } = await supabase.from('cobranca_acoes').insert({
    company_id: companyId,
    movimentacao_id: movimentacaoId,
    tipo,
    canal,
    descricao: descricao || null,
    data_promessa: dataPromessa || null,
    valor_prometido: valorPrometido === '' || valorPrometido == null ? null : Number(valorPrometido)
  });
  if (error) throw error;
};

// ---- filtros (todos aplicados aqui, no cliente) ----
export const aplicarFiltros = (itens, f = {}) => {
  const busca = (f.search || '').trim().toLowerCase();
  return itens.filter((i) => {
    if (busca && !`${i.cliente?.nome || ''} ${i.numero_titulo || ''}`.toLowerCase().includes(busca)) return false;
    if (f.clienteId && f.clienteId !== 'ALL' && i.cliente_id !== f.clienteId) return false;
    if (f.fase && f.fase !== 'ALL' && i.fase !== String(f.fase).toLowerCase()) return false;
    if (f.statusPrazo === 'vencidos' && !(i.dias_atraso > 0 && !i.recuperado)) return false;
    if (f.statusPrazo === 'hoje' && !(i.dias_ate_vencimento === 0 && !i.recuperado)) return false;
    if (f.statusPrazo === 'proximos_3' && !(i.dias_ate_vencimento >= 0 && i.dias_ate_vencimento <= 3 && !i.recuperado)) return false;
    if (f.statusPrazo === 'proximos_7' && !(i.dias_ate_vencimento >= 0 && i.dias_ate_vencimento <= 7 && !i.recuperado)) return false;
    const valor = i.recuperado ? i.valor_total : i.saldo;
    if (f.minValor !== '' && f.minValor != null && valor < Number(f.minValor)) return false;
    if (f.maxValor !== '' && f.maxValor != null && valor > Number(f.maxValor)) return false;
    if (f.dataVencimentoInicio && i.data_vencimento < f.dataVencimentoInicio) return false;
    if (f.dataVencimentoFim && i.data_vencimento > f.dataVencimentoFim) return false;
    return true;
  });
};

// ---- mensagens prontas por fase ----
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (key) => (key ? key.split('-').reverse().join('/') : '');

export const mensagemSugerida = (item, empresaNome = '') => {
  const nome = item.cliente?.nome || 'cliente';
  const dados = `título ${item.numero_titulo}, no valor de ${brl(item.saldo || item.valor_total)}, com vencimento em ${dataBR(item.data_vencimento)}`;
  const assinatura = `\n\nAtenciosamente,\n${empresaNome || 'Financeiro'}`;
  const dias = item.dias_atraso;
  switch (item.fase) {
    case 'd-3':
      return `Olá, ${nome}! Passando para lembrar que o ${dados}. Qualquer dúvida ou necessidade de segunda via, é só nos avisar.${assinatura}`;
    case 'd+1':
      return `Olá, ${nome}. O ${dados} está no prazo de vencimento. Caso o pagamento já tenha sido feito, por favor desconsidere esta mensagem. Se precisar da segunda via, fico à disposição.${assinatura}`;
    case 'd+5':
      return `Olá, ${nome}. Não identificamos o pagamento do ${dados} (${dias} dias de atraso). Pedimos a gentileza de regularizar ou nos informar a previsão de pagamento.${assinatura}`;
    case 'd+10':
      return `Olá, ${nome}. O ${dados} segue em aberto há ${dias} dias. Precisamos regularizar esta pendência; podemos conversar sobre a melhor forma de pagamento? Aguardamos seu retorno.${assinatura}`;
    case 'd+15':
      return `Olá, ${nome}. Entramos em contato novamente sobre o ${dados}, em atraso há ${dias} dias. Solicitamos o pagamento ou um posicionamento ainda esta semana, para evitarmos encargos e outras medidas.${assinatura}`;
    case 'd+30':
      return `Olá, ${nome}. O ${dados} está em atraso há ${dias} dias. Esta é uma tentativa de acordo antes de tomarmos as providências cabíveis, como o encaminhamento para cobrança e negativação. Podemos negociar hoje?${assinatura}`;
    default:
      return `Olá, ${nome}. Obrigado pelo pagamento do ${dados}.${assinatura}`;
  }
};

export const linkWhatsApp = (telefone, texto) => {
  let n = String(telefone || '').replace(/\D/g, '');
  if (n.length === 10 || n.length === 11) n = `55${n}`; // sem DDI: assume Brasil
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

export const linkEmail = (email, assunto, texto) => `mailto:${email || ''}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(texto)}`;

export const tituloDaMensagem = (item) => (item.dias_atraso > 0 ? `Título ${item.numero_titulo} em aberto` : `Lembrete: título ${item.numero_titulo} vence em ${dataBR(item.data_vencimento)}`);

// ---- números do dashboard ----
export const resumoDashboard = (itens) => {
  const abertos = itens.filter((i) => !i.recuperado);
  const recuperados = itens.filter((i) => i.recuperado);
  const soma = (l, f) => l.reduce((s, i) => s + f(i), 0);
  const vencidos = abertos.filter((i) => i.dias_atraso > 0);
  const aVencer7 = abertos.filter((i) => i.dias_ate_vencimento >= 0 && i.dias_ate_vencimento <= 7);
  const totalAberto = soma(abertos, (i) => i.saldo);
  const totalVencido = soma(vencidos, (i) => i.saldo);

  const promessasAtivas = abertos.filter((i) => i.promessa && !i.promessa.vencida);
  const promessasVencidas = abertos.filter((i) => i.promessa && i.promessa.vencida);
  const valorPromessa = (i) => (i.promessa?.valor != null ? Number(i.promessa.valor) : i.saldo);

  const fases = ['d-3', 'd+1', 'd+5', 'd+10', 'd+15', 'd+30'].map((f) => {
    const l = abertos.filter((i) => i.fase === f);
    return { fase: f, rotulo: PHASES[f].label, qtd: l.length, valor: soma(l, (i) => i.saldo) };
  });

  const porCliente = new Map();
  for (const i of vencidos) {
    const k = i.cliente?.nome || 'Sem cliente';
    const c = porCliente.get(k) || { nome: k, titulos: 0, valor: 0, maiorAtraso: 0 };
    c.titulos += 1; c.valor += i.saldo; c.maiorAtraso = Math.max(c.maiorAtraso, i.dias_atraso);
    porCliente.set(k, c);
  }

  const diasMedios = recuperados.filter((i) => i.dias_para_receber != null);
  return {
    totalAberto, totalVencido, qtdAberto: abertos.length, qtdVencido: vencidos.length,
    inadimplencia: totalAberto > 0 ? (totalVencido / totalAberto) * 100 : 0,
    aVencer7: { qtd: aVencer7.length, valor: soma(aVencer7, (i) => i.saldo) },
    recuperado: { qtd: recuperados.length, valor: soma(recuperados, (i) => i.valor_recebido) },
    diasMediosParaReceber: diasMedios.length ? Math.round(soma(diasMedios, (i) => i.dias_para_receber) / diasMedios.length) : 0,
    promessasAtivas: { qtd: promessasAtivas.length, valor: soma(promessasAtivas, valorPromessa) },
    promessasVencidas: { qtd: promessasVencidas.length, valor: soma(promessasVencidas, valorPromessa) },
    fases,
    devedores: [...porCliente.values()].sort((a, b) => b.valor - a.valor).slice(0, 10)
  };
};
