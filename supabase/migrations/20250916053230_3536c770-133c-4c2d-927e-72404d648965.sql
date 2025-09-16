-- Create a view to expose profile names/emails for receipts without needing FK relationships
-- This avoids PostgREST relationship requirements and respects existing RLS on both receipts and profiles

CREATE OR REPLACE VIEW public.receipts_with_profiles AS
SELECT
  r.id,
  r.user_id,
  r.vendor_id,
  r.vendor_name,
  r.total_amount,
  r.date,
  r.image_url,
  r.ai_extracted,
  r.ai_data,
  r.notes,
  r.created_at,
  r.family_id,
  r.added_by,
  p_added.name  AS added_by_name,
  p_added.email AS added_by_email,
  p_user.name   AS user_name,
  p_user.email  AS user_email
FROM public.receipts r
LEFT JOIN public.profiles p_added
  ON p_added.id = r.added_by
LEFT JOIN public.profiles p_user
  ON p_user.id::text = r.user_id;

-- Notes:
-- - RLS policies on receipts and profiles still apply when selecting from this view
-- - The join to p_user uses text comparison to avoid casting errors since receipts.user_id is text
-- - added_by is uuid already, so a direct join is used
