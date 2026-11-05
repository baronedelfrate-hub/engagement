// Texto de pagamentos para colar/enviar por WhatsApp: valor, vencimento e a chave Pix (ou o código do boleto) de cada um,
// cada chave em uma linha sozinha, entre ```crases```: no envio, cada uma vira uma mensagem só com o código (ver planoMensagens). Só entra o que ainda não foi pago.
import { rotuloTipoPix, valorParaCopiar } from '@/lib/chavePix';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : 'Sem data');
const pago = (r) => r.status === 'Pago' || r.status === 'Recebido';

export const montarTextoPagamentos = (linhas) => {
  const abertas = (linhas || []).filter((r) => !pago(r));
  if (!abertas.length) return '';
  const porDia = new Map();
  abertas.forEach((r) => { const k = r.data_vencimento || ''; if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(r); });
  const partes = [];
  [...porDia.keys()].sort().forEach((dia) => {
    const itens = porDia.get(dia);
    const total = itens.reduce((s, r) => s + Number(r.valor_original || 0), 0);
    partes.push(`*${dataBR(dia)}* — total ${moeda(total)}`);
    partes.push('');
    itens.forEach((r, i) => {
      const nome = r.fornecedor_nome || r.cliente_nome || 'Sem fornecedor';
      const desc = String(r.numero || '').trim();
      partes.push(`${i + 1}) *${nome}* — ${moeda(r.valor_original)}${desc && desc !== nome ? `\n${desc}` : ''}`);
      if (r.codigo_barras) partes.push(`Boleto (código de barras):\n\`\`\`${String(r.codigo_barras).replace(/\D/g, '')}\`\`\``);
      else if (r.fornecedor_pix) partes.push(`Pix${r.fornecedor_tipo_pix ? ` (${rotuloTipoPix(r.fornecedor_tipo_pix)})` : ''}:\n\`\`\`${valorParaCopiar(r.fornecedor_tipo_pix, r.fornecedor_pix)}\`\`\``);
      else partes.push('(sem chave Pix nem boleto cadastrados)');
      partes.push('');
    });
    partes.push('');
  });
  return partes.join('\n').trim();
};

// Lista para a caixa de envio: cada pagamento em aberto com o que copiar (código do boleto ou chave Pix).
export const listarChavesParaCopiar = (linhas) => (linhas || []).filter((r) => !pago(r)).map((r) => {
  const nome = r.fornecedor_nome || r.cliente_nome || 'Sem fornecedor';
  if (r.codigo_barras) return { nome, valor: moeda(r.valor_original), vencimento: dataBR(r.data_vencimento), tipo: 'Boleto', exibir: String(r.codigo_barras).trim(), copiar: String(r.codigo_barras).replace(/\D/g, '') };
  if (r.fornecedor_pix) return { nome, valor: moeda(r.valor_original), vencimento: dataBR(r.data_vencimento), tipo: `Pix${r.fornecedor_tipo_pix ? ` ${rotuloTipoPix(r.fornecedor_tipo_pix)}` : ''}`, exibir: valorParaCopiar(r.fornecedor_tipo_pix, r.fornecedor_pix), copiar: valorParaCopiar(r.fornecedor_tipo_pix, r.fornecedor_pix) };
  return { nome, valor: moeda(r.valor_original), vencimento: dataBR(r.data_vencimento), tipo: '', exibir: '', copiar: '' };
});
