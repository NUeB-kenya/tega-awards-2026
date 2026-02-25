
-- 1. Expand app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'country_coordinator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'panel_chair';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'global_jury';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
