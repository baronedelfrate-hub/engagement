-- Contratos recorrentes: opcao de faturar no proprio mes da competencia e dias de 1 a 31 (31 = ultimo dia do mes).
alter table public.contratos_recorrentes add column if not exists faturar_no_mes boolean not null default false;
alter table public.contratos_recorrentes drop constraint if exists contratos_recorrentes_dia_faturamento_check;
alter table public.contratos_recorrentes drop constraint if exists contratos_recorrentes_dia_vencimento_check;
alter table public.contratos_recorrentes add constraint contratos_recorrentes_dia_faturamento_check check (dia_faturamento >= 1 and dia_faturamento <= 31);
alter table public.contratos_recorrentes add constraint contratos_recorrentes_dia_vencimento_check check (dia_vencimento >= 1 and dia_vencimento <= 31);
