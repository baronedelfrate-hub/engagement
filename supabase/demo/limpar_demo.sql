-- Apaga os dados de demonstração da empresa ENGAGEMENT SOLUÇÕES (tudo que o script demo_painel.sql criou).
-- Cada registro de demonstração tem "[DEMO]" no nome ou prefixo DEMO/PV-DEMO/CT-DEMO/PRP-DEMO no número.
do $$
declare emp uuid := 'f8a9b65b-8be1-448d-821b-324c3803be46';
begin
  delete from tarefas_quadros where company_id = emp and nome like '[DEMO]%';
  delete from agenda_eventos where company_id = emp and titulo like '[DEMO]%';
  delete from pedidos_venda_itens where pedido_id in (select id from pedidos_venda where company_id = emp and numero like 'PV-DEMO-%');
  delete from pedidos_venda where company_id = emp and numero like 'PV-DEMO-%';
  delete from contratos_recorrentes where company_id = emp and numero like 'CT-DEMO-%';
  delete from crm_propostas where company_id = emp and numero like 'PRP-DEMO-%';
  delete from crm_contas where company_id = emp and nome like '[DEMO]%';
  delete from movimentacao_baixas where movimentacao_id in (select id from movimentacao_financeira where company_id = emp and numero_titulo like 'DEMO-%');
  delete from movimentacao_financeira where company_id = emp and numero_titulo like 'DEMO-%';
  delete from extrato_bancario where banco_id in (select id from bancos where company_id = emp and nome like '[DEMO]%');
  delete from bancos where company_id = emp and nome like '[DEMO]%';
  delete from subcategorias where company_id = emp and nome like '[DEMO]%';
  delete from categorias where company_id = emp and nome like '[DEMO]%';
  delete from clientes where company_id = emp and nome like '[DEMO]%';
  delete from fornecedores where company_id = emp and nome like '[DEMO]%';
  delete from servicos where company_id = emp and nome like '[DEMO]%';
end $$;
