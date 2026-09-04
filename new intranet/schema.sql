-- =============================================================================
-- JACHINS Intranet — Supabase schema
-- Run this ONCE in your Supabase project's SQL Editor (Dashboard -> SQL Editor
-- -> New query -> paste this whole file -> Run).
--
-- What this does:
--   1. Creates the `employees` profile table, linked to Supabase Auth users.
--   2. Creates `risk_reports`, `requisitions`, `assets` for the three modules.
--   3. Creates a race-safe reference-number generator (RISK-2026-0001 etc.)
--      — the Postgres equivalent of the file-locked counter the old PHP
--      version used, but using a row lock instead of flock().
--   4. Enables Row Level Security everywhere and adds the policies that
--      actually enforce who can read/write what — this is the REAL access
--      control; the redirects in auth.js are just UX on top of it.
--   5. Creates a private Storage bucket for risk-report attachments with
--      matching policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EMPLOYEES (profile table — passwords live only in Supabase Auth, never here)
-- -----------------------------------------------------------------------------
create table if not exists employees (
   id               bigint generated always as identity primary key,
   auth_user_id     uuid unique references auth.users(id) on delete cascade,
   employee_id      text unique not null,
   email            text unique not null,
   full_name        text not null,
   department       text,
   job_title        text,
   phone            text,
   role             text not null default 'employee' check (role in ('admin', 'employee')),
   created_at       timestamptz not null default now()
);

-- SECURITY DEFINER function to check admin status without RLS recursion.
-- (A normal policy that queries `employees` from within an `employees`
-- policy would recurse infinitely — this function runs with definer
-- privileges specifically to break that cycle, and does nothing else.)
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
   select exists (
      select 1 from employees where auth_user_id = auth.uid() and role = 'admin'
   );
$$;

alter table employees enable row level security;

-- Every authenticated employee can read the full directory (needed for
-- employees.html) — but never anything auth-related, because there isn't
-- anything auth-related in this table to read.
create policy "employees_select_all_authenticated"
   on employees for select
   to authenticated
   using (true);

-- Only admins can create/edit/remove profile rows.
create policy "employees_admin_insert"
   on employees for insert
   to authenticated
   with check (is_admin());

create policy "employees_admin_update"
   on employees for update
   to authenticated
   using (is_admin());

create policy "employees_admin_delete"
   on employees for delete
   to authenticated
   using (is_admin());


-- -----------------------------------------------------------------------------
-- 2. Reference number generator (RISK-2026-0001, REQ-2026-0001, ...)
-- -----------------------------------------------------------------------------
create table if not exists reference_counters (
   prefix      text not null,
   year        int not null,
   next_value  int not null default 1,
   primary key (prefix, year)
);

-- Atomic upsert-and-increment: Postgres guarantees this INSERT ... ON
-- CONFLICT is atomic under concurrent calls, so two employees submitting
-- at the same instant still get different numbers — no explicit locking
-- needed, unlike the flock() version this replaces.
create or replace function next_reference(p_prefix text)
returns text
language plpgsql
as $$
declare
   v_year int := extract(year from now());
   v_value int;
begin
   insert into reference_counters (prefix, year, next_value)
   values (p_prefix, v_year, 2)
   on conflict (prefix, year)
   do update set next_value = reference_counters.next_value + 1
   returning next_value - 1 into v_value;

   return p_prefix || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. RISK REPORTS
-- -----------------------------------------------------------------------------
create table if not exists risk_reports (
   id                        bigint generated always as identity primary key,
   reference                 text unique not null,
   report_type               text not null,
   date_of_report            date not null,
   location                  text not null,
   department                text not null,
   risk_category             text not null,
   description               text not null,
   potential_consequence     text,
   corrective_action         text,
   severity                  text not null,
   likelihood                text not null,
   comments                  text,
   attachment_path           text,
   status                    text not null default 'Submitted',
   submitted_by_id           uuid not null references auth.users(id),
   submitted_by_name         text not null,
   submitted_by_department   text,
   submitted_at              timestamptz not null default now()
);

create or replace function set_risk_report_reference()
returns trigger language plpgsql as $$
begin
   new.reference := next_reference('RISK');
   return new;
end;
$$;

drop trigger if exists trg_risk_report_reference on risk_reports;
create trigger trg_risk_report_reference
   before insert on risk_reports
   for each row execute function set_risk_report_reference();

