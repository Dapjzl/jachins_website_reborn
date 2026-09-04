-- JACHINS Intranet: Supabase SQL schema
-- 1) employees table
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  employee_id text unique not null,
  name text not null,
  email text unique not null,
  department text,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional trigger to keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists employees_touch_updated_at on public.employees;
create trigger employees_touch_updated_at
before update on public.employees
for each row
execute function public.touch_updated_at();

-- 2) RLS enablement
alter table public.employees enable row level security;

-- 3) Policies
create policy "Employees can read their own profile"
on public.employees for select
using (
  auth.uid() = auth_user_id
);

create policy "Admins can read all employee profiles"
on public.employees for select
using (
  exists (
    select 1 from public.employees e
    where e.auth_user_id = auth.uid() and e.role = 'admin'
  )
);

create policy "Users can update their own profile"
on public.employees for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Admins can update any profile"
on public.employees for update
using (
  exists (
    select 1 from public.employees e
    where e.auth_user_id = auth.uid() and e.role = 'admin'
  )
);

create policy "Admins can insert employee rows"
on public.employees for insert
with check (
  exists (
    select 1 from public.employees e
    where e.auth_user_id = auth.uid() and e.role = 'admin'
  )
);

-- 4) Helpful index
create index if not exists idx_employees_auth_user_id on public.employees(auth_user_id);
create index if not exists idx_employees_email on public.employees(email);

-- 5) Optional view for simple profile lookup (not required for front-end)
create or replace view public.employee_profile as
select e.*
from public.employees e;

-- 6) Admin check helper (avoids recursive RLS on employees)
create or replace function public.is_intranet_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees
    where auth_user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_intranet_admin() from public;
grant execute on function public.is_intranet_admin() to authenticated;

-- 7) Login helper: map employee_id -> email without exposing the table to anon
create or replace function public.lookup_employee_login_email(p_employee_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select e.email
    into v_email
  from public.employees e
  where e.employee_id = p_employee_id
    and e.status = 'active'
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.lookup_employee_login_email(text) from public;
grant execute on function public.lookup_employee_login_email(text) to anon, authenticated;

-- 8) Recreate policies without recursive employees subqueries
drop policy if exists "Employees can read their own profile" on public.employees;
drop policy if exists "Employees can view their own profile" on public.employees;
drop policy if exists "Admins can read all employee profiles" on public.employees;
drop policy if exists "Users can update their own profile" on public.employees;
drop policy if exists "Admins can update any profile" on public.employees;
drop policy if exists "Admins can insert employee rows" on public.employees;

create policy "Employees can view their own profile"
on public.employees
for select
to authenticated
using (auth.uid() = auth_user_id);

create policy "Admins can read all employee profiles"
on public.employees
for select
to authenticated
using (public.is_intranet_admin());

create policy "Users can update their own profile"
on public.employees
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Admins can update any profile"
on public.employees
for update
to authenticated
using (public.is_intranet_admin())
with check (public.is_intranet_admin());

create policy "Admins can insert employee rows"
on public.employees
for insert
to authenticated
with check (public.is_intranet_admin());
