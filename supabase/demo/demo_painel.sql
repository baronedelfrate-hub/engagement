-- Dados de DEMONSTRAÇÃO para a tela inicial da empresa ENGAGEMENT SOLUÇÕES (nada aqui é real).
-- Datas relativas a hoje, para o painel sempre parecer vivo. Para apagar: supabase/demo/limpar_demo.sql
do $$
declare
  emp uuid := 'f8a9b65b-8be1-448d-821b-324c3803be46';
  usr uuid; b uuid; hoje date := current_date; mes0 date := date_trunc('month', current_date)::date;
  c_rec uuid; c_mao uuid; c_fer uuid; c_adm uuid; c_est uuid; c_ger uuid; c_fin uuid;
  cl1 uuid; cl2 uuid; cl3 uuid; cl4 uuid; f1 uuid; f2 uuid; f3 uuid; sv1 uuid; sv2 uuid; sv3 uuid;
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; a5 uuid; a6 uuid; q uuid; col1 uuid; col2 uuid; col3 uuid; col4 uuid; ped uuid; ct uuid; t uuid; i int;
begin
  if exists (select 1 from bancos where company_id = emp and nome like '[DEMO]%') then raise exception 'Os dados de demonstração já foram carregados. Rode limpar_demo.sql antes de carregar de novo.'; end if;
  select id into usr from auth.users where email = 'esteladelfrate@gmail.com';

  -- plano de contas mínimo (os códigos seguem a DRE gerencial)
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '1.1', '[DEMO] Receita Operacional Bruta', 'receita_bruta') returning id into c_rec;
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '3.1', '[DEMO] Mão de Obra Direta', 'custo_mao_obra') returning id into c_mao;
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '3.2', '[DEMO] Ferramentas Operacionais', 'custo_ferramentas') returning id into c_fer;
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '5.1', '[DEMO] Despesas Administrativas', 'desp_administrativas') returning id into c_adm;
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '5.3', '[DEMO] Estrutura / Infraestrutura', 'desp_estrutura') returning id into c_est;
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '5.4', '[DEMO] Despesas Gerais', 'desp_gerais') returning id into c_ger;
  insert into categorias (company_id, codigo, nome, grupo_dre) values (emp, '7.2', '[DEMO] Despesas financeiras', 'desp_financeira') returning id into c_fin;
  insert into bancos (company_id, nome) values (emp, '[DEMO] Banco Exemplo') returning id into b;

  -- cadastros
  insert into clientes (company_id, nome, status) values (emp, '[DEMO] Clínica Aurora', 'ativo') returning id into cl1;
  insert into clientes (company_id, nome, status) values (emp, '[DEMO] Studio Bela', 'ativo') returning id into cl2;
  insert into clientes (company_id, nome, status) values (emp, '[DEMO] Grupo Nova', 'ativo') returning id into cl3;
  insert into clientes (company_id, nome, status) values (emp, '[DEMO] Padaria Central', 'ativo') returning id into cl4;
  insert into fornecedores (company_id, nome) values (emp, '[DEMO] Imobiliária Centro') returning id into f1;
  insert into fornecedores (company_id, nome) values (emp, '[DEMO] Software e Licenças Ltda') returning id into f2;
  insert into fornecedores (company_id, nome) values (emp, '[DEMO] Contabilidade Exemplo') returning id into f3;
  insert into servicos (company_id, nome, preco, status, ativo, tipo) values (emp, '[DEMO] BPO E5 Essencial', 2800, 'ativo', true, 'servico') returning id into sv1;
  insert into servicos (company_id, nome, preco, status, ativo, tipo) values (emp, '[DEMO] BPO E5 Básico', 1900, 'ativo', true, 'servico') returning id into sv2;
  insert into servicos (company_id, nome, preco, status, ativo, tipo) values (emp, '[DEMO] Consultoria F5', 5200, 'ativo', true, 'servico') returning id into sv3;

  -- extrato dos últimos 6 meses (receitas crescendo, despesas estáveis), com saldo corrido a partir de R$ 50.000
  with receitas(dia, descricao, base, cliente) as (values
        (5, 'Honorários Clínica Aurora', 22000, '[DEMO] Clínica Aurora'), (12, 'Projeto Studio Bela', 15500, '[DEMO] Studio Bela'), (20, 'Consultoria Grupo Nova', 11000, '[DEMO] Grupo Nova')),
       despesas(dia, descricao, valor, cat) as (values
        (6, 'Folha de pagamento', -21000, c_mao), (8, 'Ferramentas e licenças', -3100, c_fer), (10, 'Contabilidade e administrativo', -2400, c_adm),
        (15, 'Aluguel e condomínio', -4800, c_est), (22, 'Despesas gerais', -1700, c_ger), (25, 'Tarifas e juros', -380, c_fin)),
       meses(m) as (select generate_series(-5, 0)),
       linhas as (
         select (mes0 + (m || ' months')::interval)::date + (least(r.dia, case when m = 0 then extract(day from hoje)::int else 28 end) - 1) as data,
                r.descricao, round((r.base * (0.80 + 0.07 * (m + 5)))::numeric, 2) as valor, c_rec as cat, r.cliente, 1 as ordem
         from meses join receitas r on true
         union all
         select (mes0 + (m || ' months')::interval)::date + (least(d.dia, case when m = 0 then extract(day from hoje)::int else 28 end) - 1), d.descricao, d.valor::numeric, d.cat, null, 2
         from meses join despesas d on true),
       ord as (select *, sum(valor) over (order by data, ordem, descricao) as acum from linhas)
  insert into extrato_bancario (company_id, banco_id, data_transacao, descricao, valor, saldo_anterior, saldo_posterior, tipo_transacao, categoria_id, cliente_nome, classificacao_origem)
  select emp, b, data, descricao, valor, 50000 + acum - valor, 50000 + acum, case when valor >= 0 then 'credito' else 'debito' end, cat, cliente, 'manual' from ord;

  -- títulos em aberto: vencidos, de hoje, da semana e do mês que vem
  insert into movimentacao_financeira (company_id, tipo, numero_titulo, valor_total, data_vencimento, data_emissao, fornecedor_id, status, provisao) values
    (emp, 'pagar', 'DEMO-P001', 1850, hoje - 6, hoje - 30, f2, 'vencido', false),
    (emp, 'pagar', 'DEMO-P002', 3200, hoje - 2, hoje - 28, f3, 'vencido', false),
    (emp, 'pagar', 'DEMO-P003', 4200, hoje, hoje - 20, f1, 'pendente', false),
    (emp, 'pagar', 'DEMO-P004', 780, hoje, hoje - 15, f2, 'pendente', false),
    (emp, 'pagar', 'DEMO-P005', 5600, hoje + 2, hoje - 10, f3, 'pendente', false),
    (emp, 'pagar', 'DEMO-P006', 1250, hoje + 4, hoje - 8, f2, 'pendente', false),
    (emp, 'pagar', 'DEMO-P007', 2900, hoje + 6, hoje - 5, f1, 'pendente', false),
    (emp, 'pagar', 'DEMO-P008', 8000, hoje + 20, hoje - 3, f1, 'pendente', false),
    (emp, 'receber', 'DEMO-R001', 6500, hoje - 4, hoje - 34, null, 'vencido', false),
    (emp, 'receber', 'DEMO-R002', 9000, hoje, hoje - 30, null, 'pendente', false),
    (emp, 'receber', 'DEMO-R003', 12000, hoje + 3, hoje - 27, null, 'pendente', false),
    (emp, 'receber', 'DEMO-R004', 4800, hoje + 5, hoje - 25, null, 'pendente', false),
    (emp, 'receber', 'DEMO-R005', 15000, hoje + 25, hoje - 5, null, 'pendente', false);
  update movimentacao_financeira set cliente_id = case numero_titulo when 'DEMO-R001' then cl4 when 'DEMO-R002' then cl1 when 'DEMO-R003' then cl3 when 'DEMO-R004' then cl2 else cl3 end where company_id = emp and numero_titulo like 'DEMO-R%';

  -- liquidados no mês (aparecem no "movimento do mês") e um pagamento parcial
  insert into movimentacao_financeira (company_id, tipo, numero_titulo, valor_total, data_vencimento, data_emissao, fornecedor_id, cliente_id, status, provisao) values
    (emp, 'receber', 'DEMO-R101', 22000, mes0 + 4, mes0 - 20, null, cl1, 'pago', false),
    (emp, 'receber', 'DEMO-R102', 15500, mes0 + 8, mes0 - 18, null, cl2, 'pago', false),
    (emp, 'pagar', 'DEMO-P101', 21000, mes0 + 5, mes0 - 10, f3, null, 'pago', false),
    (emp, 'pagar', 'DEMO-P102', 4800, mes0 + 9, mes0 - 8, f1, null, 'pago', false),
    (emp, 'pagar', 'DEMO-P103', 6000, hoje + 1, hoje - 12, f2, null, 'pago_parcial', false);
  insert into movimentacao_baixas (movimentacao_id, company_id, valor_baixa, data_baixa, banco_id)
  select id, emp, case numero_titulo when 'DEMO-P103' then 2000 else valor_total end, least(hoje, mes0 + 6), b from movimentacao_financeira where company_id = emp and numero_titulo in ('DEMO-R101', 'DEMO-R102', 'DEMO-P101', 'DEMO-P102', 'DEMO-P103');

  -- CRM: contas, funil, vendas ganhas e perdidas (este mês e o anterior) e propostas
  insert into crm_contas (company_id, nome, segmento, cidade, uf) values (emp, '[DEMO] Clínica Horizonte', 'Saúde', 'Indaiatuba', 'SP') returning id into a1;
  insert into crm_contas (company_id, nome, segmento, cidade, uf) values (emp, '[DEMO] Agência Pulso', 'Marketing', 'Campinas', 'SP') returning id into a2;
  insert into crm_contas (company_id, nome, segmento, cidade, uf) values (emp, '[DEMO] Escritório Vega', 'Advocacia', 'Sorocaba', 'SP') returning id into a3;
  insert into crm_contas (company_id, nome, segmento, cidade, uf) values (emp, '[DEMO] Loja Alvorada', 'Varejo', 'Indaiatuba', 'SP') returning id into a4;
  insert into crm_contas (company_id, nome, segmento, cidade, uf) values (emp, '[DEMO] Construtora Pilar', 'Construção', 'Campinas', 'SP') returning id into a5;
  insert into crm_contas (company_id, nome, segmento, cidade, uf) values (emp, '[DEMO] Restaurante Sabor', 'Alimentação', 'Salto', 'SP') returning id into a6;
  insert into crm_oportunidades (company_id, conta_id, titulo, etapa, valor, probabilidade, servico, previsao_fechamento, ganho_em, perdido_em, motivo_perda) values
    (emp, a1, '[DEMO] BPO Financeiro — Clínica Horizonte', 'lead', 2800, 10, 'bpo', hoje + 40, null, null, null),
    (emp, a2, '[DEMO] BPO Financeiro — Agência Pulso', 'contato', 4000, 20, 'bpo', hoje + 30, null, null, null),
    (emp, a3, '[DEMO] Consultoria F5 — Escritório Vega', 'reuniao', 15000, 40, 'consultoria', hoje + 21, null, null, null),
    (emp, a4, '[DEMO] BPO Financeiro — Loja Alvorada', 'proposta', 2800, 60, 'bpo', hoje + 10, null, null, null),
    (emp, a5, '[DEMO] BPO Financeiro — Construtora Pilar', 'negociacao', 7000, 80, 'bpo', hoje + 5, null, null, null),
    (emp, a6, '[DEMO] BPO Financeiro — Restaurante Sabor', 'proposta', 1900, 60, 'bpo', hoje - 3, null, null, null),
    (emp, a1, '[DEMO] BPO Essencial — Clínica Aurora', 'ganho', 2800, 100, 'bpo', null, greatest(mes0, hoje - 10), null, null),
    (emp, a2, '[DEMO] Consultoria F5 — Studio Bela', 'ganho', 5200, 100, 'consultoria', null, greatest(mes0, hoje - 4), null, null),
    (emp, a3, '[DEMO] BPO Básico — Padaria Central', 'ganho', 1900, 100, 'bpo', null, (mes0 - 12), null, null),
    (emp, a4, '[DEMO] BPO Profissional — Grupo Nova', 'ganho', 4000, 100, 'bpo', null, (mes0 - 20), null, null),
    (emp, a5, '[DEMO] Consultoria F5 — Oficina Rota', 'ganho', 7000, 100, 'consultoria', null, (mes0 - 45), null, null),
    (emp, a6, '[DEMO] BPO — Mercado Bairro', 'perdido', 2800, 0, 'bpo', null, null, greatest(mes0, hoje - 8), 'Optou por manter o financeiro interno'),
    (emp, a1, '[DEMO] Consultoria — Studio Sol', 'perdido', 6000, 0, 'consultoria', null, null, greatest(mes0, hoje - 2), 'Preço acima do orçamento'),
    (emp, a2, '[DEMO] BPO — Casa Verde', 'perdido', 1900, 0, 'bpo', null, null, (mes0 - 8), 'Sem retorno do cliente');
  insert into crm_propostas (company_id, conta_id, numero, versao, titulo, status, data_emissao, valor_total, enviada_em, aceita_em) values
    (emp, a4, 'PRP-DEMO-1', 1, 'BPO Financeiro — Loja Alvorada', 'enviada', hoje - 5, 2800, now() - interval '5 days', null),
    (emp, a6, 'PRP-DEMO-2', 1, 'BPO Financeiro — Restaurante Sabor', 'enviada', hoje - 12, 1900, now() - interval '12 days', null),
    (emp, a5, 'PRP-DEMO-3', 1, 'BPO Financeiro — Construtora Pilar', 'enviada', hoje - 2, 7000, now() - interval '2 days', null),
    (emp, a1, 'PRP-DEMO-4', 1, 'BPO Essencial — Clínica Aurora', 'aceita', hoje - 12, 2800, now() - interval '12 days', now() - interval '10 days'),
    (emp, a2, 'PRP-DEMO-5', 1, 'Consultoria F5 — Studio Bela', 'aceita', hoje - 6, 5200, now() - interval '6 days', now() - interval '4 days');

  -- contratos recorrentes (receita recorrente)
  insert into contratos_recorrentes (company_id, cliente_id, numero, titulo, data_inicio) values (emp, cl1, 'CT-DEMO-1', 'BPO E5 Essencial — Clínica Aurora', mes0 - 90) returning id into ct;
  insert into contratos_recorrentes_itens (company_id, contrato_id, servico_id, descricao, quantidade, preco_unitario) values (emp, ct, sv1, '[DEMO] BPO E5 Essencial', 1, 2800);
  insert into contratos_recorrentes (company_id, cliente_id, numero, titulo, data_inicio) values (emp, cl4, 'CT-DEMO-2', 'BPO E5 Básico — Padaria Central', mes0 - 60) returning id into ct;
  insert into contratos_recorrentes_itens (company_id, contrato_id, servico_id, descricao, quantidade, preco_unitario) values (emp, ct, sv2, '[DEMO] BPO E5 Básico', 1, 1900);
  insert into contratos_recorrentes (company_id, cliente_id, numero, titulo, data_inicio) values (emp, cl3, 'CT-DEMO-3', 'BPO E5 Essencial — Grupo Nova', mes0 - 30) returning id into ct;
  insert into contratos_recorrentes_itens (company_id, contrato_id, servico_id, descricao, quantidade, preco_unitario) values (emp, ct, sv1, '[DEMO] BPO E5 Essencial', 1, 2800);

  -- faturamento: pedidos confirmados neste mês e no anterior
  for i in 1..5 loop
    insert into pedidos_venda (company_id, numero, cliente_id, data_pedido, data_emissao, status_pedido, valor_total, tipo_frete, valor_frete, numero_parcelas, empresa_id, endereco_entrega_mesmo_cliente)
    values (emp, 'PV-DEMO-' || i,
            (array[cl1, cl3, cl4, cl1, cl2])[i],
            case when i <= 3 then greatest(mes0, hoje - (i * 3)) else mes0 - (i * 4) end,
            case when i <= 3 then greatest(mes0, hoje - (i * 3)) else mes0 - (i * 4) end,
            'confirmed', (array[2800, 2800, 1900, 2800, 5200])[i], 'SEM_FRETE', 0, 1, emp, true) returning id into ped;
    insert into pedidos_venda_itens (company_id, pedido_id, tipo_item, servico_id, descricao, quantidade, preco_unitario, desconto, acrescimo, valor_total)
    values (emp, ped, 'servico', (array[sv1, sv1, sv2, sv1, sv3])[i], 'Serviço de demonstração', 1, (array[2800, 2800, 1900, 2800, 5200])[i], 0, 0, (array[2800, 2800, 1900, 2800, 5200])[i]);
  end loop;

  -- tarefas
  insert into tarefas_quadros (company_id, nome, descricao, cor, created_by) values (emp, '[DEMO] Operação', 'Quadro de demonstração', '#FE6102', usr) returning id into q;
  insert into tarefas_colunas (company_id, quadro_id, nome, ordem, concluida) values (emp, q, 'A fazer', 1, false) returning id into col1;
  insert into tarefas_colunas (company_id, quadro_id, nome, ordem, concluida) values (emp, q, 'Em andamento', 2, false) returning id into col2;
  insert into tarefas_colunas (company_id, quadro_id, nome, ordem, concluida) values (emp, q, 'Aguardando', 3, false) returning id into col3;
  insert into tarefas_colunas (company_id, quadro_id, nome, ordem, concluida) values (emp, q, 'Concluído', 4, true) returning id into col4;
  insert into tarefas_cartoes (company_id, quadro_id, coluna_id, titulo, descricao, responsavel_id, prazo, prioridade, ordem, checklist, concluido_em, created_by) values
    (emp, q, col1, 'Liberar pagamento da folha', 'Conferir valores e liberar no banco', usr, hoje - 3, 'urgente', 1000, '[{"texto":"Conferir folha","feito":true},{"texto":"Liberar no banco","feito":false}]'::jsonb, null, usr),
    (emp, q, col1, 'Enviar relatório mensal ao cliente', null, usr, hoje - 1, 'alta', 2000, '[]'::jsonb, null, usr),
    (emp, q, col1, 'Reunião de alinhamento com a contabilidade', null, usr, hoje, 'media', 3000, '[]'::jsonb, null, usr),
    (emp, q, col2, 'Conciliar o extrato do mês', 'Banco Exemplo', usr, hoje + 2, 'alta', 1000, '[{"texto":"Importar extrato","feito":true},{"texto":"Classificar lançamentos","feito":true},{"texto":"Fechar divergências","feito":false}]'::jsonb, null, usr),
    (emp, q, col2, 'Montar proposta para a Construtora Pilar', null, usr, hoje + 5, 'media', 2000, '[]'::jsonb, null, usr),
    (emp, q, col3, 'Aguardar retorno do contador sobre o regime tributário', null, usr, hoje + 9, 'baixa', 1000, '[]'::jsonb, null, usr),
    (emp, q, col3, 'Receber documentos do cliente Padaria Central', null, usr, hoje + 3, 'media', 2000, '[]'::jsonb, null, usr),
    (emp, q, col4, 'Emitir notas do mês', null, usr, hoje - 5, 'media', 1000, '[]'::jsonb, now() - interval '4 days', usr),
    (emp, q, col4, 'Atualizar plano de contas', null, usr, hoje - 8, 'baixa', 2000, '[]'::jsonb, now() - interval '7 days', usr);

  -- agenda
  insert into agenda_eventos (company_id, titulo, tipo, data_inicio, hora_inicio, hora_fim, local, responsavel_id, created_by) values
    (emp, '[DEMO] Reunião de resultados com Clínica Aurora', 'reuniao', hoje, '15:00', '16:00', 'Online', usr, usr),
    (emp, '[DEMO] Gravação de conteúdo institucional', 'gravacao', hoje + 1, '09:30', '12:00', 'Estúdio Centro', usr, usr),
    (emp, '[DEMO] Visita ao cliente — implantação', 'compromisso', hoje + 3, '14:00', '17:00', 'Indaiatuba', usr, usr),
    (emp, '[DEMO] Evento de empreendedorismo', 'evento', hoje + 6, '19:00', '22:00', 'Campinas', usr, usr),
    (emp, '[DEMO] Viagem a São Paulo — reunião com parceiro', 'viagem', hoje + 9, '08:00', '18:00', 'São Paulo', usr, usr),
    (emp, '[DEMO] Fechamento do mês com a contabilidade', 'reuniao', hoje + 12, '10:00', '11:00', 'Online', usr, usr);
end $$;