alter table risk_reports enable row level security;

create policy "risk_reports_insert_own"
   on risk_reports for insert
   to authenticated
   with check (submitted_by_id = auth.uid());

create policy "risk_reports_select_own_or_admin"
   on risk_reports for select
   to authenticated
   using (submitted_by_id = auth.uid() or is_admin());

create policy "risk_reports_admin_update"
   on risk_reports for update
   to authenticated
   using (is_admin());


-- -----------------------------------------------------------------------------
-- 4. REQUISITIONS
-- -----------------------------------------------------------------------------
create table if not exists requisitions (
   id                          bigint generated always as identity primary key,
   reference                   text unique not null,
   item_category               text not null,
   item_name                   text not null,
   description                 text,
   quantity                    int not null check (quantity > 0),
   unit                        text not null,
   required_date               date not null,
   reason                      text not null,
   priority                    text not null default 'Normal',
   comments                    text,
   status                      text not null default 'Submitted',
   requested_by_id             uuid not null references auth.users(id),
   requested_by_name           text not null,
   requested_by_department     text,
   submitted_at                timestamptz not null default now()
);

create or replace function set_requisition_reference()
returns trigger language plpgsql as $$
begin
   new.reference := next_reference('REQ');
   return new;
end;
$$;

drop trigger if exists trg_requisition_reference on requisitions;
create trigger trg_requisition_reference
   before insert on requisitions
   for each row execute function set_requisition_reference();

alter table requisitions enable row level security;

create policy "requisitions_insert_own"
   on requisitions for insert
   to authenticated
   with check (requested_by_id = auth.uid());

create policy "requisitions_select_own_or_admin"
   on requisitions for select
   to authenticated
   using (requested_by_id = auth.uid() or is_admin());

create policy "requisitions_admin_update"
   on requisitions for update
   to authenticated
   using (is_admin());


-- -----------------------------------------------------------------------------
-- 5. ASSETS (read-only for ordinary employees, per spec)
-- -----------------------------------------------------------------------------
create table if not exists assets (
   id                        bigint generated always as identity primary key,
   asset_id                  text unique not null,
   name                      text not null,
   description               text,
   category                  text not null,
   type                      text,
   serial_number             text,
   location                  text,
   assigned_to               uuid references auth.users(id),
   assigned_to_name          text,
   department                text,
   condition                 text,
   status                    text not null default 'Available',
   purchase_date             date,
   date_assigned             date,
   last_maintenance_date     date,
   notes                     text
);

alter table assets enable row level security;

create policy "assets_select_all_authenticated"
   on assets for select
   to authenticated
   using (true);

create policy "assets_admin_write"
   on assets for insert
   to authenticated
   with check (is_admin());

create policy "assets_admin_update"
   on assets for update
   to authenticated
   using (is_admin());

create policy "assets_admin_delete"
   on assets for delete
   to authenticated
   using (is_admin());


-- -----------------------------------------------------------------------------
-- 6. STORAGE — risk report attachments (private bucket)
-- -----------------------------------------------------------------------------
-- Run this part, then also check Storage -> risk-report-attachments in the
-- dashboard and confirm "Public bucket" is OFF (private).
insert into storage.buckets (id, name, public)
values ('risk-report-attachments', 'risk-report-attachments', false)
on conflict (id) do nothing;

-- Files are uploaded as {auth_user_id}/{timestamp}.ext (see risk-report.html)
-- — these policies check that the first path segment matches the caller's
-- own auth.uid(), so an employee can only write into (and read from) their
-- own folder. Admins can read everything, for reviewing reports.
create policy "risk_attachments_insert_own_folder"
   on storage.objects for insert
   to authenticated
   with check (
      bucket_id = 'risk-report-attachments'
      and (storage.foldername(name))[1] = auth.uid()::text
   );

create policy "risk_attachments_select_own_or_admin"
   on storage.objects for select
   to authenticated
   using (
      bucket_id = 'risk-report-attachments'
      and ((storage.foldername(name))[1] = auth.uid()::text or is_admin())
   );


-- -----------------------------------------------------------------------------
-- Done. Next: create your employee logins in Authentication -> Users, then
-- insert matching rows into `employees` (see README.md "Setup Guide" for
-- the exact steps and an example INSERT).
-- -----------------------------------------------------------------------------
