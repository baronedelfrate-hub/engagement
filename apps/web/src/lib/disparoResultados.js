// Disparo de resultados (superadmin): gera relatórios em PDF de QUALQUER empresa e devolve { nome, base64 } para enviar pelo WhatsApp do superadmin.
// Cada gerador recebe o id da empresa cujos dados entram no relatório (o superadmin enxerga todas pelo RLS).
import { supabase } from '@/lib/customSupabaseClient';
import { buscarTudo } from '@/services/extratoAsaasService';
import { montarDRE, calcularPEPeriodo, agregarDashboard, MESES } from '@/lib/dreGerencial';
import { gerarRelatorioMensalPdf } from '@/lib/relatorioMensalPdf';
import { carregarRepasses, montarPrestacao } from '@/lib/prestacaoContas';
import { gerarPrestacaoPdf } from '@/lib/prestacaoPdf';
import { carregarExtratoConciliado, filtrarPorSituacao, resumir } from '@/lib/extratoConciliado';
import { exportarExtratoPdf } from '@/lib/extratoConciliadoExport';
import { gerarPedidoCompraPdf } from '@/lib/pedidoCompraPdf';
import { exportToPDF } from '@/pages/financeiro/relatorios/components/RelatoriosFinanceirosExportUtils';

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
export const nomeDaEmpresa = (e) => e?.nome_fantasia || e?.razao_social || 'Empresa';
export const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const diasNoMes = (ano, m) => new Date(ano, m + 1, 0).getDate();
const carregarEmpresa = async (id) => ok(await supabase.from('empresas').select('id, razao_social, nome_fantasia, cnpj, email, telefone').eq('id', id).single());

export const listarEmpresas = async () => ok(await supabase.from('empresas').select('id, razao_social, nome_fantasia, tipo_pessoa, ativo').order('razao_social'));

