-- Limite da conta (cheque especial / conta garantida). Saldo negativo = uso do limite.
alter table public.bancos add column if not exists limite numeric(14,2) not null default 0;
alter table public.bancos drop constraint if exists bancos_limite_check;
alter table public.bancos add constraint bancos_limite_check check (limite >= 0);
