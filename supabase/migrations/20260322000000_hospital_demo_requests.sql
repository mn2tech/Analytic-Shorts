create table if not exists public.hospital_demo_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null,
  organization text not null,
  role text not null,
  demo_focus text null,
  source text not null default 'hospital-demo-request-page',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hospital_demo_requests_created_at
  on public.hospital_demo_requests (created_at desc);

create index if not exists idx_hospital_demo_requests_work_email
  on public.hospital_demo_requests (work_email);

alter table public.hospital_demo_requests enable row level security;

