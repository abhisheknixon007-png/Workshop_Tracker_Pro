-- Migration: 20260624100000_fix_trainer_rls_policies
-- Description: Adds and fixes RLS policies for trainers to allow them to create workshops, manage sessions, and manage workshop rules.

-- 1. Workshops policies
DROP POLICY IF EXISTS "Allow trainers to manage their own workshops" ON public.workshops;
DROP POLICY IF EXISTS "Allow trainers to insert workshops" ON public.workshops;

CREATE POLICY "Allow trainers to insert workshops" ON public.workshops
    FOR INSERT WITH CHECK (
        public.is_trainer(auth.uid())
    );

CREATE POLICY "Allow trainers to manage their own workshops" ON public.workshops
    FOR ALL USING (
        trainer_id = auth.uid() OR (trainer_id IS NULL AND public.is_trainer(auth.uid()))
    );

-- 2. Sessions policies
DROP POLICY IF EXISTS "Allow trainers to manage sessions of their workshops" ON public.sessions;
CREATE POLICY "Allow trainers to manage sessions of their workshops" ON public.sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workshops w
            WHERE w.id = workshop_id AND (w.trainer_id = auth.uid() OR (w.trainer_id IS NULL AND public.is_trainer(auth.uid())))
        )
    );

-- 3. Workshop Rules policies
DROP POLICY IF EXISTS "Allow trainers to manage rules of their workshops" ON public.workshop_rules;
CREATE POLICY "Allow trainers to manage rules of their workshops" ON public.workshop_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workshops w
            WHERE w.id = workshop_id AND (w.trainer_id = auth.uid() OR (w.trainer_id IS NULL AND public.is_trainer(auth.uid())))
        )
    );
