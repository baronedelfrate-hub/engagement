-- Módulos por empresa: quais grupos do menu cada empresa usa.
-- modulos_ativos nulo = todos os módulos (empresas atuais seguem como estão); lista = só esses (Cadastros é sempre do núcleo).
alter table empresas add column if not exists modulos_ativos text[];

-- Criade: sem Vendas, CRM, Projetos, Consultoria F5, BPO E5 e Estoque
update empresas
set modulos_ativos = array['cadastros','financeiro','fiscal','contabilidade','rh','controladoria','custos','compras']
where cnpj = '27776248000103';

-- Só o superadmin (ou o próprio banco, sem usuário logado) pode mudar os módulos de uma empresa.
-- Sem isto, o admin de uma empresa poderia ligar módulos por conta própria editando o cadastro da empresa.
create or replace function public.empresas_proteger_modulos()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.modulos_ativos is distinct from old.modulos_ativos
     and auth.uid() is not null
     and not coalesce(public.is_superadmin(), false) then
    raise exception 'Somente o superadmin pode alterar os módulos da empresa.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists empresas_proteger_modulos on empresas;
create trigger empresas_proteger_modulos
  before update on empresas
  for each row execute function public.empresas_proteger_modulos();

revoke execute on function public.empresas_proteger_modulos() from public, anon, authenticated;

notify pgrst, 'reload schema';
