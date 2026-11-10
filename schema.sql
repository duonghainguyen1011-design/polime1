-- Polime: run this once in your Supabase project (SQL Editor > New query > Run).
-- One row per game room. The whole game state lives in `state`; `version` makes every move a safe compare-and-swap.

create table if not exists public.rooms (
  code        text primary key,
  state       jsonb       not null,
  version     integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.rooms enable row level security;

-- Anyone with the room link can read and play. There are no accounts, so keep room codes private to your group.
drop policy if exists "rooms are readable" on public.rooms;
create policy "rooms are readable" on public.rooms for select using (true);

drop policy if exists "anyone can open a room" on public.rooms;
create policy "anyone can open a room" on public.rooms for insert with check (true);

drop policy if exists "players can update rooms" on public.rooms;
create policy "players can update rooms" on public.rooms for update using (true) with check (true);

grant select, insert, update on public.rooms to anon, authenticated;

-- Push every change to connected phones in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

-- Optional housekeeping: delete rooms nobody has touched for 30 days.
-- delete from public.rooms where updated_at < now() - interval '30 days';
