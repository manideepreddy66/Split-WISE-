-- =========================================================================
-- SplitX Database Schema & RLS Policies
-- Execute this script in your Supabase SQL Editor.
-- =========================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  expense_id text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Groups Table
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Group Members Table
create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (group_id, profile_id)
);

-- 4. Expenses Table
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  notes text,
  paid_by uuid references public.profiles(id) on delete set null not null,
  split_type text not null check (split_type in ('equal', 'exact', 'percentage')),
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Expense Splits Table
create table public.expense_splits (
  id uuid default gen_random_uuid() primary key,
  expense_id uuid references public.expenses(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  unique (expense_id, profile_id)
);

-- 6. Settlements Table
create table public.settlements (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  payee_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================================
-- Helper Functions & Triggers
-- =========================================================================

-- Function: Generate Unique Expense ID (SPX-XXXXXX where X is uppercase alphanumeric)
create or replace function public.generate_unique_expense_id()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  new_id text;
  id_exists boolean;
  i integer;
begin
  loop
    new_id := 'SPX-';
    for i in 1..6 loop
      new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    
    select exists(select 1 from public.profiles where expense_id = new_id) into id_exists;
    if not id_exists then
      return new_id;
    end if;
  end loop;
end;
$$ language plpgsql security definer;

-- Trigger Function: Automatic Profile Creation on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, expense_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    new.email,
    public.generate_unique_expense_id()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger Execution
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper Function: Check Group Membership
create or replace function public.is_group_member(group_id uuid)
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.group_members
    where group_members.group_id = is_group_member.group_id
      and group_members.profile_id = auth.uid()
  );
end;
$$ language plpgsql;

-- =========================================================================
-- Row Level Security (RLS) Policies
-- =========================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- 1. Profiles Table Policies
create policy "Allow select to authenticated users for searching"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Allow update to own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- 2. Groups Table Policies
create policy "Allow select if user is a member of the group"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

create policy "Allow insert to authenticated users"
  on public.groups for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Allow update if user is a member"
  on public.groups for update
  to authenticated
  using (public.is_group_member(id));

-- 3. Group Members Table Policies
create policy "Allow select members if user is a member"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "Allow inserting group members"
  on public.group_members for insert
  to authenticated
  with check (
    -- Allow users to add themselves when creating the group (or if they are already a member adding others)
    not exists (select 1 from public.group_members where group_id = group_members.group_id)
    or public.is_group_member(group_id)
  );

create policy "Allow deleting group members"
  on public.group_members for delete
  to authenticated
  using (
    -- Group members can delete other members or leave themselves
    public.is_group_member(group_id)
  );

-- 4. Expenses Table Policies
create policy "Allow select expenses if user is a member"
  on public.expenses for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "Allow insert expenses if user is a member"
  on public.expenses for insert
  to authenticated
  with check (public.is_group_member(group_id));

create policy "Allow update expenses if user is a member"
  on public.expenses for update
  to authenticated
  using (public.is_group_member(group_id));

create policy "Allow delete expenses if user is a member"
  on public.expenses for delete
  to authenticated
  using (public.is_group_member(group_id));

-- 5. Expense Splits Table Policies
create policy "Allow select splits if user is a member"
  on public.expense_splits for select
  to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_group_member(expenses.group_id)
    )
  );

create policy "Allow insert splits if user is a member"
  on public.expense_splits for insert
  to authenticated
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_group_member(expenses.group_id)
    )
  );

create policy "Allow update splits if user is a member"
  on public.expense_splits for update
  to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_group_member(expenses.group_id)
    )
  );

create policy "Allow delete splits if user is a member"
  on public.expense_splits for delete
  to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
        and public.is_group_member(expenses.group_id)
    )
  );

-- 6. Settlements Table Policies
create policy "Allow select settlements if user is a member"
  on public.settlements for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "Allow insert settlements if user is a member"
  on public.settlements for insert
  to authenticated
  with check (public.is_group_member(group_id));

create policy "Allow update settlements if user is a member"
  on public.settlements for update
  to authenticated
  using (public.is_group_member(group_id));

create policy "Allow delete settlements if user is a member"
  on public.settlements for delete
  to authenticated
  using (public.is_group_member(group_id));

-- =========================================================================
-- Storage Bucket & Storage Policies
-- =========================================================================

-- Enable Storage (Bucket creation in SQL Editor is done using supabase API but we add policy rules here)
-- Note: Create the "receipts" bucket in your Supabase dashboard first!

create policy "Allow authenticated users to upload receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts' 
    and (
      case 
        when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_group_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  );

create policy "Allow authenticated users to select receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts' 
    and (
      case 
        when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_group_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  );

create policy "Allow authenticated users to delete receipts"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'receipts' 
    and (
      case 
        when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then public.is_group_member((storage.foldername(name))[1]::uuid)
        else false
      end
    )
  );
