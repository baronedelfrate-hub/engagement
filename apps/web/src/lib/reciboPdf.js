// Recibo de pagamento em PDF (A4, uma via com espaço para assinatura). jsPDF é carregado só quando o recibo é gerado.
import { finalizarPdf } from '@/lib/pdfSaida';

const UNID = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

const ate999 = (n) => {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100); const r = n % 100;
  const partes = [];
  if (c) partes.push(CENT[c]);
  if (r) partes.push(r < 20 ? UNID[r] : `${DEZ[Math.floor(r / 10)]}${r % 10 ? ` e ${UNID[r % 10]}` : ''}`);
  return partes.join(' e ');
};
const inteiroPorExtenso = (n) => {
  if (n === 0) return 'zero';
  const milhoes = Math.floor(n / 1e6); const milhares = Math.floor((n % 1e6) / 1000); const resto = n % 1000;
  const partes = [];
  if (milhoes) partes.push(`${ate999(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
  if (milhares) partes.push(milhares === 1 ? 'mil' : `${ate999(milhares)} mil`);
  if (resto) partes.push(ate999(resto));
  // "e" antes do último bloco quando ele é menor que 100 ou múltiplo de 100 (ex.: mil e quinhentos; dois mil e cinquenta)
  if (partes.length > 1 && (resto < 100 || resto % 100 === 0) && resto > 0) return `${partes.slice(0, -1).join(' ')} e ${partes[partes.length - 1]}`;
  return partes.join(' ');
};

// 370.84 -> "trezentos e setenta reais e oitenta e quatro centavos"
export const valorPorExtenso = (valor) => {
  const cents = Math.round(Math.abs(Number(valor) || 0) * 100);
  const reais = Math.floor(cents / 100); const cent = cents % 100;
  const r = reais ? `${inteiroPorExtenso(reais)} ${reais === 1 ? 'real' : (reais % 1e6 === 0 ? 'de reais' : 'reais')}` : '';
  const c = cent ? `${inteiroPorExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}` : '';
  return r && c ? `${r} e ${c}` : (r || c || 'zero real');
};

const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataLonga = (iso) => {
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${d} de ${meses[m - 1]} de ${a}`;
};

// dados: { numero?, pagador: { nome, documento }, recebedor: { nome, documento }, valor, referente, data (aaaa-mm-dd), local, forma }
export const gerarReciboPdf = async (dados, opcoes = {}) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const { numero, pagador, recebedor, valor, referente, data, local, forma } = dados;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = doc.internal.pageSize.getWidth(); const m = 20; const larg = L - m * 2;
  let y = 30;

  doc.setDrawColor(30, 58, 138); doc.setLineWidth(0.8); doc.rect(m - 6, 18, larg + 12, 130);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(30, 58, 138);
  doc.text(numero ? `RECIBO Nº ${numero}` : 'RECIBO', m, y);
  doc.setFontSize(16); doc.setTextColor(30, 30, 30);
  doc.text(brl(valor), L - m, y, { align: 'right' });
  y += 14;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(30, 30, 30);
  const doc1 = recebedor.documento ? `, inscrito(a) no CPF/CNPJ ${recebedor.documento}` : '';
  const doc2 = pagador.documento ? `, CPF/CNPJ ${pagador.documento}` : '';
  const texto = `Eu, ${recebedor.nome}${doc1}, recebi de ${pagador.nome}${doc2}, a importância de ${brl(valor)} (${valorPorExtenso(valor)}), referente a ${referente}.`;
  const linhas = doc.splitTextToSize(texto, larg);
  doc.text(linhas, m, y, { lineHeightFactor: 1.6 });
  y += linhas.length * 8 + 6;

  if (forma) { doc.setFontSize(11); doc.setTextColor(90, 90, 90); doc.text(`Forma de pagamento: ${forma}.`, m, y); y += 8; }
  doc.setTextColor(30, 30, 30); doc.setFontSize(12);
  doc.text('Por ser verdade, firmo o presente recibo, dando plena e geral quitação do valor acima.', m, y, { maxWidth: larg });
  y += 16;
  doc.text(`${local ? `${local}, ` : ''}${dataLonga(data)}.`, m, y);

  y = 122;
  doc.setLineWidth(0.3); doc.setDrawColor(60, 60, 60);
  doc.line(m + 20, y, L - m - 20, y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text(recebedor.nome, L / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
  if (recebedor.documento) doc.text(`CPF/CNPJ ${recebedor.documento}`, L / 2, y + 11, { align: 'center' });

  const nome = `recibo${numero ? `_${String(numero).padStart(4, '0')}` : ''}_${String(recebedor.nome).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase()}_${String(data).slice(0, 10)}.pdf`;
  return finalizarPdf(doc, nome, opcoes);
};
