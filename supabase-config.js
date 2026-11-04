-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- Fixes saving when your login email differs from the one first set up.
-- Both spellings are allowed. Delete one from each list below if you prefer.
 
drop policy if exists "Owner can insert portfolio" on public.portfolio;
drop policy if exists "Owner can update portfolio" on public.portfolio;
drop policy if exists "Owner can upload images" on storage.objects;
drop policy if exists "Owner can delete images" on storage.objects;
 
create policy "Owner can insert portfolio" on public.portfolio
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') in ('ignacioprecious1019@gmail.com', 'preciousignacio1019@gmail.com'));
 
create policy "Owner can update portfolio" on public.portfolio
  for update to authenticated
  using ((auth.jwt() ->> 'email') in ('ignacioprecious1019@gmail.com', 'preciousignacio1019@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('ignacioprecious1019@gmail.com', 'preciousignacio1019@gmail.com'));
 
create policy "Owner can upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') in ('ignacioprecious1019@gmail.com', 'preciousignacio1019@gmail.com'));
 
create policy "Owner can delete images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio-images'
    and (auth.jwt() ->> 'email') in ('ignacioprecious1019@gmail.com', 'preciousignacio1019@gmail.com'));
 
