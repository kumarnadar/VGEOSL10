-- zoho-measure-mapping.sql
-- Sets zoho_field_mapping on the 10 scorecard measures that correspond to Zoho metrics
-- (5 in the US Team section, 5 in the India Team section).
--
-- Mapping:
--   'Contacts Created'         -> 'zoho:contacts'
--   'First Time Meetings'      -> 'zoho:firstTimeMeetings'
--   'New Potentials Created'   -> 'zoho:newPotentials'
--   'Proposals Delivered (#)'  -> 'zoho:proposalsCount'
--   'Proposals Delivered ($)'  -> 'zoho:proposalsValue'
--
-- Run once in Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
    v_us_section_id    uuid;
    v_india_section_id uuid;
BEGIN
    -- Resolve section IDs by name
    SELECT id INTO v_us_section_id
    FROM   scorecard_sections
    WHERE  name = 'US Team'
    LIMIT  1;

    SELECT id INTO v_india_section_id
    FROM   scorecard_sections
    WHERE  name = 'India Team'
    LIMIT  1;

    IF v_us_section_id IS NULL THEN
        RAISE EXCEPTION 'Section "US Team" not found in scorecard_sections.';
    END IF;

    IF v_india_section_id IS NULL THEN
        RAISE EXCEPTION 'Section "India Team" not found in scorecard_sections.';
    END IF;

    -- US Team mappings
    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:contacts'
    WHERE  section_id = v_us_section_id AND name = 'Contacts Created';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:firstTimeMeetings'
    WHERE  section_id = v_us_section_id AND name = 'First Time Meetings';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:newPotentials'
    WHERE  section_id = v_us_section_id AND name = 'New Potentials Created';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:proposalsCount'
    WHERE  section_id = v_us_section_id AND name = 'Proposals Delivered (#)';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:proposalsValue'
    WHERE  section_id = v_us_section_id AND name = 'Proposals Delivered ($)';

    -- India Team mappings
    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:contacts'
    WHERE  section_id = v_india_section_id AND name = 'Contacts Created';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:firstTimeMeetings'
    WHERE  section_id = v_india_section_id AND name = 'First Time Meetings';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:newPotentials'
    WHERE  section_id = v_india_section_id AND name = 'New Potentials Created';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:proposalsCount'
    WHERE  section_id = v_india_section_id AND name = 'Proposals Delivered (#)';

    UPDATE scorecard_measures
    SET    zoho_field_mapping = 'zoho:proposalsValue'
    WHERE  section_id = v_india_section_id AND name = 'Proposals Delivered ($)';

END;
$$;

COMMIT;
