-- Add RLS policy so family members can view items belonging to receipts of their families
begin;

-- Create additional SELECT policy on items to allow family members to view items of family receipts
create policy if not exists "Family members can view items of family receipts"
on public.items
for select
using (
  exists (
    select 1 from public.receipts r
    where r.id::text = items.receipt_id::text
      and r.family_id is not null
      and r.family_id = any(public.get_user_family_ids(auth.uid()))
  )
);

commit;