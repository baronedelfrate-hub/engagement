// Monta o corpo da NFS-e Nacional (POST /v2/nfsen da Focus NFe) a partir de uma nota de nfse_servicos.
import { supabase } from '@/lib/customSupabaseClient';

const soNum = (v) => String(v ?? '').replace(/\D/g, '');
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// "17.01" (item da LC 116) -> "170101" (código de tributação nacional: item + subitem + desdobro). Já com 6 dígitos, usa como está.
export const codigoTributacaoNacional = (cod) => {
  const d = soNum(cod);
  if (d.length === 6) return d;
  if (d.length === 4) return `${d}01`;
  if (d.length === 3) return `0${d}01`;
  return null;
};

const ibgeDaCidade = async (cidade, uf) => {
  if (!cidade) return null;
  const { data } = await supabase.from('fiscal_municipios_ibge').select('codigo_ibge, nome_municipio, uf').eq('uf', uf || '').limit(900);
  const alvo = norm(cidade);
  return (data || []).find((m) => norm(m.nome_municipio) === alvo)?.codigo_ibge || null;
};

export const refDaNota = (nota) => `nfse${String(nota.id).replace(/-/g, '')}`;

// cfg: config da Focus (codigo_opcao_simples, regime_especial). Lança Error com a lista do que falta.
export const montarPayloadNfsen = async (nota, cfg) => {
  const [{ data: emp }, { data: cli }] = await Promise.all([
    supabase.from('empresas').select('razao_social, cnpj, cidade, estado').eq('id', nota.empresa_id).maybeSingle(),
    supabase.from('clientes').select('nome, cnpj_cpf, email, telefone, endereco, numero, complemento, bairro, cidade, estado, cep').eq('id', nota.cliente_id).maybeSingle(),
  ]);
  const faltas = [];
  const cnpjPrest = soNum(emp?.cnpj);
  if (cnpjPrest.length !== 14) faltas.push('CNPJ da empresa prestadora');
  const doc = soNum(cli?.cnpj_cpf);
  if (![11, 14].includes(doc.length)) faltas.push('CPF/CNPJ do cliente');
  const trib = codigoTributacaoNacional(nota.codigo_servico);
  if (!trib) faltas.push('código do serviço (LC 116) da nota');
  const ibgePrest = nota.municipio_incidencia_iss_codigo_ibge ? String(nota.municipio_incidencia_iss_codigo_ibge) : null;
  if (!ibgePrest) faltas.push('município de incidência do ISS');
  const numero = soNum(nota.numero);
  if (!numero) faltas.push('número da nota');
  if (!(Number(nota.valor_servico) > 0)) faltas.push('valor do serviço');
  if (!nota.descricao_servico) faltas.push('descrição do serviço');
  if (faltas.length) throw new Error(`Faltam dados para emitir: ${faltas.join(', ')}.`);

  const ibgeEmissora = (await ibgeDaCidade(emp?.cidade, emp?.estado)) || ibgePrest;
  const ibgeTomador = await ibgeDaCidade(cli?.cidade, cli?.estado);
  const agora = new Date(); const dia = (nota.data_emissao || agora.toISOString()).slice(0, 10);
  const p = {
    // horário de Brasília (-03:00), 2 min no passado: a DPS não pode ter data posterior ao processamento
    data_emissao: new Date(agora.getTime() - 3 * 3600 * 1000 - 120 * 1000).toISOString().slice(0, 19) + '-03:00',
    serie_dps: soNum(nota.serie) || '1',
    numero_dps: numero,
    data_competencia: dia,
    emitente_dps: 1,
    codigo_municipio_emissora: ibgeEmissora,
    cnpj_prestador: cnpjPrest,
    codigo_opcao_simples_nacional: cfg?.codigo_opcao_simples || 1,
    regime_especial_tributacao: cfg?.regime_especial ?? 0,
    codigo_municipio_prestacao: ibgePrest,
    codigo_tributacao_nacional_iss: trib,
    descricao_servico: String(nota.descricao_servico).slice(0, 1000),
    valor_servico: Number(Number(nota.valor_servico).toFixed(2)),
    tributacao_iss: Number(nota.tributacao_iss) || 1,
    tipo_retencao_iss: nota.iss_retido ? 2 : 1,
  };
  // Substituição: esta nota substitui outra (a antiga é cancelada pela Receita junto com a autorização da nova)
  if (soNum(nota.chave_nfse_substituida).length === 50) {
    p.chave_nfse_substituida = soNum(nota.chave_nfse_substituida);
    p.codigo_justificativa_substituicao = '99';
    p.motivo_substituicao = String(nota.motivo_substituicao || 'Correção da retenção de tributos na fonte').slice(0, 255);
  }
  if (nota.codigo_tributacao_municipal) p.codigo_tributacao_municipal_iss = String(nota.codigo_tributacao_municipal);
  if (soNum(nota.codigo_nbs).length === 9) p.codigo_nbs = soNum(nota.codigo_nbs);
  // Reforma Tributária (IBS/CBS): os percentuais são calculados pela Receita; só informamos a classificação
  if (nota.ibs_cbs_cst || nota.ibs_cbs_class_trib || nota.codigo_indicador_operacao) {
    // campos obrigatórios do grupo IBS/CBS: NFS-e regular, não é consumo pessoal, destinatário = o próprio tomador
    p.finalidade_emissao = 0; p.consumidor_final = 0; p.indicador_destinatario = 0;
  }
  if (nota.ibs_cbs_cst) p.ibs_cbs_situacao_tributaria = String(nota.ibs_cbs_cst);
  if (nota.ibs_cbs_class_trib) p.ibs_cbs_classificacao_tributaria = String(nota.ibs_cbs_class_trib);
  if (nota.codigo_indicador_operacao) p.codigo_indicador_operacao = soNum(nota.codigo_indicador_operacao);
  // Não optante do Simples: a Receita não aceita o indicador nem o % do Simples; informa-se o total aproximado dos tributos (valores).
  if ((cfg?.codigo_opcao_simples || 1) === 1) {
    p.valor_total_tributos_federais = 0; p.valor_total_tributos_estaduais = 0; p.valor_total_tributos_municipais = 0;
  }
  // Retenções federais (padrão da Receita pós-reforma): IRRF em vRetIRRF; PIS+COFINS+CSLL retidos somados em vRetCSLL;
  // PIS e COFINS "apuração própria" (base = valor do serviço) ficam em valor_pis/valor_cofins e servem de base para CBS/IBS.
  const arred = (n) => Number(Number(n || 0).toFixed(2));
  const rPis = arred(nota.ret_pis), rCof = arred(nota.ret_cofins), rCsl = arred(nota.ret_csll), rIr = arred(nota.ret_irrf), rInss = arred(nota.ret_inss);
  if (rIr > 0) p.valor_irrf = rIr;
  if (rInss > 0) p.valor_cp = rInss;
  if (rPis + rCof + rCsl > 0) {
    p.valor_csll = arred(rPis + rCof + rCsl);
    const k = `${rPis > 0 ? 'P' : ''}${rCof > 0 ? 'C' : ''}${rCsl > 0 ? 'S' : ''}`;
    // 0 nenhum · 1 PIS/COFINS · 3 PIS/COFINS/CSLL · 4 PIS/COFINS (CSLL não) · 5 só PIS · 6 só COFINS · 7 COFINS/CSLL · 8 só CSLL · 9 PIS/CSLL
    p.tipo_retencao_pis_cofins = { PCS: 3, PC: 4, P: 5, C: 6, CS: 7, S: 8, PS: 9 }[k] ?? 0;
    const pPis = Number(nota.pct_pis) || 0.65, pCof = Number(nota.pct_cofins) || 3;
    p.situacao_tributaria_pis_cofins = '01';
    p.base_calculo_pis_cofins = p.valor_servico;
    p.aliquota_pis = pPis; p.aliquota_cofins = pCof;
    p.valor_pis = arred(p.valor_servico * pPis / 100); p.valor_cofins = arred(p.valor_servico * pCof / 100);
  }
  // Município aderente ao Sistema Nacional NFS-e (ex.: Indaiatuba): a alíquota vem parametrizada e a Receita recusa se enviarmos.
  if (nota.enviar_aliquota_iss && Number(nota.aliquota) > 0) p.percentual_aliquota_relativa_municipio = Number(nota.aliquota);
  if (doc.length === 14) p.cnpj_tomador = doc; else p.cpf_tomador = doc;
  if (cli?.nome) p.razao_social_tomador = cli.nome.slice(0, 150);
  if (ibgeTomador) p.codigo_municipio_tomador = ibgeTomador;
  if (soNum(cli?.cep).length === 8) p.cep_tomador = soNum(cli.cep);
  if (cli?.endereco) p.logradouro_tomador = cli.endereco;
  if (cli?.numero) p.numero_tomador = String(cli.numero);
  if (cli?.complemento) p.complemento_tomador = cli.complemento;
  if (cli?.bairro) p.bairro_tomador = cli.bairro;
  if (cli?.email) p.email_tomador = cli.email;
  if (cfg?.codigo_opcao_simples === 3 || cfg?.codigo_opcao_simples === 2) p.regime_tributario_simples_nacional = 1;
  return p;
};
