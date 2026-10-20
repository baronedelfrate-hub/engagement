// Ordem de Serviço da visita (PDF, A4) — documento entregue ao cliente.
const AZUL = [30, 58, 138];
const CINZA = [241, 245, 249];

const dataBR = (iso) => {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};
const hora = (h) => (h ? String(h).slice(0, 5) : '—');

const STATUS = { agendada: 'Agendada', realizada: 'Realizada', parcial: 'Realizada parcialmente', remarcada: 'Remarcada', cancelada: 'Cancelada' };

const BLOCOS = [
  ['Objetivo da visita', 'objetivo'],
  ['Atividades realizadas', 'atividades'],
  ['Pessoas envolvidas', 'pessoas'],
  ['Documentos / informações coletadas', 'documentos'],
  ['Entregas e avanços', 'entregas'],
  ['Pendências (e responsável)', 'pendencias'],
  ['Pontos de atenção / riscos', 'riscos'],
  ['Próximos passos', 'proximos_passos']
];

// cliente: { nome }  projeto: { nome }  os: registro de eng_os  consultorNome: string
export const gerarOsPdf = async ({ cliente, projeto, os, consultorNome }) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  const util = largura - margem * 2;
  let y = 36;

  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ENGAGEMENT SOLUÇÕES', margem, 10);
  doc.setFontSize(16);
  doc.text('Ordem de Serviço', margem, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(projeto?.nome || '', margem, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Nº ${os.numero}`, largura - margem, 18, { align: 'right' });
  doc.setTextColor(30, 30, 30);

  // identificação
  const campos = [
    ['Cliente', cliente.nome || '—'], ['Data', dataBR(os.data)], ['Início', hora(os.inicio)],
    ['Término', hora(os.termino)], ['Fase', os.fase || '—'], ['Situação', STATUS[os.status] || os.status]
  ];
  doc.setFillColor(...CINZA);
  doc.rect(margem, y - 4, util, 22, 'F');
  campos.forEach(([rotulo, valor], i) => {
    const col = i % 3;
    const lin = Math.floor(i / 3);
    const x = margem + 3 + col * (util / 3);
    const yy = y + lin * 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(rotulo.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(doc.splitTextToSize(String(valor), util / 3 - 6)[0] || '', x, yy + 4.5);
  });
  y += 26;

  const garantir = (h) => { if (y + h > 270) { doc.addPage(); y = 18; } };
  BLOCOS.forEach(([titulo, chave]) => {
    const texto = (os[chave] || '').trim() || '—';
    const linhas = doc.splitTextToSize(texto, util - 2);
    garantir(10 + Math.min(linhas.length, 3) * 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...AZUL);
    doc.text(titulo.toUpperCase(), margem, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    linhas.forEach((l) => { garantir(5); doc.text(l, margem + 1, y); y += 4.4; });
    y += 3;
  });

  garantir(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...AZUL);
  doc.text('PRÓXIMA VISITA PREVISTA', margem, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  doc.text(dataBR(os.proxima_visita), margem + 52, y);
  y += 24;

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  const meio = largura / 2;
  doc.line(margem, y, meio - 8, y);
  doc.line(meio + 8, y, largura - margem, y);
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`${consultorNome || 'Consultor'} — Engagement Soluções`, (margem + meio - 8) / 2, y + 5, { align: 'center' });
  doc.text(cliente.nome || 'Cliente', (meio + 8 + largura - margem) / 2, y + 5, { align: 'center' });

  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Engagement Soluções  ·  (19) 99122-1912  ·  engagementsolucoes.com.br', margem, 290);
    doc.text(`Página ${i} de ${total}`, largura - margem, 290, { align: 'right' });
  }

  const slug = (cliente.nome || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  const nome = `OS_${String(os.numero).padStart(2, '0')}_${slug}.pdf`;
  doc.save(nome);
  return nome;
};
