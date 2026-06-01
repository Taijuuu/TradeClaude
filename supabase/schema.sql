-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ACCOUNTS
-- ============================================================
create table accounts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  broker      text,
  type        text not null check (type in ('live', 'demo', 'prop')),
  balance     numeric(15, 2) not null default 0,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now()
);

alter table accounts enable row level security;
create policy "own" on accounts
  for all using (auth.uid() = user_id);

-- ============================================================
-- TAGS
-- ============================================================
create table tags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#7c3aed',
  category    text not null default 'custom'
              check (category in ('setup', 'mistake', 'condition', 'custom')),
  created_at  timestamptz not null default now()
);

alter table tags enable row level security;
create policy "own" on tags
  for all using (auth.uid() = user_id);

-- ============================================================
-- STRATEGIES
-- ============================================================
create table strategies (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  asset_class text,
  entry_rules text,
  exit_rules  text,
  risk_rules  text,
  checklist   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table strategies enable row level security;
create policy "own" on strategies
  for all using (auth.uid() = user_id);

-- ============================================================
-- TRADES
-- ============================================================
create table trades (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  account_id    uuid references accounts(id) on delete set null,
  symbol        text not null,
  side          text not null check (side in ('long', 'short')),
  status        text not null default 'closed'
                check (status in ('open', 'closed')),
  asset_class   text not null default 'forex'
                check (asset_class in ('forex', 'stocks', 'crypto', 'futures', 'options')),
  entry_date    timestamptz not null,
  exit_date     timestamptz,
  entry_price   numeric(20, 8) not null,
  exit_price    numeric(20, 8),
  quantity      numeric(20, 8) not null,
  stop_loss     numeric(20, 8),
  take_profit   numeric(20, 8),
  gross_pnl     numeric(15, 4),
  net_pnl       numeric(15, 4),
  commission    numeric(15, 4) not null default 0,
  r_multiple    numeric(10, 4),
  risk_amount   numeric(15, 4),
  rating        int check (rating >= 1 and rating <= 5),
  emotion       text check (emotion in (
                  'confident', 'fearful', 'impulsive',
                  'neutral', 'greedy', 'calm', 'anxious'
                )),
  notes         text,
  setup_notes   text,
  mistake_notes text,
  screenshots   text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table trades enable row level security;
create policy "own" on trades
  for all using (auth.uid() = user_id);

-- Trigger updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trades_updated_at
  before update on trades
  for each row execute function update_updated_at();

create trigger strategies_updated_at
  before update on strategies
  for each row execute function update_updated_at();

-- ============================================================
-- TRADE TAGS (pivot)
-- ============================================================
create table trade_tags (
  trade_id  uuid not null references trades(id) on delete cascade,
  tag_id    uuid not null references tags(id) on delete cascade,
  primary key (trade_id, tag_id)
);

alter table trade_tags enable row level security;
create policy "own" on trade_tags
  for all using (
    exists (
      select 1 from trades
      where trades.id = trade_tags.trade_id
        and trades.user_id = auth.uid()
    )
  );

-- ============================================================
-- TRADE STRATEGIES (pivot)
-- ============================================================
create table trade_strategies (
  trade_id    uuid not null references trades(id) on delete cascade,
  strategy_id uuid not null references strategies(id) on delete cascade,
  primary key (trade_id, strategy_id)
);

alter table trade_strategies enable row level security;
create policy "own" on trade_strategies
  for all using (
    exists (
      select 1 from trades
      where trades.id = trade_strategies.trade_id
        and trades.user_id = auth.uid()
    )
  );

-- ============================================================
-- NOTEBOOK ENTRIES
-- ============================================================
create table notebook_entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  content     text not null default '',
  type        text not null default 'custom'
              check (type in ('daily', 'weekly', 'plan', 'recap', 'custom')),
  trade_date  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table notebook_entries enable row level security;
create policy "own" on notebook_entries
  for all using (auth.uid() = user_id);

create trigger notebook_entries_updated_at
  before update on notebook_entries
  for each row execute function update_updated_at();

-- ============================================================
-- SETTINGS
-- ============================================================
create table settings (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key  text,
  default_commission numeric(10, 4) not null default 0,
  breakeven_range    numeric(10, 4) not null default 0,
  currency           text not null default 'USD',
  timezone           text not null default 'Europe/Paris',
  display_mode       text not null default 'dollar'
                     check (display_mode in ('dollar', 'percentage', 'r_multiple'))
);

alter table settings enable row level security;
create policy "own" on settings
  for all using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index trades_user_id_idx on trades(user_id);
create index trades_entry_date_idx on trades(entry_date);
create index trades_exit_date_idx on trades(exit_date);
create index trades_account_id_idx on trades(account_id);
create index notebook_entries_trade_date_idx on notebook_entries(trade_date);
create index notebook_entries_user_id_idx on notebook_entries(user_id);

-- ============================================================
-- STORAGE — bucket screenshots
-- ============================================================
-- Run this in Supabase dashboard or via API:
-- insert into storage.buckets (id, name, public)
-- values ('screenshots', 'screenshots', false);
--
-- Storage policy (in dashboard):
-- Allow authenticated users to upload to their own folder:
-- (storage.foldername(name))[1] = auth.uid()::text
