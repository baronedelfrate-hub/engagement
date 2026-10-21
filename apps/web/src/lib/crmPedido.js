// Proposta aceita -> pedido de venda (itens pontuais) e contrato recorrente (itens mensais). O pedido é a base da emissão da nota.
import { supabase } from '@/lib/customSupabaseClient';
import { atualizarCatalogo, atualizarProposta, totalItem, moeda, hojeISO } from '@/lib/crmService';
import { criarContrato, contratoDaProposta, gerarNumeroContrato, valorMensal } from '@/lib/crmContratos';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const digitos = (s) => String(s || '').replace(/\D/g, '');
const centavos = (v) => Math.round((Number(v) || 0) * 100);

// Distribui o desconto geral da proposta pelos itens, proporcionalmente ao valor de cada um (o último absorve os centavos),
// para a soma dos itens do pedido ser igual ao total da proposta. Devolve o valor líquido de cada item em reais.
export const ratearDesconto = (itens, descontoGeral) => {
  const liquidos = itens.map((i) => centavos(totalItem(i)));
  const soma = liquidos.reduce((s, v) => s + v, 0);
  let resta = Math.min(centavos(descontoGeral), soma);
  const alocado = liquidos.map((v, idx) => {
    if (idx === liquidos.length - 1) return Math.min(resta, v);
    const parte = soma ? Math.round((centavos(descontoGeral) * v) / soma) : 0;
    const a = Math.min(parte, resta, v);
    resta -= a;
    return a;
  });
  return liquidos.map((v, idx) => ({ rateio: alocado[idx] / 100, liquido: (v - alocado[idx]) / 100 }));
};

// Procura o cliente da empresa pelo CNPJ/CPF (ou pelo nome) e cria se não existir.
export const garantirCliente = async (companyId, conta, contato) => {
  const todos = ok(await supabase.from('clientes').select('id, nome, cnpj_cpf').eq('company_id', companyId));
  const doc = digitos(conta.cnpj_cpf);
  const achado = (doc && todos.find((c) => digitos(c.cnpj_cpf) === doc)) || todos.find((c) => norm(c.nome) === norm(conta.nome));
  if (achado) return { id: achado.id, criado: false };
  const novo = ok(await supabase.from('clientes').insert({
    company_id: companyId,
    nome: conta.nome,
    cnpj_cpf: conta.cnpj_cpf || null,
    email: contato?.email || null,
    telefone: contato?.telefone || contato?.whatsapp || null,
    cidade: conta.cidade || null,
    estado: conta.uf || null,
    tipo_cliente: doc.length === 14 ? 'PJ' : doc.length === 11 ? 'PF' : null,
    status: 'ativo',
    observacoes: 'Cadastrado a partir do CRM (proposta aceita).'
  }).select('id').single());
  return { id: novo.id, criado: true };
};

// Serviço fiscal do item: o do catálogo, um já cadastrado com o mesmo nome, ou um novo.
export const garantirServico = async (companyId, item, catalogoItem) => {
  let id = catalogoItem?.servico_id || null;
  if (!id) {
    const nome = (catalogoItem?.nome || item.descricao || 'Serviço').trim();
    const existentes = ok(await supabase.from('servicos').select('id, nome').eq('company_id', companyId));
    const igual = existentes.find((s) => norm(s.nome) === norm(nome));
    if (igual) id = igual.id;
    else {
      id = ok(await supabase.from('servicos').insert({
        company_id: companyId, nome, descricao: catalogoItem?.descricao || null, preco: Number(item.preco_unitario) || 0,
        status: 'ativo', ativo: true, tipo: 'servico'
      }).select('id').single()).id;
    }
    if (catalogoItem?.id) await atualizarCatalogo(catalogoItem.id, { servico_id: id });
  }
  const s = ok(await supabase.from('servicos').select('id, nome, codigo_servico_lc116').eq('id', id).single());
  return { id: s.id, nome: s.nome, faltaFiscal: !s.codigo_servico_lc116 };
};

const enderecoDe = (e) => [e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado, e.cep ? `CEP ${e.cep}` : ''].filter(Boolean).join(', ');

// Insere o pedido de venda (cabeçalho com os dados do emitente + itens). Se os itens falharem, remove o cabeçalho.
export const inserirPedido = async ({ companyId, clienteId, numero, itens, observacoes, vencimento, numeroParcelas = 1, propostaId = null }) => {
  const emp = ok(await supabase.from('empresas').select('*').eq('id', companyId).single());
  const hoje = hojeISO();
  const total = itens.reduce((s, i) => s + i.valor_total, 0);
  const pedido = ok(await supabase.from('pedidos_venda').insert({
    company_id: companyId, numero, cliente_id: clienteId, data_pedido: hoje, data_emissao: hoje, status_pedido: 'confirmed',
    valor_total: total, desconto: 0, observacoes, tipo_frete: 'SEM_FRETE', valor_frete: 0,
    condicao_pagamento: numeroParcelas > 1 ? 'parcelado' : 'a_vista', numero_parcelas: Math.max(1, numeroParcelas), data_vencimento: vencimento || hoje,
    empresa_id: companyId, empresa_razao_social: emp.razao_social, empresa_cnpj: emp.cnpj, empresa_ie: emp.inscricao_estadual || null,
    empresa_endereco: enderecoDe(emp), empresa_telefone: emp.telefone || null, empresa_email: emp.email || null, empresa_logo_path: emp.logo_path || null,
    endereco_entrega_mesmo_cliente: true, proposta_crm_id: propostaId
  }).select().single());
  try {
    ok(await supabase.from('pedidos_venda_itens').insert(itens.map((i) => ({ ...i, company_id: companyId, pedido_id: pedido.id }))));
  } catch (e) {
    await supabase.from('pedidos_venda').delete().eq('id', pedido.id);
    throw e;
  }
  return pedido;
};

