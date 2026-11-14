-- Make sure RLS is on
alter table tasks enable row level security;

-- Remove any old versions of the rules (safe if they don't exist)
drop policy if exists "Users can view their own tasks" on tasks;
drop policy if exists "Users can create their own tasks" on tasks;
drop policy if exists "Users can update their own tasks" on tasks;
drop policy if exists "Users can delete their own tasks" on tasks;

-- View: existing rows ──► using
create policy "Users can view their own tasks"
  on tasks for select
  to authenticated
  using (auth.uid() = user_id);

-- Create: new rows ──► with check
create policy "Users can create their own tasks"
  on tasks for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update: existing row AND the changed version ──► both
create policy "Users can update their own tasks"
  on tasks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: existing rows ──► using
create policy "Users can delete their own tasks"
  on tasks for delete
  to authenticated
  using (auth.uid() = user_id);