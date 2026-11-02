-- Complemento do endereco em clientes e fornecedores (empresas e funcionarios ja tinham).
alter table public.clientes add column if not exists complemento text;
alter table public.fornecedores add column if not exists complemento text;
