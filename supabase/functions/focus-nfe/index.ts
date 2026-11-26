import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Integração Focus NFe por empresa: cada empresa guarda o próprio token de homologação e de produção (tabela focus_nfe_config,
// sem acesso pelo navegador) e escolhe o ambiente em uso. Corpo: { acao, empresa_id? (só superadmin), ... }
// Ações: config_get | config_save | testar | emitir | consultar | cancelar | sincronizar | manifestar | baixar | arquivo
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const URLS: Record<string, string> = { homologacao: 'https://homologacao.focusnfe.com.br', producao: 'https://api.focusnfe.com.br' };
const SO_NUM = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const ROTA_EMISSAO: Record<string, string> = { nfse: 'nfse', nfsen: 'nfsen', nfe: 'nfe' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);
    const { data: { user } } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Não autenticado.' }, 401);
    const { data: perfil } = await admin.from('profiles').select('role, company_id').eq('id', user.id).single();
    if (!perfil || !['admin', 'user', 'superadmin'].includes(perfil.role)) return json({ error: 'Perfil sem acesso.' }, 403);

    const b = await req.json();
    const empresa: string | null = perfil.role === 'superadmin' && b.empresa_id ? String(b.empresa_id) : (perfil.company_id ?? null);
    if (!empresa) return json({ error: 'Empresa não identificada.' }, 400);
    const ehAdmin = ['admin', 'superadmin'].includes(perfil.role);

    const { data: cfg } = await admin.from('focus_nfe_config').select('*').eq('company_id', empresa).maybeSingle();
    const resumo = (c: Record<string, unknown> | null) => c ? {
      ambiente: c.ambiente, cnpj: c.cnpj, tipo_nfse: c.tipo_nfse, codigo_opcao_simples: c.codigo_opcao_simples, regime_especial: c.regime_especial,
      token_homologacao_configurado: !!c.token_homologacao, token_producao_configurado: !!c.token_producao,
      ultima_sincronizacao: c.ultima_sincronizacao, status_conexao: c.status_conexao,
    } : { ambiente: 'homologacao', cnpj: null, tipo_nfse: 'nacional', codigo_opcao_simples: 1, regime_especial: 0, token_homologacao_configurado: false, token_producao_configurado: false, ultima_sincronizacao: null, status_conexao: null };

    if (b.acao === 'config_get') return json({ success: true, config: resumo(cfg) });

    if (b.acao === 'config_save') {
      if (!ehAdmin) return json({ error: 'Somente o administrador altera a integração.' }, 403);
      const reg: Record<string, unknown> = { company_id: empresa, updated_at: new Date().toISOString() };
      if (['homologacao', 'producao'].includes(b.ambiente)) reg.ambiente = b.ambiente;
      if (['nacional', 'municipal'].includes(b.tipo_nfse)) reg.tipo_nfse = b.tipo_nfse;
      if ([1, 2, 3].includes(Number(b.codigo_opcao_simples))) reg.codigo_opcao_simples = Number(b.codigo_opcao_simples);
      if (b.regime_especial !== undefined && [0, 1, 2, 3, 4, 5, 6, 9].includes(Number(b.regime_especial))) reg.regime_especial = Number(b.regime_especial);
      if (b.cnpj !== undefined) reg.cnpj = SO_NUM(b.cnpj) || null;
      // token em branco = manter o atual; "__limpar__" = apagar
      for (const k of ['token_homologacao', 'token_producao']) {
        const v = b[k];
        if (typeof v === 'string' && v.trim()) reg[k] = v.trim() === '__limpar__' ? null : v.trim();
      }
      const { data, error } = await admin.from('focus_nfe_config').upsert(reg, { onConflict: 'company_id' }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ success: true, config: resumo(data) });
    }

    if (!cfg) return json({ error: 'A Focus NFe ainda não foi configurada para esta empresa (Parâmetros Fiscais > Integradores).' }, 400);
    const ambiente = cfg.ambiente as string;
    const token = ambiente === 'producao' ? cfg.token_producao : cfg.token_homologacao;
    if (!token) return json({ error: `Falta o token de ${ambiente === 'producao' ? 'produção' : 'homologação'} desta empresa.` }, 400);
    const base = URLS[ambiente];
    const auth = 'Basic ' + btoa(`${token}:`);
    const chamar = async (metodo: string, caminho: string, corpo?: unknown) => {
      const r = await fetch(`${base}${caminho}`, { method: metodo, headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
      const texto = await r.text();
      let dados: any = null; try { dados = JSON.parse(texto); } catch { dados = { texto }; }
      return { r, dados, total: r.headers.get('X-Total-Count'), maxVersao: r.headers.get('X-Max-Version') };
    };
    const msgErro = (x: { r: Response; dados: any }) => x.dados?.mensagem || x.dados?.message || x.dados?.erros?.[0]?.mensagem || `A Focus NFe respondeu ${x.r.status}`;

    if (b.acao === 'testar') {
      const cnpj = SO_NUM(cfg.cnpj);
      if (!cnpj) return json({ error: 'Informe o CNPJ da empresa antes de testar.' }, 400);
      const x = await chamar('GET', `/v2/nfes_recebidas?cnpj=${cnpj}&versao=0`);
      const ok = x.r.status < 300;
      const status = ok ? `Conectado (${ambiente === 'producao' ? 'produção' : 'homologação'})` : (x.r.status === 401 || x.r.status === 403 ? 'Token inválido' : `Erro ${x.r.status}`);
      await admin.from('focus_nfe_config').update({ status_conexao: status }).eq('company_id', empresa);
      return json({ success: ok, status, detalhe: ok ? null : msgErro(x) });
    }

    if (b.acao === 'emitir') {
      const tipo = String(b.tipo); if (!ROTA_EMISSAO[tipo]) return json({ error: 'Tipo inválido.' }, 400);
      const ref = String(b.ref || `e${Date.now()}`).replace(/[^A-Za-z0-9]/g, '');
      const x = await chamar('POST', `/v2/${ROTA_EMISSAO[tipo]}?ref=${ref}`, b.payload);
      const status = x.dados?.status ?? (x.r.ok ? 'processando_autorizacao' : 'erro');
      await admin.from('focus_nfe_emissoes').upsert({ company_id: empresa, tipo, ref, ambiente, status, mensagem: x.r.ok ? null : msgErro(x), nota_origem_id: b.nota_origem_id ?? null, payload: b.payload, resposta: x.dados, updated_at: new Date().toISOString() }, { onConflict: 'company_id,ref' });
      return x.r.ok ? json({ success: true, ref, status, resposta: x.dados }) : json({ error: msgErro(x), ref, resposta: x.dados }, 400);
    }

    if (b.acao === 'consultar' || b.acao === 'cancelar') {
      const tipo = String(b.tipo); if (!ROTA_EMISSAO[tipo]) return json({ error: 'Tipo inválido.' }, 400);
      const ref = String(b.ref || '').replace(/[^A-Za-z0-9]/g, ''); if (!ref) return json({ error: 'ref obrigatório.' }, 400);
      const x = b.acao === 'cancelar'
        ? await chamar('DELETE', `/v2/${ROTA_EMISSAO[tipo]}/${ref}`, { justificativa: b.justificativa })
        : await chamar('GET', `/v2/${ROTA_EMISSAO[tipo]}/${ref}`);
      const d = x.dados || {};
      const atual: Record<string, unknown> = { status: d.status ?? (b.acao === 'cancelar' && x.r.ok ? 'cancelado' : undefined), updated_at: new Date().toISOString(), resposta: d };
      const num = d.numero ?? d.numero_nfse; if (num) atual.numero = String(num);
      const chave = d.chave_nfe ?? d.chave_nfse ?? d.chave; if (chave) atual.chave = String(chave);
      const xml = d.caminho_xml_nota_fiscal ?? d.url_xml ?? d.caminho_xml; if (xml) atual.url_xml = xml.startsWith('http') ? xml : base + xml;
      const pdf = d.caminho_danfe ?? d.url_danfse ?? d.url ?? d.url_pdf; if (pdf) atual.url_pdf = String(pdf).startsWith('http') ? pdf : base + pdf;
      const err = d.mensagem_sefaz ?? d.erros?.[0]?.mensagem ?? (x.r.ok ? null : msgErro(x)); atual.mensagem = err;
      if (atual.status === undefined) delete atual.status;
      await admin.from('focus_nfe_emissoes').update(atual).eq('company_id', empresa).eq('ref', ref);
      return x.r.ok ? json({ success: true, ref, status: atual.status, numero: atual.numero ?? null, chave: atual.chave ?? null, url_xml: atual.url_xml ?? null, url_pdf: atual.url_pdf ?? null, data_emissao: d.data_emissao ?? null, mensagem: atual.mensagem ?? null, resposta: d }) : json({ error: msgErro(x), resposta: d }, 400);
    }

    if (b.acao === 'sincronizar') {
      const cnpj = SO_NUM(cfg.cnpj); if (!cnpj) return json({ error: 'Informe o CNPJ da empresa na integração.' }, 400);
      const tipo = b.tipo === 'nfsen' ? 'nfsen' : 'nfe';
      const rota = tipo === 'nfe' ? 'nfes_recebidas' : 'nfsens_recebidas';
      const campoVersao = tipo === 'nfe' ? 'versao_nfe_recebidas' : 'versao_nfsen_recebidas';
      let versao = Number(cfg[campoVersao]) || 0; let novas = 0;
      for (let pag = 0; pag < 20; pag++) {
        const x = await chamar('GET', `/v2/${rota}?cnpj=${cnpj}&versao=${versao}${tipo === 'nfsen' ? '&completa=1' : ''}`);
        if (!x.r.ok) return json({ error: msgErro(x), novas }, 400);
        const lista: any[] = Array.isArray(x.dados) ? x.dados : [];
        if (!lista.length) break;
        const linhas = lista.map((n) => ({
          company_id: empresa, tipo,
          chave: String(n.chave_nfe ?? n.chave ?? n.chave_nfse ?? ''),
          numero: n.numero != null ? String(n.numero) : null, serie: n.serie != null ? String(n.serie) : null,
          cnpj_emitente: SO_NUM(n.cnpj_emitente ?? n.documento_emitente ?? n.emitente?.cnpj) || null,
          nome_emitente: n.nome_emitente ?? n.nome_prestador ?? n.emitente?.razao_social ?? null,
          valor_total: n.valor_total != null ? Number(n.valor_total) : (n.valor_servicos != null ? Number(n.valor_servicos) : null),
          data_emissao: n.data_emissao ?? null, situacao: n.situacao ?? null,
          manifestacao: n.manifestacao_destinatario ?? n.tipo_ultimo_evento ?? null,
          versao: Number(n.versao) || null, dados: n, updated_at: new Date().toISOString(),
        })).filter((l) => l.chave);
        // a Focus devolve a mesma nota mais de uma vez (um item por evento): fica a de maior versão, senão o upsert falha
        const unicas = new Map<string, (typeof linhas)[number]>();
        for (const l of linhas) { const o = unicas.get(l.chave); if (!o || (Number(l.versao) || 0) >= (Number(o.versao) || 0)) unicas.set(l.chave, l); }
        linhas.length = 0; linhas.push(...unicas.values());
        if (!linhas.length) console.log('focus-nfe sincronizar: itens sem chave reconhecida', tipo, JSON.stringify(lista[0]).slice(0, 1800));
        if (linhas.length) { const { error: eUp } = await admin.from('focus_nfe_recebidas').upsert(linhas, { onConflict: 'company_id,chave' }); if (eUp) return json({ error: `Falha ao gravar as notas: ${eUp.message}`, novas }, 400); }
        novas += linhas.length;
        const maior = Math.max(...lista.map((n) => Number(n.versao) || 0), Number(x.maxVersao) || 0);
        if (maior <= versao) break;
        versao = maior;
        if (lista.length < 100) break;
      }
      await admin.from('focus_nfe_config').update({ [campoVersao]: versao, ultima_sincronizacao: new Date().toISOString() }).eq('company_id', empresa);
      return json({ success: true, novas, versao });
    }

    if (b.acao === 'manifestar') {
      const chave = SO_NUM(b.chave);
      if (!['ciencia', 'confirmacao', 'desconhecimento', 'nao_realizada'].includes(b.tipo)) return json({ error: 'Tipo de manifestação inválido.' }, 400);
      const x = await chamar('POST', `/v2/nfes_recebidas/${chave}/manifesto`, { tipo: b.tipo, justificativa: b.justificativa });
      if (!x.r.ok) return json({ error: msgErro(x), resposta: x.dados }, 400);
      await admin.from('focus_nfe_recebidas').update({ manifestacao: b.tipo, updated_at: new Date().toISOString() }).eq('company_id', empresa).eq('chave', chave);
      return json({ success: true, resposta: x.dados });
    }

    if (b.acao === 'baixar') {
      const chave = SO_NUM(b.chave); const rota = b.tipo === 'nfsen' ? 'nfsens_recebidas' : 'nfes_recebidas';
      if (b.formato === 'pdf') {
        // DANFe/DANFSe da nota recebida: a Focus responde 302 para o arquivo; o fetch segue o redirecionamento
        const r = await fetch(`${base}/v2/${rota}/${chave}.pdf`, { headers: { Authorization: auth }, redirect: 'follow' });
        if (!r.ok) return json({ success: false, error: `A Focus NFe não devolveu o PDF (${r.status}).` }, 400);
        const bytes = new Uint8Array(await r.arrayBuffer()); let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return json({ success: true, base64: btoa(bin), tipo: r.headers.get('content-type') ?? 'application/pdf' });
      }
      const r = await fetch(`${base}/v2/${rota}/${chave}.${b.formato === 'json' ? 'json' : 'xml'}`, { headers: { Authorization: auth } });
      return json({ success: r.ok, conteudo: await r.text() }, r.ok ? 200 : 400);
    }

    // Baixa o XML de uma nota emitida (url_xml devolvida pela Focus) para o navegador salvar como arquivo, em vez de abrir em outra aba.
    if (b.acao === 'arquivo') {
      let alvo = String(b.url ?? '');
      if (alvo.startsWith('/')) alvo = `${base}${alvo}`;
      let host = ''; try { host = new URL(alvo).hostname; } catch { return json({ error: 'Endereço do arquivo inválido.' }, 400); }
      const daFocus = /(^|\.)focusnfe\.com\.br$/.test(host);
      if (!daFocus && !/^focusnfe[a-z0-9.-]*\.amazonaws\.com$/.test(host) && !/^[a-z0-9-]*focusnfe[a-z0-9.-]*\.s3[a-z0-9.-]*\.amazonaws\.com$/.test(host)) return json({ error: 'Endereço do arquivo não permitido.' }, 400);
      const r = await fetch(alvo, { headers: daFocus ? { Authorization: auth } : {} });
      if (!r.ok) return json({ success: false, error: `A Focus NFe respondeu ${r.status}` }, 400);
      // em base64 para servir tanto o XML quanto o PDF
      const bytes = new Uint8Array(await r.arrayBuffer()); let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return json({ success: true, base64: btoa(bin), tipo: r.headers.get('content-type') ?? 'application/octet-stream' });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
