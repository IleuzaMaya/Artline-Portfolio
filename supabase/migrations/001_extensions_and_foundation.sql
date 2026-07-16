-- ============================================================
-- ARTLINE BUSINESS ENGINE
-- Migration 001 — Extensions and Organizational Foundation
-- ============================================================
--
-- Objetivos:
--   1. Habilitar extensões fundamentais.
--   2. Criar funções utilitárias compartilhadas.
--   3. Criar a fundação multiempresa.
--   4. Criar empresas, unidades e configurações.
--   5. Preparar segurança por RLS desde o nascimento.
--
-- Esta migration NÃO cria usuários, clientes ou permissões.
-- Esses contextos serão adicionados nas migrations seguintes.
-- ============================================================

begin;

-- ============================================================
-- 1. EXTENSÕES
-- ============================================================

create schema if not exists extensions;

create extension if not exists pgcrypto
with schema extensions;

create extension if not exists citext
with schema extensions;

-- ============================================================
-- 2. FUNÇÕES UTILITÁRIAS
-- ============================================================

-- Atualiza automaticamente a coluna updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
'Atualiza automaticamente updated_at antes de uma alteração.';

-- ============================================================
-- 3. EMPRESAS
-- ============================================================

create table if not exists public.org_empresas (
  id uuid primary key default gen_random_uuid(),

  razao_social text,
  nome_fantasia text not null,

  documento text,
  slug extensions.citext not null,

  email extensions.citext,
  telefone text,

  timezone text not null default 'America/Sao_Paulo',
  moeda character(3) not null default 'BRL',
  locale text not null default 'pt-BR',

  ativo boolean not null default true,
  is_deleted boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint org_empresas_slug_not_blank
    check (length(trim(slug::text)) > 0),

  constraint org_empresas_nome_not_blank
    check (length(trim(nome_fantasia)) > 0),

  constraint org_empresas_moeda_format
    check (moeda ~ '^[A-Z]{3}$'),

  constraint org_empresas_deleted_consistency
    check (
      (is_deleted = false and deleted_at is null)
      or
      (is_deleted = true and deleted_at is not null)
    )
);

create unique index if not exists uq_org_empresas_slug
  on public.org_empresas (slug);

create unique index if not exists uq_org_empresas_documento
  on public.org_empresas (documento)
  where documento is not null
    and is_deleted = false;

create index if not exists idx_org_empresas_ativas
  on public.org_empresas (ativo)
  where is_deleted = false;

drop trigger if exists trg_org_empresas_updated_at
  on public.org_empresas;

create trigger trg_org_empresas_updated_at
before update on public.org_empresas
for each row
execute function public.set_updated_at();

comment on table public.org_empresas is
'Empresas ou moldurarias que utilizam o Artline Business Engine.';

comment on column public.org_empresas.slug is
'Identificador legível e único da empresa dentro do ABE.';

comment on column public.org_empresas.metadata is
'Informações auxiliares que não justificam colunas estruturadas.';

-- ============================================================
-- 4. UNIDADES
-- ============================================================

create table if not exists public.org_unidades (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null
    references public.org_empresas(id)
    on update cascade
    on delete restrict,

  nome text not null,
  codigo extensions.citext not null,

  tipo text not null default 'loja',

  principal boolean not null default false,
  ativo boolean not null default true,
  is_deleted boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint org_unidades_nome_not_blank
    check (length(trim(nome)) > 0),

  constraint org_unidades_codigo_not_blank
    check (length(trim(codigo::text)) > 0),

  constraint org_unidades_tipo_check
    check (
      tipo in (
        'loja',
        'oficina',
        'filial',
        'centro_producao',
        'administrativo',
        'outro'
      )
    ),

  constraint org_unidades_deleted_consistency
    check (
      (is_deleted = false and deleted_at is null)
      or
      (is_deleted = true and deleted_at is not null)
    )
);

create unique index if not exists uq_org_unidades_empresa_codigo
  on public.org_unidades (empresa_id, codigo);

-- Somente uma unidade principal ativa por empresa.
create unique index if not exists uq_org_unidades_principal
  on public.org_unidades (empresa_id)
  where principal = true
    and ativo = true
    and is_deleted = false;

create index if not exists idx_org_unidades_empresa
  on public.org_unidades (empresa_id);

create index if not exists idx_org_unidades_ativas
  on public.org_unidades (empresa_id, ativo)
  where is_deleted = false;

drop trigger if exists trg_org_unidades_updated_at
  on public.org_unidades;

create trigger trg_org_unidades_updated_at
before update on public.org_unidades
for each row
execute function public.set_updated_at();

comment on table public.org_unidades is
'Lojas, oficinas, filiais ou centros produtivos pertencentes a uma empresa.';

-- ============================================================
-- 5. CONFIGURAÇÕES POR EMPRESA
-- ============================================================

create table if not exists public.org_configuracoes (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null
    references public.org_empresas(id)
    on update cascade
    on delete cascade,

  chave extensions.citext not null,
  valor_json jsonb not null default '{}'::jsonb,

  descricao text,
  editavel boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint org_configuracoes_chave_not_blank
    check (length(trim(chave::text)) > 0)
);

create unique index if not exists uq_org_configuracoes_empresa_chave
  on public.org_configuracoes (empresa_id, chave);

create index if not exists idx_org_configuracoes_empresa
  on public.org_configuracoes (empresa_id);

drop trigger if exists trg_org_configuracoes_updated_at
  on public.org_configuracoes;

create trigger trg_org_configuracoes_updated_at
before update on public.org_configuracoes
for each row
execute function public.set_updated_at();

comment on table public.org_configuracoes is
'Configurações específicas de cada empresa do ABE.';

comment on column public.org_configuracoes.valor_json is
'Valor tipado em JSON para configurações simples ou estruturadas.';

-- ============================================================
-- 6. CONFIGURAÇÕES INICIAIS RECOMENDADAS
-- ============================================================
--
-- Estas configurações serão inseridas depois da criação de cada
-- empresa, por seed ou função de provisionamento.
--
-- Exemplos:
--
-- orcamento.validade_dias            = 15
-- orcamento.exige_revisao_preco      = true
-- orcamento.permite_preco_expirado   = false
-- precificacao.markup_padrao         = 0
-- precificacao.arredondamento        = 0.01
-- producao.prazo_padrao_dias         = 10
-- sistema.timezone                   = America/Sao_Paulo
--
-- A validade não será fixa no código.
-- Cada empresa poderá configurá-la.

-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================
--
-- O RLS é habilitado desde a criação.
-- As policies serão adicionadas depois da criação das tabelas
-- de identidade e acesso.
--
-- Até lá, apenas postgres e service_role terão acesso direto.
-- ============================================================

alter table public.org_empresas
  enable row level security;

alter table public.org_unidades
  enable row level security;

alter table public.org_configuracoes
  enable row level security;

-- Impede que o proprietário da tabela ignore acidentalmente o RLS.
alter table public.org_empresas
  force row level security;

alter table public.org_unidades
  force row level security;

alter table public.org_configuracoes
  force row level security;

commit;
