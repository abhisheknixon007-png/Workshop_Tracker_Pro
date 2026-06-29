-- 1. Alter profiles table to add raw password field
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Enable pgcrypto if not enabled (required for crypt and gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Trigger function to synchronize password updates from profiles to auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_password_to_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS DISTINCT FROM OLD.password AND NEW.password IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = crypt(NEW.password, gen_salt('bf', 10))
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate trigger
DROP TRIGGER IF EXISTS on_profile_password_update ON public.profiles;
CREATE TRIGGER on_profile_password_update
    AFTER UPDATE OF password ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_password_to_auth();

-- 5. Admin function to delete a specific user account (admin role checks)
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(user_id_to_delete UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        DELETE FROM auth.users WHERE id = user_id_to_delete;
    ELSE
        RAISE EXCEPTION 'Only administrators can delete user accounts.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Admin function to bulk delete all student/trainer accounts and workshops
CREATE OR REPLACE FUNCTION public.delete_all_trainers_and_students()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        -- Delete all workshops first (cascades to sessions, attendance, activity scores, assessments, etc.)
        DELETE FROM public.workshops;
        
        -- Delete all trainer and student users from auth.users (cascades to public.profiles)
        DELETE FROM auth.users
        WHERE id IN (
            SELECT id FROM public.profiles
            WHERE role = 'trainer' OR role = 'student'
        );
    ELSE
        RAISE EXCEPTION 'Only administrators can perform database resets.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Clear all trainer and student credentials and associated data
-- Deleting from auth.users cascades to public.profiles and related tables (enrollments, scores, certificates, feedback)
DELETE FROM auth.users
WHERE id IN (
    SELECT id FROM public.profiles
    WHERE role = 'trainer' OR role = 'student'
);

-- Deleting all workshops cascades to sessions, attendance, activities
DELETE FROM public.workshops;
