// Cria o cliente da Engagement (BPO E5 ou Consultoria F5) a partir de uma proposta do CRM.
import { criarCliente } from '@/lib/engService';
import { atualizarOportunidade, moverEtapa } from '@/lib/crmService';

const PLANOS = ['Básico', 'Essencial', 'Profissional', 'Estratégico'];

// Serviços e plano deduzidos dos itens da proposta (catálogo) e do serviço da oportunidade.
export const deduzirServicos = (itens, catalogo, oportunidade) => {
  const tipos = new Set();
  let plano = null;
  itens.forEach((i) => {
    const c = catalogo.find((x) => x.id === i.catalogo_id);
    if (c?.tipo === 'bpo' || c?.tipo === 'consultoria') tipos.add(c.tipo);
    if (c?.tipo === 'bpo' && !plano) plano = PLANOS.find((p) => c.nome.includes(p)) || null;
  });
  if (tipos.size === 0 && ['bpo', 'consultoria'].includes(oportunidade?.servico)) tipos.add(oportunidade.servico);
  if (tipos.size === 0) tipos.add('bpo');
  return { servicos: [...tipos], plano };
};

// Devolve { cliente, jaExistia, rota }
export const criarClienteDaProposta = async ({ proposta, itens, catalogo }) => {
  const op = proposta.oportunidade;
  if (op?.cliente_bpo_id) return { cliente: { id: op.cliente_bpo_id }, jaExistia: true };
  const conta = proposta.conta || {};
  const contato = op?.contato || {};
  const { servicos, plano } = deduzirServicos(itens, catalogo, op);
  const aceita = proposta.status === 'aceita';
  const cliente = await criarCliente({
    nome: conta.nome,
    cnpj_cpf: conta.cnpj_cpf || null,
    email: contato.email || null,
    telefone: contato.telefone || contato.whatsapp || null,
    segmento: conta.segmento || null,
    cidade: conta.cidade || null,
    estado: conta.uf || null,
    servicos,
    plano: servicos.includes('bpo') ? plano : null,
    status_contrato: aceita ? 'em_implantacao' : 'proposta',
    observacoes: `Criado a partir da proposta ${proposta.numero}${proposta.versao > 1 ? ` v${proposta.versao}` : ''}.`
  });
  if (op?.id) {
    await atualizarOportunidade(op.id, { cliente_bpo_id: cliente.id });
    if (aceita && op.etapa !== 'ganho') await moverEtapa(op.id, 'ganho');
  }
  return { cliente, jaExistia: false, servicos };
};

export const rotaDaFicha = (cliente, servicos) => ((servicos || cliente.servicos || ['bpo']).includes('bpo') ? `/bpo/cliente/${cliente.id}` : `/metodologia-f5/cliente/${cliente.id}`);
