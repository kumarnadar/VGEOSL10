-- ============================================================
-- EOS L10 Platform - Demo Data Seed Script
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
-- Run each STEP separately if you get errors.
-- If a step fails, fix and re-run just that step.
-- ============================================================

-- ============================================
-- STEP 0: Clean up duplicate group
-- ============================================
DELETE FROM groups WHERE id = 'e10e25b5-0bf9-4edd-85b5-4f1d648f3e75';

-- ============================================
-- STEP 1: Create auth users with full_name in metadata
-- ============================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
VALUES
  ('b0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'shreeEOS@valueglobal.net', crypt('demo-password-not-used', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Shree Patel","email":"shreeEOS@valueglobal.net"}'::jsonb, now(), now(), ''),
  ('b0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'michaelEOS@valueglobal.net', crypt('demo-password-not-used', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Michael Torres","email":"michaelEOS@valueglobal.net"}'::jsonb, now(), now(), ''),
  ('b0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'jasonEOS@valueglobal.net', crypt('demo-password-not-used', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Jason Lee","email":"jasonEOS@valueglobal.net"}'::jsonb, now(), now(), ''),
  ('b0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'nirmitiEOS@valueglobal.net', crypt('demo-password-not-used', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Nirmiti Shah","email":"nirmitiEOS@valueglobal.net"}'::jsonb, now(), now(), '')
ON CONFLICT (id) DO NOTHING;

-- Identities (required for auth to work)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'shreeEOS@valueglobal.net', 'email', '{"sub":"b0000000-0000-0000-0000-000000000010","email":"shreeEOS@valueglobal.net"}'::jsonb, now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011', 'michaelEOS@valueglobal.net', 'email', '{"sub":"b0000000-0000-0000-0000-000000000011","email":"michaelEOS@valueglobal.net"}'::jsonb, now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012', 'jasonEOS@valueglobal.net', 'email', '{"sub":"b0000000-0000-0000-0000-000000000012","email":"jasonEOS@valueglobal.net"}'::jsonb, now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000013', 'nirmitiEOS@valueglobal.net', 'email', '{"sub":"b0000000-0000-0000-0000-000000000013","email":"nirmitiEOS@valueglobal.net"}'::jsonb, now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: Ensure profiles exist for ALL users
-- The trigger may have created them, so use ON CONFLICT
-- ============================================

-- Update Kumar with full name
UPDATE profiles SET full_name = 'Kumar Nadar', geography = 'US' WHERE id = '4a25d5ff-d9de-43ac-a010-a19f6919546c';

-- Upsert new user profiles
INSERT INTO profiles (id, email, full_name, role, geography, is_active)
VALUES
  ('b0000000-0000-0000-0000-000000000010', 'shreeEOS@valueglobal.net', 'Shree Patel', 'system_admin', 'US', true),
  ('b0000000-0000-0000-0000-000000000011', 'michaelEOS@valueglobal.net', 'Michael Torres', 'team_member', 'US', true),
  ('b0000000-0000-0000-0000-000000000012', 'jasonEOS@valueglobal.net', 'Jason Lee', 'team_member', 'US', true),
  ('b0000000-0000-0000-0000-000000000013', 'nirmitiEOS@valueglobal.net', 'Nirmiti Shah', 'team_member', 'India', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  geography = EXCLUDED.geography,
  is_active = EXCLUDED.is_active;

-- ============================================
-- STEP 3: Group memberships
-- ============================================
INSERT INTO group_members (group_id, user_id, role_in_group)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'admin'),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'admin'),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000012', 'member'),
  ('b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000013', 'member')
ON CONFLICT (group_id, user_id) DO NOTHING;

-- ============================================
-- STEP 4: Rocks for Q1 2026
-- ============================================

