-- ============================================================
-- scorecard-leadgen-calculated.sql
-- Adds 3 calculated percentage measures to Lead Generation section:
--   Reply Rate = Emails Replied To / Emails Sent
--   Connect Rate = Connects / Calls Made
--   Conversion Rate = Number of Lead Conversions / Qualified Leads
--
-- Run in Supabase SQL Editor AFTER scorecard-seed.sql
-- Date: 2026-02-26
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_leadgen_section_id uuid;
  v_max_order int;
BEGIN

  -- Find the Lead Generation section
  SELECT s.id INTO v_leadgen_section_id
  FROM scorecard_sections s
  JOIN scorecard_templates t ON t.id = s.template_id
  WHERE s.name = 'Lead Generation'
    AND t.is_active = true
  LIMIT 1;

  IF v_leadgen_section_id IS NULL THEN
    RAISE EXCEPTION 'Lead Generation section not found';
  END IF;

  -- Get current max display_order in this section
  SELECT COALESCE(MAX(display_order), 0) INTO v_max_order
  FROM scorecard_measures
  WHERE section_id = v_leadgen_section_id;

  -- Insert calculated percentage measures
  INSERT INTO scorecard_measures (section_id, name, display_order, data_type, is_calculated, calculation_formula)
  VALUES
    (v_leadgen_section_id, 'Reply Rate', v_max_order + 1, 'percentage', true,
     '{"type": "ratio", "numerator": "Emails Replied To", "denominator": "Emails Sent"}'::jsonb),
    (v_leadgen_section_id, 'Connect Rate', v_max_order + 2, 'percentage', true,
     '{"type": "ratio", "numerator": "Connects", "denominator": "Calls Made"}'::jsonb),
    (v_leadgen_section_id, 'Conversion Rate', v_max_order + 3, 'percentage', true,
     '{"type": "ratio", "numerator": "Number of Lead Conversions", "denominator": "Qualified Leads"}'::jsonb);

  RAISE NOTICE 'Added 3 calculated percentage measures to Lead Generation section %', v_leadgen_section_id;

END $$;

COMMIT;
