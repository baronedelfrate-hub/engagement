// Proposta comercial em PDF no formato de apresentação (16:9), na identidade da Engagement.
import logoUrl from '@/assets/engagement-logo.png';
import capaUrl from '@/assets/proposta-capa.png';

const W = 297;
const H = 167;
const M = 16;
const LARANJA = [254, 97, 2];
const LARANJA_CLARO = [255, 230, 214];
const GRAFITE = [30, 35, 41];
const CINZA = [74, 82, 96];
const CINZA_CLARO = [138, 148, 163];
const FUNDO = [244, 245, 247];
const BORDA = [217, 221, 227];
const BRANCO = [255, 255, 255];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const moeda = (v, casas = 2) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
const moedaEnxuta = (v) => (Number.isInteger(Number(v)) ? moeda(v, 0) : moeda(v, 2));

const dataExtenso = (iso) => {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
};

const carregarImagem = async (url) => {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
};

// dados: { proposta, conta, itens, institucional }
export const gerarPropostaPdf = async ({ proposta, conta, itens = [], institucional = {} }) => {
  const jspdfMod = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF || jspdfMod.default?.jsPDF || jspdfMod.default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });
  const conteudo = proposta.conteudo || {};
  const paginas = proposta.paginas || {};
  const inst = institucional;
  const logo = await carregarImagem(logoUrl).catch(() => null);
  const capa = await carregarImagem(capaUrl).catch(() => null);
  const usa = (id) => paginas[id] !== false;
  let numeroPagina = 0;

  const fonte = (tam, peso = 'normal', cor = GRAFITE) => { doc.setFont('helvetica', peso); doc.setFontSize(tam); doc.setTextColor(...cor); };
  const texto = (str, x, y, largura, tam, { peso = 'normal', cor = GRAFITE, alt = null, align = 'left', max = 99 } = {}) => {
    fonte(tam, peso, cor);
    const linhas = doc.splitTextToSize(String(str ?? ''), largura).slice(0, max);
    const passo = alt || tam * 0.42;
    linhas.forEach((l, i) => doc.text(l, align === 'center' ? x + largura / 2 : x, y + i * passo, { align }));
    return y + linhas.length * passo;
  };
  const caixa = (x, y, w, h, { fundo = FUNDO, barra = true, borda = false } = {}) => {
    doc.setFillColor(...fundo);
    doc.roundedRect(x, y, w, h, 2, 2, 'F');
    if (borda) { doc.setDrawColor(...BORDA); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 2, 2, 'S'); }
    if (barra) { doc.setFillColor(...LARANJA); doc.rect(x, y + 2, 1.2, h - 4, 'F'); }
  };

  const nova = (rotulo, titulo, { escuro = false } = {}) => {
    if (numeroPagina > 0) doc.addPage([W, H], 'landscape');
    numeroPagina += 1;
    doc.setFillColor(...(escuro ? GRAFITE : BRANCO));
    doc.rect(0, 0, W, H, 'F');
    if (rotulo) { doc.setFillColor(...LARANJA); doc.rect(M, 13, 8, 1.2, 'F'); texto(rotulo.toUpperCase(), M, 19, 200, 8, { peso: 'bold', cor: LARANJA }); }
    let y = 30;
    if (titulo) y = texto(titulo, M, y, W - M * 2 - 40, 21, { peso: 'bold', cor: escuro ? BRANCO : GRAFITE, alt: 9 }) + 3;
    // rodapé
    doc.setDrawColor(...(escuro ? CINZA : BORDA)); doc.setLineWidth(0.3); doc.line(M, H - 11, W - M, H - 11);
    texto('ENGAGEMENT', M, H - 6, 60, 7.5, { peso: 'bold', cor: LARANJA });
    texto(`${proposta.numero}${proposta.versao > 1 ? ` v${proposta.versao}` : ''}  ·  ${conta?.nome || ''}`, M + 32, H - 6, 150, 7.5, { cor: CINZA_CLARO });
    if (numeroPagina > 1) texto(String(numeroPagina), W - M, H - 6, 10, 8, { cor: CINZA_CLARO, align: 'right' });
    return y;
  };

  // 1) capa
  numeroPagina = 1;
  doc.setFillColor(...BRANCO); doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...FUNDO); doc.rect(W * 0.52, 0, W * 0.48, H, 'F');
  if (capa) doc.addImage(capa, 'PNG', W * 0.53, 22, W * 0.44, (W * 0.44) * (430 / 720));
  if (logo) doc.addImage(logo, 'PNG', M, 14, 12, 11);
  texto(inst.metodologia || 'CONSULTORIA F5', M + 15, 18, 100, 8, { peso: 'bold', cor: LARANJA });
  texto(inst.marca || 'ENGAGEMENT', M + 15, 24, 100, 12, { peso: 'bold' });
  texto(`PROPOSTA COMERCIAL  ·  ${proposta.numero}${proposta.versao > 1 ? ` v${proposta.versao}` : ''}`, M, 62, W * 0.48, 9, { peso: 'bold', cor: LARANJA });
  let yc = texto(proposta.titulo || 'Proposta comercial', M, 74, W * 0.46, 26, { peso: 'bold', alt: 11, max: 4 });
  if (proposta.subtitulo) yc = texto(proposta.subtitulo, M, yc + 6, W * 0.44, 12, { cor: CINZA, alt: 5.6, max: 4 });
  doc.setFillColor(...LARANJA); doc.rect(M, H - 28, 10, 1.2, 'F');
  texto(`${inst.cidade ? `${inst.cidade}, ` : ''}${dataExtenso(proposta.data_emissao)}`, M, H - 20, W * 0.46, 10, { cor: CINZA });
  if (conta?.nome) texto(`Preparada para ${conta.nome}`, M, H - 14, W * 0.46, 9, { cor: CINZA_CLARO });

  // 2) quem somos
  if (usa('quem_somos')) {
    nova('Quem somos', inst.quem_somos_titulo || 'Parceiros estratégicos da sua gestão financeira');
    const colW = (W - M * 2 - 12) / 2;
    let y = texto(inst.quem_somos, M, 62, colW, 11, { cor: CINZA, alt: 5.4, max: 7 }) + 6;
    texto(inst.camadas_titulo, M, y, colW, 10, { peso: 'bold' });
    (inst.camadas || []).forEach((c, i) => {
      const x = M + i * 38;
      doc.setFillColor(...LARANJA_CLARO); doc.roundedRect(x, y + 4, 34, 10, 5, 5, 'F');
      texto(c, x, y + 10.4, 34, 9, { peso: 'bold', cor: [194, 74, 4], align: 'center' });
    });
    texto(inst.resultado, M, y + 25, colW, 10, { peso: 'bold', cor: LARANJA, max: 2 });
    const x2 = M + colW + 12;
    caixa(x2, 56, colW, 48); texto('MISSÃO', x2 + 6, 65, colW - 10, 8, { peso: 'bold', cor: LARANJA });
    texto(inst.missao, x2 + 6, 72, colW - 12, 9.5, { cor: CINZA, alt: 4.6, max: 7 });
    caixa(x2, 110, colW, 40); texto('VISÃO', x2 + 6, 119, colW - 10, 8, { peso: 'bold', cor: LARANJA });
    texto(inst.visao, x2 + 6, 126, colW - 12, 9.5, { cor: CINZA, alt: 4.6, max: 6 });
  }

  // 3) valores
  if (usa('valores') && (inst.valores || []).length) {
    nova('Nossos valores', 'O que guia o nosso trabalho');
    const n = inst.valores.length;
    const gap = 6;
    const w = (W - M * 2 - gap * (n - 1)) / n;
    inst.valores.forEach((v, i) => {
      const x = M + i * (w + gap);
      caixa(x, 58, w, 78, { barra: false });
      texto(String(i + 1).padStart(2, '0'), x + 6, 76, w, 20, { peso: 'bold', cor: LARANJA });
      texto(v.titulo, x + 6, 92, w - 10, 12, { peso: 'bold', alt: 5.5, max: 2 });
      texto(v.texto, x + 6, 106, w - 11, 9, { cor: CINZA, alt: 4.5, max: 6 });
    });
  }

  // 4) ponto de partida
  const pp = conteudo.ponto_partida;
  if (usa('ponto_partida') && pp) {
    nova('O ponto de partida', pp.titulo);
    const dest = (pp.destaques || []).filter((d) => d.valor || d.rotulo);
    const n = Math.max(dest.length, 1);
    const gap = 8;
    const w = (W - M * 2 - gap * (n - 1)) / n;
    dest.forEach((d, i) => {
      const x = M + i * (w + gap);
      caixa(x, 56, w, 36, { fundo: BRANCO, borda: true });
      texto(d.valor, x + 7, 74, w - 10, 22, { peso: 'bold', cor: LARANJA, max: 1 });
      texto(d.rotulo, x + 7, 83, w - 12, 9, { cor: CINZA, max: 2 });
    });
    if (pp.estrategia) {
      caixa(M, 102, W - M * 2, 46, { fundo: GRAFITE });
      texto((pp.estrategia_titulo || 'Nossa estratégia').toUpperCase(), M + 8, 112, 120, 8, { peso: 'bold', cor: [255, 178, 122] });
      texto(pp.estrategia, M + 8, 121, W - M * 2 - 16, 11, { cor: BRANCO, alt: 5.4, max: 5 });
    }
  }

  // 5) objetivo
  const ob = conteudo.objetivo;
  if (usa('objetivo') && ob) {
    let y = nova('Objetivo do projeto', ob.titulo);
    if (ob.subtitulo) y = texto(ob.subtitulo, M, y, W - M * 2, 11, { cor: CINZA, alt: 5.2, max: 2 }) + 4;
    const pecas = (ob.pecas || []).filter((p) => p.titulo || p.texto);
    const cols = pecas.length <= 4 ? Math.max(pecas.length, 1) : pecas.length <= 6 ? 3 : 4;
    const gap = 6;
    const w = (W - M * 2 - gap * (cols - 1)) / cols;
    const linhas = Math.ceil(pecas.length / cols);
    const h = Math.min(40, (H - 16 - Math.max(y, 56) - gap * (linhas - 1)) / Math.max(linhas, 1));
    pecas.forEach((p, i) => {
      const x = M + (i % cols) * (w + gap);
      const yy = Math.max(y, 56) + Math.floor(i / cols) * (h + gap);
      caixa(x, yy, w, h);
      texto(p.titulo, x + 6, yy + 9, w - 10, 11, { peso: 'bold', max: 2, alt: 5 });
      texto(p.texto, x + 6, yy + 18, w - 11, 8.5, { cor: CINZA, alt: 4.2, max: Math.max(2, Math.floor((h - 20) / 4.2)) });
    });
  }

  // 6) escopo: visão geral + detalhe das frentes (2 por página)
  const es = conteudo.escopo;
  const frentes = ((es && es.frentes) || []).filter((f) => f.titulo);
  if (usa('escopo') && frentes.length) {
    nova('Escopo do projeto', `${frentes.length} frentes de trabalho em um único projeto`);
    const cols = frentes.length > 6 ? 4 : frentes.length > 3 ? 3 : frentes.length;
    const gap = 6;
    const w = (W - M * 2 - gap * (cols - 1)) / cols;
    const h = 40;
    frentes.forEach((f, i) => {
      const x = M + (i % cols) * (w + gap);
      const yy = 56 + Math.floor(i / cols) * (h + gap);
      caixa(x, yy, w, h, { fundo: f.prioridade ? LARANJA_CLARO : FUNDO });
      texto(String(i + 1).padStart(2, '0'), x + 6, yy + 11, 20, 14, { peso: 'bold', cor: LARANJA });
      texto(f.titulo, x + 6, yy + 21, w - 11, 10, { peso: 'bold', alt: 4.6, max: 3 });
      if (f.prioridade) texto(f.prioridade.toUpperCase(), x + 6, yy + h - 4, w - 10, 6.5, { peso: 'bold', cor: [194, 74, 4] });
    });
    const comItens = frentes.map((f, i) => ({ ...f, numero: i + 1 })).filter((f) => (f.itens || []).some((t) => t && t.trim()));
    for (let i = 0; i < comItens.length; i += 2) {
      const par = comItens.slice(i, i + 2);
      nova(`Frente ${par.map((f) => String(f.numero).padStart(2, '0')).join(' e ')}`, par.length === 1 ? par[0].titulo : '');
      const colW = (W - M * 2 - 12) / par.length;
      par.forEach((f, k) => {
        const x = M + k * (colW + 12);
        const topo = par.length === 1 ? 52 : 34;
        caixa(x, topo, colW, H - 16 - topo - 6);
        texto(`FRENTE ${String(f.numero).padStart(2, '0')}`, x + 7, topo + 9, colW, 7.5, { peso: 'bold', cor: LARANJA });
        let yy = texto(f.titulo, x + 7, topo + 17, colW - 14, 12.5, { peso: 'bold', alt: 5.6, max: 2 });
        if (f.prioridade) { doc.setFillColor(...LARANJA_CLARO); doc.roundedRect(x + 7, yy + 1, 40, 6, 3, 3, 'F'); texto(f.prioridade.toUpperCase(), x + 7, yy + 5.2, 40, 6.5, { peso: 'bold', cor: [194, 74, 4], align: 'center' }); yy += 10; }
        yy += 5;
        (f.itens || []).filter((t) => t && t.trim()).forEach((t) => {
          fonte(9.2, 'normal', CINZA);
          const linhas = doc.splitTextToSize(t, colW - 22);
          if (yy + linhas.length * 4.6 > H - 22) return;
          doc.setFillColor(...LARANJA); doc.circle(x + 9.5, yy - 1, 0.9, 'F');
          texto(t, x + 13, yy, colW - 22, 9.2, { cor: CINZA, alt: 4.6 });
          yy += linhas.length * 4.6 + 2.2;
        });
      });
    }
  }

  // 7) cronograma (gantt por semanas)
  const cr = conteudo.cronograma;
  const fases = ((cr && cr.fases) || []).filter((f) => f.nome);
  if (usa('cronograma') && fases.length) {
    const semanas = Math.max(Number(cr.semanas) || 12, ...fases.map((f) => Number(f.ate) || 0));
    nova('Cronograma', cr.titulo || `Cerca de ${Math.round(semanas * 7.5 / 30) * 30} dias, com fases em paralelo`);
    const xNome = M;
    const wNome = 92;
    const x0 = M + wNome + 4;
    const wSem = (W - M - x0) / semanas;
    for (let s = 1; s <= semanas; s++) texto(String(s), x0 + (s - 1) * wSem, 58, wSem, 8, { peso: 'bold', cor: CINZA_CLARO, align: 'center' });
    texto('SEMANAS', x0, 53, 40, 6.5, { peso: 'bold', cor: CINZA_CLARO });
    const linha = Math.min(13, (H - 30 - 62) / fases.length);
    fases.forEach((f, i) => {
      const y = 62 + i * linha;
      if (i % 2 === 0) { doc.setFillColor(...FUNDO); doc.rect(M, y - 2.5, W - M * 2, linha, 'F'); }
      texto(`Fase ${i + 1}  ${f.nome}`, xNome + 2, y + linha / 2 - 1.2, wNome - 4, 8.6, { peso: 'bold', max: 2, alt: 3.8 });
      const de = Math.max(1, Number(f.de) || 1);
      const ate = Math.min(semanas, Math.max(de, Number(f.ate) || de));
      doc.setFillColor(...LARANJA); doc.roundedRect(x0 + (de - 1) * wSem + 0.5, y, (ate - de + 1) * wSem - 1, linha - 5.5, 1.5, 1.5, 'F');
      texto(de === ate ? `sem. ${de}` : `sem. ${de}–${ate}`, x0 + (de - 1) * wSem + 0.5, y + (linha - 5.5) / 2 + 1.4, (ate - de + 1) * wSem - 1, 7, { peso: 'bold', cor: BRANCO, align: 'center' });
    });
    if (cr.nota) texto(cr.nota, M, H - 19, W - M * 2, 7.5, { cor: CINZA_CLARO, alt: 3.4, max: 2 });
  }

  // 8) investimento
  if (usa('investimento')) {
    const iv = conteudo.investimento || {};
    const parcelas = (proposta.parcelas || []).filter((p) => Number(p.valor) > 0);
    nova('Investimento', iv.titulo || 'Investimento diluído ao longo do projeto');
    const itensOk = itens.filter((i) => i.descricao);
    let topo = 54;
    if (itensOk.length) {
      const xDesc = M, xQtd = W - M - 118, xUn = W - M - 86, xDesc2 = W - M - 56, xTot = W - M - 24;
      texto('SERVIÇO', xDesc, topo, 100, 7, { peso: 'bold', cor: CINZA_CLARO });
      texto('QTD', xQtd, topo, 20, 7, { peso: 'bold', cor: CINZA_CLARO, align: 'right' });
      texto('UNITÁRIO', xUn, topo, 28, 7, { peso: 'bold', cor: CINZA_CLARO, align: 'right' });
      texto('DESCONTO', xDesc2, topo, 28, 7, { peso: 'bold', cor: CINZA_CLARO, align: 'right' });
      texto('TOTAL', xTot, topo, 24, 7, { peso: 'bold', cor: CINZA_CLARO, align: 'right' });
      doc.setDrawColor(...BORDA); doc.line(M, topo + 2, W - M, topo + 2);
      let y = topo + 8;
      itensOk.slice(0, 5).forEach((i) => {
        const tot = Math.max(0, i.quantidade * i.preco_unitario - (i.desconto || 0));
        texto(i.descricao, xDesc, y, 150, 9.5, { peso: 'bold', max: 1 });
        texto(String(i.quantidade), xQtd, y, 20, 9, { cor: CINZA, align: 'right' });
        texto(moedaEnxuta(i.preco_unitario), xUn, y, 28, 9, { cor: CINZA, align: 'right' });
        texto(i.desconto ? `- ${moedaEnxuta(i.desconto)}` : '—', xDesc2, y, 28, 9, { cor: CINZA, align: 'right' });
        texto(moedaEnxuta(tot), xTot, y, 24, 9, { peso: 'bold', align: 'right' });
        y += 8;
      });
      topo = y + 4;
    }
    const igual = parcelas.length > 1 && parcelas.every((p) => Math.abs(p.valor - parcelas[0].valor) < 0.005);
    texto('VALOR TOTAL', M, topo + 6, 60, 8, { peso: 'bold', cor: LARANJA });
    texto(moedaEnxuta(proposta.valor_total), M, topo + 22, 120, 30, { peso: 'bold' });
    if (proposta.desconto > 0) texto(`já com desconto de ${moedaEnxuta(proposta.desconto)}`, M, topo + 29, 120, 8.5, { cor: CINZA_CLARO });
    texto(parcelas.length > 1 ? `em ${parcelas.length} parcelas${igual ? ` de ${moeda(parcelas[0].valor)}` : ''}` : (parcelas.length === 1 ? 'pagamento único' : ''), M, topo + (proposta.desconto > 0 ? 36 : 31), 140, 11, { cor: CINZA });
    if (parcelas.length) {
      const base = topo + 6;
      const xi = M + 128;
      const n = parcelas.length;
      const gap = 5;
      const w = Math.min(36, (W - M - xi - gap * (n - 1)) / n);
      parcelas.slice(0, 6).forEach((p, i) => {
        const x = xi + i * (w + gap);
        caixa(x, base, w, 32, { barra: false });
        doc.setFillColor(...LARANJA); doc.rect(x, base, w, 1.4, 'F');
        texto(moedaEnxuta(p.valor), x, base + 15, w, 12, { peso: 'bold', align: 'center' });
        texto(p.rotulo, x, base + 24, w, 8.5, { cor: CINZA, align: 'center', max: 1 });
      });
    }
    if (iv.nota) texto(iv.nota, M, H - 22, W - M * 2, 8.5, { cor: CINZA_CLARO, alt: 3.8, max: 3 });
  }

  // 9) condições comerciais
  const co = conteudo.condicoes;
  const itensCond = ((co && co.itens) || []).filter((c) => c.titulo || c.valor);
  if (usa('condicoes') && itensCond.length) {
    nova('Condições comerciais', co.titulo || 'Prazo, faturamento e validade');
    const n = itensCond.length;
    const gap = 8;
    const w = (W - M * 2 - gap * (n - 1)) / n;
    itensCond.forEach((c, i) => {
      const x = M + i * (w + gap);
      caixa(x, 58, w, 70);
      texto(c.valor, x + 8, 78, w - 14, 20, { peso: 'bold', cor: LARANJA, max: 2, alt: 8 });
      texto(c.titulo, x + 8, 96, w - 14, 11.5, { peso: 'bold', max: 2, alt: 5 });
      texto(c.texto, x + 8, 106, w - 16, 9, { cor: CINZA, alt: 4.4, max: 4 });
    });
  }

  // 10) próximos passos
  const pr = conteudo.proximos_passos;
  const passos = ((pr && pr.passos) || []).filter((p) => p.titulo);
  if (usa('proximos_passos') && passos.length) {
    nova('Próximos passos', pr.titulo || 'Vamos começar juntos?', { escuro: true });
    const n = passos.length;
    const gap = 10;
    const w = (W - M * 2 - gap * (n - 1)) / n;
    passos.forEach((p, i) => {
      const x = M + i * (w + gap);
      doc.setFillColor(...LARANJA); doc.circle(x + 7, 70, 7, 'F');
      texto(String(i + 1), x, 73.2, 14, 12, { peso: 'bold', cor: BRANCO, align: 'center' });
      texto(p.titulo, x, 90, w, 13, { peso: 'bold', cor: BRANCO, max: 2, alt: 5.6 });
      texto(p.texto, x, 104, w - 4, 9.5, { cor: [200, 205, 213], alt: 4.6, max: 4 });
    });
    const a = inst.assinatura || {};
    texto([a.nome, a.cargo, a.site].filter(Boolean).join('  ·  '), M, H - 20, W - M * 2, 9.5, { cor: [200, 205, 213] });
  }

  const slug = (conta?.nome || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_');
  const nome = `Proposta_${proposta.numero}${proposta.versao > 1 ? `_v${proposta.versao}` : ''}_${slug}.pdf`;
  doc.save(nome);
  return nome;
};
