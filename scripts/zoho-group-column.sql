-- scripts/zoho-group-column.sql
-- Add Zoho CRM visibility toggle to groups table

ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS show_zoho_crm boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.groups.show_zoho_crm IS 'Whether to show Zoho CRM revenue section on dashboard for this group';