-- Kumar's Rocks
INSERT INTO rocks (id, title, quarter_id, group_id, owner_id, status, notes, is_archived)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Build a GTM strategy for AI solutions', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'on_track', 'Strategy to showcase agents vs AI Accelerators in service areas.', false),
  ('c0000000-0000-0000-0000-000000000002', 'Deploy 3 AI Agents on VG AI Transformations page', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'on_track', 'Voice Agent, Recruitment Agent, Chat-based Sales Outreach Agent.', false),
  ('c0000000-0000-0000-0000-000000000003', 'Business Development and Lead Generation with Offshore team', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'off_track', 'Build support for Staffing team and Lead Gen for AI/CIO/CTO outreach.', false),
  ('c0000000-0000-0000-0000-000000000004', 'Deployment of AI for Delivery teams', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'on_track', 'Build strategy by service area on AI enablement for DT, AMS, MS.', false)
ON CONFLICT (id) DO NOTHING;

-- Shree's Rocks
INSERT INTO rocks (id, title, quarter_id, group_id, owner_id, status, notes, is_archived)
VALUES
  ('c0000000-0000-0000-0000-000000000005', 'Prepare sales toolkit for Infocorvus/ROAD implementations', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'on_track', 'Sample project plans, joint presentations, sales material, reseller agreement.', false),
  ('c0000000-0000-0000-0000-000000000006', 'Prepare sales/operations toolkit for Quorum', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'on_track', 'Material for Quorum conversions, OGSys to ODA, lunch and learn.', false),
  ('c0000000-0000-0000-0000-000000000007', 'Determine Netsuite GTM strategy', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'on_track', 'Continue Netsuite evaluation, methodology, sales/marketing material.', false)
ON CONFLICT (id) DO NOTHING;

-- Michael's Rocks
INSERT INTO rocks (id, title, quarter_id, group_id, owner_id, status, notes, is_archived)
VALUES
  ('c0000000-0000-0000-0000-000000000008', 'Execute plan for Quorum Qnections 2026 (April 7-9)', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'on_track', 'Sponsorship, pre-show outreach, swag, booth design, landing page.', false),
  ('c0000000-0000-0000-0000-000000000009', 'Strengthen Partner relationships for 5 new opportunities', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 'on_track', 'Grow Quorum, Teric, fractional CIO firms. ID new partners.', false)
ON CONFLICT (id) DO NOTHING;

