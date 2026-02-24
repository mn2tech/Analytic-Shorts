-- AAI Studio run artifacts (profiles, semantic graph, blocks, scene graph)
-- Stored as JSONB for flexibility while the schema evolves.

create extension if not exists pgcrypto;

create table if not exists public.aai_studio_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  source_config jsonb,
  canonical_metadata jsonb,
  dataset_profile jsonb,
  semantic_graph jsonb,
  analysis_plan jsonb,
  insight_blocks jsonb,
  scene_graph jsonb
);

-- Optional: speed up sorting by recency
create index if not exists aai_studio_runs_created_at_idx on public.aai_studio_runs (created_at desc);

