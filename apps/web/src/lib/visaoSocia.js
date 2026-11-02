// Visão consolidada da sócia: o que as empresas pagaram a ela x o que entrou e saiu no PF dela, mês a mês.
// Recebe o resultado da função visao_consolidada_socia (totais por empresa/mês/tipo). Saídas vêm negativas do extrato.
const zeros = () => Array(12).fill(0);
const soma = (a) => a.reduce((s, v) => s + v, 0);
const arred = (v) => Math.round(v * 100) / 100;
const linha = (rotulo, valores, extra = {}) => { const v = valores.map(arred); return { rotulo, valores: v, total: arred(soma(v)), ...extra }; };
const somaMeses = (...listas) => zeros().map((_, i) => listas.reduce((s, l) => s + l[i], 0));
const menos = (a, b) => a.map((v, i) => v - b[i]);
const negar = (a) => a.map((v) => -v);

export const montarVisaoSocia = (dados) => {
  const doTipo = (lista, filtro, tipo) => {
    const v = zeros();
    lista.filter((m) => filtro(m) && m.tipo === tipo).forEach((m) => { v[m.mes - 1] += Number(m.total) || 0; });
    return v;
  };

  const empresas = (dados.empresas || []).map((e) => {
    const get = (tipo) => doTipo(dados.mov_empresas || [], (m) => m.empresa_id === e.id, tipo);
    const proLabore = negar(get('pro_labore'));
    const distribuicao = negar(get('distribuicao'));
    const retirada = negar(get('retirada'));
    const aporte = get('aporte');
    const pago = somaMeses(proLabore, distribuicao, retirada);
    return {
      id: e.id, nome: e.nome, participacao: e.participacao,
      linhas: [linha('Pró-labore', proLabore), linha('Distribuição de lucros', distribuicao), linha('Retiradas e adiantamentos', retirada)],
      pago: linha('Total pago à sócia', pago, { destaque: true }),
      aporte: linha('Aportes da sócia na empresa', aporte)
    };
  });

  const pf = dados.mov_pf || [];
  const g = (tipo) => doTipo(pf, () => true, tipo);
  const rendProLabore = g('pro_labore');
  const rendDistribuicao = g('distribuicao');
  const rendOutras = g('outras');
  const rendimentos = somaMeses(rendProLabore, rendDistribuicao, rendOutras);
  const gastos = g('gastos'); // negativos
  const saldo = somaMeses(rendimentos, gastos);
  const aporteEmpresas = negar(g('aporte_empresas'));
  const foraOutros = g('fora_outros');

  const pagoEmpresas = somaMeses(zeros(), ...empresas.map((e) => e.pago.valores));
  const recebidoPF = somaMeses(rendProLabore, rendDistribuicao);
  const aportadoEmpresas = somaMeses(zeros(), ...empresas.map((e) => e.aporte.valores));

  return {
    ano: dados.ano, pessoa: dados.pessoa, empresas,
    pf: {
      rendimentos: [linha('Pró-labore', rendProLabore), linha('Distribuição de lucros', rendDistribuicao), linha('Outras rendas e reembolsos', rendOutras)],
      totalRendimentos: linha('Total de entradas', rendimentos, { destaque: true }),
      gastos: linha('Gastos pessoais', gastos),
      saldo: linha('Saldo do mês no PF', saldo, { destaque: true }),
      aporteEmpresas: linha('Aportes e empréstimos às empresas', aporteEmpresas),
      foraOutros: linha('Outras movimentações fora do saldo', foraOutros)
    },
    conferencia: [
      linha('Pago à sócia pelas empresas (pró-labore + distribuição + retiradas)', pagoEmpresas),
      linha('Recebido no PF (pró-labore + distribuição de lucros)', recebidoPF),
      linha('Diferença (pago − recebido)', menos(pagoEmpresas, recebidoPF), { destaque: true }),
      linha('Aportado pelo PF nas empresas', aporteEmpresas),
      linha('Aportes registrados pelas empresas', aportadoEmpresas),
      linha('Diferença dos aportes (PF − empresas)', menos(aporteEmpresas, aportadoEmpresas), { destaque: true })
    ]
  };
};