-- Jason's Rock
INSERT INTO rocks (id, title, quarter_id, group_id, owner_id, status, notes, is_archived)
VALUES
  ('c0000000-0000-0000-0000-000000000010', 'Define campaigns and execute outreach', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000012', 'on_track', 'Supply Chain/Manufacturing with Oracle, Netsuite. Alliance cadence.', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 5: Milestones
-- ============================================

-- Rock 1: GTM strategy for AI (Kumar)
INSERT INTO milestones (rock_id, title, due_date, status, collaborators_text, notes, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Brainstorm accelerators positioning by Service areas (DT/AMS/AI)', '2026-02-28', 'done', 'Kumar', NULL, 0),
  ('c0000000-0000-0000-0000-000000000001', 'Design and approve content by Service areas with MPs', '2026-02-28', 'wip', 'Kumar, Sai', 'Kumar to meet with Sai to figure out', 1),
  ('c0000000-0000-0000-0000-000000000001', 'Deploy content in collateral', '2026-02-28', 'wip', NULL, NULL, 2);

-- Rock 2: Deploy 3 AI Agents (Kumar)
INSERT INTO milestones (rock_id, title, due_date, status, collaborators_text, notes, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000002', 'Voice Agent for outreach with dashboard', '2026-02-28', 'wip', 'R&D - Sameer', 'Voice agent complete; Dashboard WIP', 0),
  ('c0000000-0000-0000-0000-000000000002', 'Recruitment agent for efficiency showcase', '2026-02-28', 'wip', 'R&D - Sameer', 'Bhaskar working on it', 1),
  ('c0000000-0000-0000-0000-000000000002', 'Chat-based sales outreach agent with dashboard', '2026-02-28', 'wip', 'R&D - Sameer', 'Project to RTC; continue on demo', 2),
  ('c0000000-0000-0000-0000-000000000002', 'Shree to demo AI agents to customers and Vistage', '2026-02-14', 'not_started', 'Shree', 'Shree to meet with Kumar', 3),
  ('c0000000-0000-0000-0000-000000000002', 'Build Website and Landing pages for agents', '2026-02-28', 'wip', 'Digital Mkt team', 'Dev completed - Kumar to approve', 4),
  ('c0000000-0000-0000-0000-000000000002', 'Build content strategy for each agent', '2026-02-28', 'wip', NULL, NULL, 5),
  ('c0000000-0000-0000-0000-000000000002', 'Approve and deploy agent landing page', '2026-02-28', 'not_started', NULL, NULL, 6),
  ('c0000000-0000-0000-0000-000000000002', 'Each agent to have video/demo page and CTA', '2026-02-28', 'not_started', NULL, NULL, 7);

-- Rock 3: BDev Lead Gen (Kumar)
INSERT INTO milestones (rock_id, title, due_date, status, collaborators_text, notes, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000003', 'Draft staffing team methodology', '2026-01-26', 'delayed', 'Kumar', 'Delayed, not yet started', 0),
  ('c0000000-0000-0000-0000-000000000003', 'Meet with Jason and Michael on AI utilization', '2026-01-29', 'not_started', 'Michael, Jason', NULL, 1),
  ('c0000000-0000-0000-0000-000000000003', 'Build Lead Gen team for AI/CIO/CTO outreach', '2026-02-15', 'wip', 'Michael, Jason, Nirmiti', NULL, 2);

-- Rock 5: Infocorvus/ROAD toolkit (Shree)
INSERT INTO milestones (rock_id, title, due_date, status, collaborators_text, notes, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000005', 'Create sample project plan for Archiving', '2026-02-15', 'wip', 'Prasad', NULL, 0),
  ('c0000000-0000-0000-0000-000000000005', 'Divestiture and mergers templates', '2026-03-31', 'not_started', 'Prasad, David', 'Will complete by end of month', 1),
  ('c0000000-0000-0000-0000-000000000005', 'Joint presentation with Infocorvus', '2026-02-28', 'not_started', 'Ali', NULL, 2),
  ('c0000000-0000-0000-0000-000000000005', 'Prepare sales material', '2026-03-31', 'not_started', 'Michael', NULL, 3),
  ('c0000000-0000-0000-0000-000000000005', 'Sign reseller agreement with Infocorvus', '2026-02-28', 'wip', 'Shree, Kumar', 'Negotiate with Ali', 4),
  ('c0000000-0000-0000-0000-000000000005', 'Present PRIME (ROAD-based Quorum implementation)', '2026-03-04', 'not_started', 'Shree, Michael, Kumar, Zak', NULL, 5);

-- Rock 8: Quorum Qnections (Michael)
INSERT INTO milestones (rock_id, title, due_date, status, collaborators_text, notes, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000008', 'Determine sponsorship level and sign agreement', '2026-01-31', 'done', 'Shree, Kumar', NULL, 0),
  ('c0000000-0000-0000-0000-000000000008', 'Define target audience and core message', '2026-02-20', 'not_started', 'Michael, Shree', NULL, 1),
  ('c0000000-0000-0000-0000-000000000008', 'Obtain contact details for targets', '2026-02-27', 'not_started', 'Michael, BDev', NULL, 2),
  ('c0000000-0000-0000-0000-000000000008', 'Draft emails and call scripts', '2026-02-27', 'not_started', 'Michael, BDev', NULL, 3),
  ('c0000000-0000-0000-0000-000000000008', 'Launch pre-show outreach', '2026-03-02', 'not_started', 'Michael, BDev', NULL, 4),
  ('c0000000-0000-0000-0000-000000000008', 'Design handout and slideshow', '2026-04-01', 'not_started', 'Michael, Shree, Zak', NULL, 5),
  ('c0000000-0000-0000-0000-000000000008', 'Create conference landing page on website', '2026-03-02', 'not_started', 'Michael, Shree, Zak', NULL, 6),
  ('c0000000-0000-0000-0000-000000000008', 'Plan post-event follow up', '2026-04-01', 'not_started', 'Michael', NULL, 7);

-- ============================================
-- STEP 6: Issues
-- ============================================
INSERT INTO issues (id, group_id, description, status, priority, raised_by, assigned_to_id, resolution_notes, is_archived)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'BDev brainstorming on AI - need structured approach', 'open', 1, '4a25d5ff-d9de-43ac-a010-a19f6919546c', '4a25d5ff-d9de-43ac-a010-a19f6919546c', NULL, false),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Pricing for resources; Payment terms; Milestone-based discussion; Tiered pricing', 'open', 2, 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'Shree to setup a meeting', false),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Pricing of AI Bot build needs standardization', 'open', 3, '4a25d5ff-d9de-43ac-a010-a19f6919546c', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'Webinar; Touch base needed', false),
  ('d0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Request for adhoc support - Spinnaker, Magnolia, Enervest, Target, Mitsui', 'in_discussion', 4, 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'Shree to work on it', false),
  ('d0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Meeting recorders and AI tools to be streamlined - Otter, Read, Adobe, ChatGPT', 'closed', 5, '4a25d5ff-d9de-43ac-a010-a19f6919546c', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'Consolidate in MS ecosystem. Teams Transcript + one Zoom license + Otter.', false),
  ('d0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Switching to Microsoft Platforms - need migration plan', 'closed', 6, '4a25d5ff-d9de-43ac-a010-a19f6919546c', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'Done - team working on POA for migration with minimal impact', false),
  ('d0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Quorum & InfoCorvus - need to share with Quorum sales team', 'open', 7, 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000011', 'Setup meeting and present to Quorum - WIP', false),
  ('d0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Shree to setup Netsuite discussion with bdev team', 'open', 8, 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 'Michael/Shree to setup meeting with their bosses', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 7: To-Dos
-- ============================================
INSERT INTO todos (id, group_id, description, assigned_to_id, due_date, status, source_issue_id, is_archived)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Clean up Folders and set new VG standards for shared folders', 'b0000000-0000-0000-0000-000000000010', '2026-03-31', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Get company policy to upload everything to Confluence/GitHub', 'b0000000-0000-0000-0000-000000000010', '2026-03-31', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Switching to Microsoft Platforms - ETA 1/29/26', '4a25d5ff-d9de-43ac-a010-a19f6919546c', '2026-01-31', 'done', 'd0000000-0000-0000-0000-000000000006', false),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Quorum & InfoCorvus - share and present to Quorum sales team', 'b0000000-0000-0000-0000-000000000011', '2026-03-04', 'open', 'd0000000-0000-0000-0000-000000000007', false),
  ('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Get AI added to resumes', '4a25d5ff-d9de-43ac-a010-a19f6919546c', '2026-02-15', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Debrief - projects that have completed', 'b0000000-0000-0000-0000-000000000010', '2026-03-31', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Update Scorecard for India', '4a25d5ff-d9de-43ac-a010-a19f6919546c', '2026-02-15', 'done', NULL, false),
  ('e0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Setup bi-weekly AI brainstorming session', '4a25d5ff-d9de-43ac-a010-a19f6919546c', '2026-02-07', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'Setup pricing strategy discussion meeting', 'b0000000-0000-0000-0000-000000000010', '2026-02-15', 'open', 'd0000000-0000-0000-0000-000000000002', false),
  ('e0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', 'Setup Netsuite discussion with bdev team', 'b0000000-0000-0000-0000-000000000010', '2026-02-15', 'open', 'd0000000-0000-0000-0000-000000000008', false),
  ('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', 'Demo AI agents to customers and Vistage', 'b0000000-0000-0000-0000-000000000010', '2026-02-14', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', 'Send AI brainstorming invite to team', '4a25d5ff-d9de-43ac-a010-a19f6919546c', '2026-02-07', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', 'Define marketing for manufacturing campaigns', 'b0000000-0000-0000-0000-000000000012', '2026-03-31', 'open', NULL, false),
  ('e0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000001', 'Build marketing map and product solutioning map by practice area', 'b0000000-0000-0000-0000-000000000012', '2026-03-31', 'open', NULL, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 8: Rock Ideas
-- ============================================
INSERT INTO rock_ideas (id, group_id, description, suggested_owner_id, priority_color, comments)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Manage and strengthen VG listings on tech referral sites to maximize leads', 'b0000000-0000-0000-0000-000000000011', 'yellow', 'Started, in process'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Build knowledge base of customer stories. Formalize testimonials process. Get 2+ new testimonials.', 'b0000000-0000-0000-0000-000000000011', 'red', NULL),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Establish referral program for partners and clients. Create referral list.', 'b0000000-0000-0000-0000-000000000011', 'yellow', 'In process'),
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Determine alliance partner strategy with partners mapped and ranked', 'b0000000-0000-0000-0000-000000000010', 'red', 'Plan to methodically cultivate top ranked partners'),
  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Content Strategy for services/solutions - topics, competitive analysis, publishing calendar', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'red', 'Marketing strategy Rock. Will need help building this plan.'),
  ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Review and refine R&R for offshore Executive team; build KPI/KRA for India team', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'yellow', NULL),
  ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Build a Quorum Knowledge Base for future knowledge bases', 'b0000000-0000-0000-0000-000000000010', 'green', NULL),
  ('f0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Implement EOS Rocks concept across the company or leadership team in India', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'green', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 9: Focus Snapshots + Items
-- ============================================

-- Kumar's focus snapshot
INSERT INTO focus_snapshots (id, user_id, group_id, week_date)
VALUES ('aa000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 'b0000000-0000-0000-0000-000000000001', '2026-02-23')
ON CONFLICT (user_id, group_id, week_date) DO NOTHING;

INSERT INTO focus_items (snapshot_id, priority, company_subject, location, prospect_value, pipeline_status, key_decision_maker, weekly_action, sort_order)
VALUES
  ('aa000000-0000-0000-0000-000000000001', 'P4', 'Godrej ME (JDE Infocorvus)', 'Mumbai/ME', 95000, 'Waiting on feedback', NULL, 'Submitted proposal. Reseller agreement from Ali. Expect reply by 2/15', 0),
  ('aa000000-0000-0000-0000-000000000001', 'P1', 'Beckway Supply Chain BA', 'USA', 59400, 'Submitted proposal', NULL, NULL, 1),
  ('aa000000-0000-0000-0000-000000000001', 'P3', 'Arch Trails (Zoho)', 'USA', 15000, 'Activated', NULL, 'Zoho and automation projects. Candidate for Voice Bot.', 2),
  ('aa000000-0000-0000-0000-000000000001', 'P1', 'Lime Media - customer portal', NULL, 23000, 'Submitted proposal', NULL, 'Working on POC for next 10 days', 3),
  ('aa000000-0000-0000-0000-000000000001', 'P1', 'Goelzer', 'USA', 25000, 'WIP - Sizing engagement', NULL, 'Automation; proposal next week. Prema solutioning', 4),
  ('aa000000-0000-0000-0000-000000000001', 'P1', 'Spinnaker - Archiving', 'USA', 100000, NULL, NULL, 'Working with InfoCorvus, reselling plus services', 5),
  ('aa000000-0000-0000-0000-000000000001', 'P2', 'RTC', 'USA', 17000, 'Working on Bot Proposal', NULL, 'Julio came up with a need', 6),
  ('aa000000-0000-0000-0000-000000000001', 'P1', 'Lime Media - Tenant portal', 'USA', 27000, 'Solutioning', NULL, NULL, 7);

-- Shree's focus snapshot
INSERT INTO focus_snapshots (id, user_id, group_id, week_date)
VALUES ('aa000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001', '2026-02-23')
ON CONFLICT (user_id, group_id, week_date) DO NOTHING;

INSERT INTO focus_items (snapshot_id, priority, company_subject, location, prospect_value, pipeline_status, key_decision_maker, weekly_action, sort_order)
VALUES
  ('aa000000-0000-0000-0000-000000000002', 'P2', 'Newpark', 'Houston', NULL, 'Made another placement', 'Rajagapopal', 'Regroup with Rajagopal', 0),
  ('aa000000-0000-0000-0000-000000000002', 'P2', 'SRM Concrete', 'Tennessee', NULL, 'Mining', NULL, 'Met with Mickey. He promised to reach out', 1),
  ('aa000000-0000-0000-0000-000000000002', 'P2', 'SensR', 'Houston', 15000, NULL, NULL, 'Meet with SensR', 2),
  ('aa000000-0000-0000-0000-000000000002', 'P1', 'Robertet', NULL, 140000, NULL, NULL, 'Submitted 3 proposals - cost mgmt, iSupplier, ECC', 3),
  ('aa000000-0000-0000-0000-000000000002', 'P1', 'Indigo Beam', NULL, NULL, NULL, NULL, 'Genesis presentation; CRC Spotfire; Berry integration', 4),
  ('aa000000-0000-0000-0000-000000000002', 'P1', 'Infocorvus', NULL, NULL, NULL, NULL, 'Follow up on Colombia and Finland phase 2', 5),
  ('aa000000-0000-0000-0000-000000000002', 'P1', 'Magnolia', NULL, NULL, 'Negotiation', NULL, 'Waiting on IMS proposal; looking for Spotfire resource', 6),
  ('aa000000-0000-0000-0000-000000000002', 'P1', 'Enervest', 'Houston', 1000, 'Negotiation', 'Veer Surapaneni', 'Assist with decision process; SQL*Server analysis', 7),
  ('aa000000-0000-0000-0000-000000000002', 'P1', 'Target Hospitality', 'Houston', 5000, 'Starting work', 'Fahad Qazi', 'Review 2026 projects - Fixed Assets, HCM. Showcase AI', 8);

-- ============================================
-- STEP 10: Meeting with scores
-- ============================================
INSERT INTO meetings (id, group_id, meeting_date, average_score)
VALUES ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '2026-02-21', 8.17)
ON CONFLICT (id) DO NOTHING;

INSERT INTO meeting_attendees (meeting_id, user_id, score, checkin_note)
VALUES
  ('bb000000-0000-0000-0000-000000000001', '4a25d5ff-d9de-43ac-a010-a19f6919546c', 8, 'Good progress on AI agents this week'),
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', NULL, 'Working on Infocorvus and Quorum partnerships'),
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 8.5, 'Qnections planning on track'),
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000012', 8, 'Campaign planning initiated')
ON CONFLICT (meeting_id, user_id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (run after seed):
-- ============================================
-- SELECT count(*) as profiles FROM profiles WHERE is_active = true;
-- SELECT count(*) as group_members FROM group_members;
-- SELECT count(*) as rocks FROM rocks;
-- SELECT count(*) as milestones FROM milestones;
-- SELECT count(*) as issues FROM issues;
-- SELECT count(*) as todos FROM todos;
-- SELECT count(*) as rock_ideas FROM rock_ideas;
-- SELECT count(*) as focus_snapshots FROM focus_snapshots;
-- SELECT count(*) as focus_items FROM focus_items;
-- SELECT count(*) as meetings FROM meetings;
-- SELECT count(*) as meeting_attendees FROM meeting_attendees;
