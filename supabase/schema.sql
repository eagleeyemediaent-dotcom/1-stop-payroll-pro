create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  company_name text default '1 Stop Turnover Specialist LLC',
  created_at timestamptz default now()
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  active boolean default true,
  paid boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.pay_weeks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_label text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  pay_week_id uuid not null references public.pay_weeks(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  day_name text not null check (day_name in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  location text,
  work_done text,
  pay_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists public.adjustments (
  id uuid primary key default gen_random_uuid(),
  pay_week_id uuid not null references public.pay_weeks(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  label text,
  amount numeric(10,2) default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.pay_weeks enable row level security;
alter table public.work_entries enable row level security;
alter table public.adjustments enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users manage own workers" on public.workers;
drop policy if exists "Users manage own pay weeks" on public.pay_weeks;
drop policy if exists "Users manage own work entries" on public.work_entries;
drop policy if exists "Users manage own adjustments" on public.adjustments;

create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users manage own workers"
  on public.workers for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users manage own pay weeks"
  on public.pay_weeks for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users manage own work entries"
  on public.work_entries for all
  using (exists (select 1 from public.pay_weeks pw where pw.id = work_entries.pay_week_id and pw.owner_id = auth.uid()))
  with check (exists (select 1 from public.pay_weeks pw where pw.id = work_entries.pay_week_id and pw.owner_id = auth.uid()));

create policy "Users manage own adjustments"
  on public.adjustments for all
  using (exists (select 1 from public.pay_weeks pw where pw.id = adjustments.pay_week_id and pw.owner_id = auth.uid()))
  with check (exists (select 1 from public.pay_weeks pw where pw.id = adjustments.pay_week_id and pw.owner_id = auth.uid()));
