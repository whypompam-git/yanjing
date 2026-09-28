-- Yanjing (แต่งหน้า) booking system: packages get a duration, staff pick
-- the days they work, and bookings (customer- or admin-made) consume a
-- staff "slot" on that day — the app checks slot capacity in code, not
-- via a DB constraint, since it needs a friendly "fully booked" message.

alter table packages add column if not exists duration_minutes int not null default 60;

create table if not exists staff_schedule (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  work_date date not null,
  created_at timestamptz not null default now(),
  unique (staff_id, work_date)
);

alter table staff_schedule enable row level security;
create policy "open access - no auth yet" on staff_schedule for all using (true) with check (true);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  package_id uuid not null references packages(id),
  staff_id uuid references staff(id) on delete set null,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed', -- confirmed | cancelled
  source text not null default 'admin', -- admin | customer
  note text,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;
create policy "open access - no auth yet" on bookings for all using (true) with check (true);