// proposta: resultado de carregarProposta (com itens, conta e oportunidade).
// Itens mensais (catálogo "recorrente") viram um contrato; os demais viram o pedido de venda único.
// Devolve { pedido, contrato, jaExistia, avisos }.
export const gerarPedidoDaProposta = async ({ proposta, catalogo, companyId, dataInicioContrato }) => {
  const contratoExistente = await contratoDaProposta(proposta.id);
  if (proposta.pedido_venda_id || contratoExistente) {
    return { pedido: proposta.pedido_venda_id ? { id: proposta.pedido_venda_id } : null, contrato: contratoExistente, jaExistia: true, avisos: [] };
  }
  if (!proposta.itens?.length) throw new Error('A proposta não tem itens. Adicione os serviços na aba Valores antes de gerar o pedido.');
  const avisos = [];

  const cliente = await garantirCliente(companyId, proposta.conta, proposta.oportunidade?.contato);
  if (cliente.criado) avisos.push('Cliente cadastrado a partir da conta do CRM. Complete o endereço em Cadastros > Clientes antes de emitir a nota.');

  const ehMensal = (i) => !!catalogo.find((c) => c.id === i.catalogo_id)?.recorrente;
  const mensais = proposta.itens.filter(ehMensal);
  const pontuais = proposta.itens.filter((i) => !ehMensal(i));
  if (mensais.length && Number(proposta.desconto) > 0 && !pontuais.length) avisos.push('O desconto geral da proposta não é aplicado aos itens mensais do contrato. Use o desconto por item, se quiser abater todo mês.');

  const semFiscal = new Set();
  const resolver = async (i) => {
    const serv = await garantirServico(companyId, i, catalogo.find((c) => c.id === i.catalogo_id));
    if (serv.faltaFiscal) semFiscal.add(serv.nome);
    return serv.id;
  };

  // pedido único: itens pontuais, com o desconto geral rateado
  let pedido = null;
  if (pontuais.length) {
    const rateio = ratearDesconto(pontuais, proposta.desconto);
    const itensPedido = [];
    for (let k = 0; k < pontuais.length; k += 1) {
      const i = pontuais[k];
      itensPedido.push({
        tipo_item: 'servico', servico_id: await resolver(i), descricao: i.descricao, quantidade: Number(i.quantidade) || 1,
        preco_unitario: Number(i.preco_unitario) || 0, desconto: (Number(i.desconto) || 0) + rateio[k].rateio, acrescimo: 0, valor_total: rateio[k].liquido
      });
    }
    const parcelas = (proposta.parcelas || []).filter((p) => Number(p.valor) > 0);
    const observacoes = [
      `Gerado a partir da proposta ${proposta.numero}${proposta.versao > 1 ? ` v${proposta.versao}` : ''} — ${proposta.titulo}.`,
      parcelas.length && !mensais.length ? `Parcelas: ${parcelas.map((p) => `${p.rotulo || 'parcela'} ${moeda(p.valor)}`).join('; ')}.` : null,
      Number(proposta.desconto) > 0 ? `Desconto de ${moeda(proposta.desconto)} rateado nos itens.` : null,
      mensais.length ? 'Os itens mensais estão no contrato recorrente.' : null
    ].filter(Boolean).join(' ');
    pedido = await inserirPedido({
      companyId, clienteId: cliente.id, numero: `PV-${proposta.numero}${proposta.versao > 1 ? `-v${proposta.versao}` : ''}`, itens: itensPedido,
      observacoes, numeroParcelas: mensais.length ? 1 : parcelas.length, propostaId: proposta.id
    });
    await atualizarProposta(proposta.id, { pedido_venda_id: pedido.id });
  }

  // contrato recorrente: itens mensais
  let contrato = null;
  if (mensais.length) {
    const itensContrato = [];
    for (const i of mensais) {
      itensContrato.push({ servico_id: await resolver(i), descricao: i.descricao, quantidade: Number(i.quantidade) || 1, preco_unitario: Number(i.preco_unitario) || 0, desconto: Number(i.desconto) || 0 });
    }
    contrato = await criarContrato(companyId, {
      cliente_id: cliente.id, cliente_bpo_id: proposta.oportunidade?.cliente_bpo_id || null, proposta_id: proposta.id,
      numero: await gerarNumeroContrato(companyId, `CT-${proposta.numero}${proposta.versao > 1 ? `-v${proposta.versao}` : ''}`),
      titulo: proposta.titulo, data_inicio: dataInicioContrato || hojeISO(), observacoes: `Criado a partir da proposta ${proposta.numero}.`
    }, itensContrato);
    avisos.push(`Contrato ${contrato.numero} criado (${moeda(valorMensal(itensContrato))} por mês). Confira a data de início em Vendas > Contratos recorrentes.`);
  }

  if (semFiscal.size) avisos.push(`Complete o código LC 116 e a alíquota de ISS em Cadastros > Serviços antes de emitir a nota: ${[...semFiscal].join('; ')}.`);
  return { pedido, contrato, jaExistia: false, avisos };
};
