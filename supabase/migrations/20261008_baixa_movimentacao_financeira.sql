alter table movimentacao_baixas
  add column if not exists valor_juros numeric not null default 0,
  add column if not exists valor_desconto numeric not null default 0,
  add column if not exists categoria_id uuid references categorias(id) on delete set null,
  add column if not exists subcategoria_id uuid references subcategorias(id) on delete set null,
  add column if not exists centro_custo_id uuid references centros_custo(id) on delete set null,
  add column if not exists status_conciliacao text not null default 'Não Conciliado',
  add column if not exists data_conciliacao date,
  add column if not exists extrato_bancario_id uuid references extrato_bancario(id) on delete set null;
notify pgrst, 'reload schema';