// ---------- relatório mensal (DRE gerencial, ponto de equilíbrio, indicadores) ----------
export const gerarMensal = async (empresaId, { ano, mes }) => {
  const [empresa, cat, sub] = await Promise.all([
    carregarEmpresa(empresaId),
    supabase.from('categorias').select('id, codigo, nome, grupo_dre').eq('company_id', empresaId).then(ok),
    supabase.from('subcategorias').select('id, codigo, nome, categoria_id').eq('company_id', empresaId).then(ok)
  ]);
  const movs = await buscarTudo(() => supabase.from('extrato_bancario')
    .select('id, data_transacao, valor, categoria_id, subcategoria_id, cliente_nome, banco_id, projeto_id, centro_custo_id')
    .eq('company_id', empresaId).gte('data_transacao', `${ano}-01-01`).lte('data_transacao', `${ano}-12-31`).order('data_transacao', { ascending: true }).order('id', { ascending: true }));
  if (!movs.length) throw new Error(`Sem lançamentos classificados em ${ano}.`);
  const dre = montarDRE(movs, { ano, categorias: cat, subcategorias: sub });
  const pe = {
    incluirSocios: false,
    meses: Array.from({ length: 12 }, (_, i) => calcularPEPeriodo(dre, i, i, { incluirSocios: false })),
    total: calcularPEPeriodo(dre, 0, 11, { incluirSocios: false }),
    acumulado: calcularPEPeriodo(dre, 0, mes, { incluirSocios: false })
  };
  const mm = String(mes + 1).padStart(2, '0');
  const dash = agregarDashboard(movs, { categorias: cat, subcategorias: sub, de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${diasNoMes(ano, mes)}` });
  const catIds = new Set(cat.filter((c) => c.grupo_dre).map((c) => c.id));
  const sem = movs.filter((m) => !m.categoria_id || !catIds.has(m.categoria_id));
  const naoClassificado = { qtd: sem.length, valor: sem.reduce((s, m) => s + Number(m.valor), 0) };
  const r = await gerarRelatorioMensalPdf({ empresa, ano, mes, dre, pe, dash, naoClassificado }, { base64: true });
  return { ...r, rotulo: `Relatório mensal ${MESES[mes]}/${ano}` };
};

// ---------- contas a pagar / a receber ----------
export const COLUNAS_FINANCEIRO = {
  CONTAS_PAGAR: [
    { id: 'numero', label: 'Nº Título', type: 'string' }, { id: 'natureza', label: 'Natureza', type: 'string' }, { id: 'fornecedor_nome', label: 'Fornecedor', type: 'string' },
    { id: 'data_emissao', label: 'Emissão', type: 'date' }, { id: 'data_vencimento', label: 'Vencimento', type: 'date' }, { id: 'categoria_nome', label: 'Categoria', type: 'string' },
    { id: 'centro_custo_nome', label: 'C. Custo', type: 'string' }, { id: 'projeto_nome', label: 'Projeto', type: 'string' }, { id: 'valor_original', label: 'Valor', type: 'currency' }, { id: 'status', label: 'Status', type: 'status' }
  ],
  CONTAS_RECEBER: [
    { id: 'numero', label: 'Nº Título', type: 'string' }, { id: 'natureza', label: 'Natureza', type: 'string' }, { id: 'cliente_nome', label: 'Cliente', type: 'string' },
    { id: 'data_emissao', label: 'Emissão', type: 'date' }, { id: 'data_vencimento', label: 'Vencimento', type: 'date' }, { id: 'categoria_nome', label: 'Categoria', type: 'string' },
    { id: 'centro_custo_nome', label: 'C. Custo', type: 'string' }, { id: 'projeto_nome', label: 'Projeto', type: 'string' }, { id: 'valor_original', label: 'Valor', type: 'currency' }, { id: 'status', label: 'Status', type: 'status' }
  ]
};
export const gerarFinanceiro = async (empresaId, source, { de, ate, soEmAberto = true }) => {
  const pagar = source === 'CONTAS_PAGAR';
  const sel = `*, categoria:categorias(nome), centro_custo:centros_custo(nome), subcategoria:subcategorias(nome), projeto:projetos(nome, codigo), banco:bancos(nome), ${pagar ? 'fornecedor:fornecedores(nome, chave_pix, tipo_chave_pix)' : 'cliente:clientes(nome)'}`;
  let q = supabase.from('movimentacao_financeira').select(sel).eq('company_id', empresaId).eq('tipo', pagar ? 'pagar' : 'receber').not('status', 'in', '(cancelado,substituido)');
  if (de) q = q.gte('data_vencimento', de);
  if (ate) q = q.lte('data_vencimento', ate);
  if (soEmAberto) q = q.neq('status', 'pago');
  const dados = ok(await q.order('data_vencimento', { ascending: true }).limit(5000));
  if (!dados.length) throw new Error('Nenhum lançamento neste período.');
  const rotulo = (s) => (s === 'pago' ? (pagar ? 'Pago' : 'Recebido') : s === 'pago_parcial' ? 'Parcial' : s === 'vencido' ? 'Vencido' : 'Pendente');
  const flat = dados.map((i) => ({
    ...i, numero: i.provisao ? String(i.numero_titulo || '').replace(/^PROV · /, '') : i.numero_titulo, natureza: i.provisao ? 'Provisão' : 'Título', valor_original: i.valor_total, status: rotulo(i.status),
    fornecedor_nome: i.fornecedor?.nome, fornecedor_pix: i.fornecedor?.chave_pix || undefined, fornecedor_tipo_pix: i.fornecedor?.tipo_chave_pix || undefined, cliente_nome: i.cliente?.nome, categoria_nome: i.categoria?.nome, centro_custo_nome: i.centro_custo?.nome,
    projeto_nome: i.projeto ? `${i.projeto.codigo ? `${i.projeto.codigo} - ` : ''}${i.projeto.nome}` : 'Não se aplica'
  }));
  const titulo = `Relatório Financeiro - ${pagar ? 'Contas a Pagar' : 'Contas a Receber'}`;
  const desc = `Vencimento: ${de ? dataBR(de) : 'início'} a ${ate ? dataBR(ate) : 'fim'}${soEmAberto ? ' | Só em aberto' : ''}`;
  const r = await exportToPDF(flat, COLUNAS_FINANCEIRO[source], titulo, desc, source, { base64: true });
  return { ...r, rotulo: pagar ? 'Contas a pagar' : 'Contas a receber', linhas: flat, periodo: `${de ? dataBR(de) : 'início'} a ${ate ? dataBR(ate) : 'fim'}` };
};

// ---------- prestação de contas da obra ----------
export const listarObras = async (empresaId) => ok(await supabase.from('projetos').select('id, nome, codigo').eq('company_id', empresaId).order('nome'));
export const gerarPrestacao = async (empresaId, { obraId = 'TODOS', de, ate }) => {
  const empresa = await carregarEmpresa(empresaId);
  const dados = await carregarRepasses(empresaId, { projetoId: obraId, de: de || null, ate: ate || null });
  if (dados.semCategoria) throw new Error('Esta empresa não tem a categoria de repasse de clientes.');
  const resumo = montarPrestacao(dados.lancamentos, dados.abertos);
  let obra = 'Todas as obras';
  if (obraId !== 'TODOS' && obraId !== 'SEM') { const o = ok(await supabase.from('projetos').select('nome, codigo').eq('id', obraId).single()); obra = `${o.codigo ? `${o.codigo} - ` : ''}${o.nome}`; }
  const r = await gerarPrestacaoPdf({ empresa: nomeDaEmpresa(empresa), obra, periodo: de || ate ? `${de ? dataBR(de) : 'início'} a ${ate ? dataBR(ate) : 'hoje'}` : 'todo o período', resumo }, { base64: true });
  return { ...r, rotulo: `Prestação de contas · ${obra}` };
};

// ---------- extrato conciliado ----------
export const listarBancos = async (empresaId) => ok(await supabase.from('bancos').select('id, nome, agencia, conta').eq('company_id', empresaId).order('nome'));
export const gerarExtrato = async (empresaId, { bancoId, de, ate }) => {
  const empresa = await carregarEmpresa(empresaId);
  const d = await carregarExtratoConciliado(empresaId, { bancoId, de: de || null, ate: ate || null });
  const linhas = filtrarPorSituacao(d.linhas, 'TODAS');
  if (!linhas.length) throw new Error('Sem lançamentos de extrato neste período.');
  const resumo = resumir(linhas, d.saldos);
  const b = d.banco ? `${d.banco.nome} ag ${d.banco.agencia || '-'} cc ${d.banco.conta || '-'}` : 'Todos os bancos';
  const filtros = `${b} · ${de || ate ? `${de ? dataBR(de) : 'início'} a ${ate ? dataBR(ate) : 'hoje'}` : 'todo o período'}`;
  const r = exportarExtratoPdf({ empresa: nomeDaEmpresa(empresa), filtros, linhas, resumo, banco: d.banco }, { base64: true });
  return { ...r, rotulo: `Extrato conciliado · ${b}` };
};

// ---------- pedido de compra ----------
export const listarPedidos = async (empresaId) => ok(await supabase.from('pedidos_compra').select('id, numero, data_pedido, valor_total, status, fornecedor:fornecedores(nome)').eq('company_id', empresaId).order('created_at', { ascending: false }).limit(100));
export const gerarPedido = async (empresaId, pedidoId) => {
  const pedido = ok(await supabase.from('pedidos_compra').select('*').eq('id', pedidoId).single());
  const [fornecedor, itens, e] = await Promise.all([
    pedido.fornecedor_id ? supabase.from('fornecedores').select('*').eq('id', pedido.fornecedor_id).maybeSingle().then((r) => r.data || {}) : Promise.resolve({}),
    supabase.from('pedidos_compra_itens').select('quantidade, preco_unitario, desconto, valor_total, produto:produtos(nome, sku, unidade_medida)').eq('pedido_id', pedidoId).then(ok),
    carregarEmpresa(empresaId)
  ]);
  const r = await gerarPedidoCompraPdf({ pedido, fornecedor, itens: itens || [], empresa: { nome: nomeDaEmpresa(e), email: e?.email, telefone: e?.telefone } }, { base64: true });
  return { ...r, rotulo: `Pedido de compra ${pedido.numero || ''}`.trim() };
};

// ---------- proposta comercial ----------
const mesclar = (padrao, atual) => { const out = { ...padrao }; Object.keys(atual || {}).forEach((k) => { out[k] = { ...(padrao[k] || {}), ...(atual[k] || {}) }; }); return out; };
export const listarPropostasDaEmpresa = async (empresaId) => {
  const { listarPropostas } = await import('@/lib/crmService');
  return listarPropostas(empresaId);
};
export const gerarProposta = async (empresaId, propostaId) => {
  const { carregarProposta, carregarConfig, listarContas, totalProposta, conteudoPadrao, paginasPadrao } = await import('@/lib/crmService');
  const x = await carregarProposta(propostaId);
  // proposta com PDF próprio anexado: envia esse arquivo
  if (x.pdf_path) {
    const { data, error } = await supabase.storage.from('propostas').download(x.pdf_path);
    if (error) throw new Error(error.message);
    const base64 = await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1]); f.onerror = rej; f.readAsDataURL(data); });
    return { nome: x.pdf_nome || `Proposta_${x.numero || ''}.pdf`, base64, rotulo: `Proposta ${x.numero || ''}`.trim() };
  }
  const [inst, contas] = await Promise.all([carregarConfig(empresaId), listarContas(empresaId)]);
  const itens = x.itens.map((i) => ({ ...i, quantidade: Number(i.quantidade) || 0, preco_unitario: Number(i.preco_unitario) || 0, desconto: Number(i.desconto) || 0 }));
  const total = totalProposta(itens, x.desconto);
  const conta = contas.find((c) => c.id === x.conta_id) || x.conta || null;
  const { gerarPropostaPdf } = await import('@/lib/crmPropostaPdf');
  const r = await gerarPropostaPdf({ proposta: { ...x, valor_total: total, parcelas: x.parcelas || [], paginas: { ...paginasPadrao(), ...x.paginas }, conteudo: mesclar(conteudoPadrao(), x.conteudo), numero: x.numero || 'RASCUNHO' }, conta, itens, institucional: inst }, { base64: true });
  return { ...r, rotulo: `Proposta ${x.numero || ''}`.trim() };
};
