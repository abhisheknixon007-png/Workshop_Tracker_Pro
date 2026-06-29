-- SQL Schema for Live Workshop Progress & Assessment Tracker
-- Migration: 20260617000000_workshop_tracker_init
-- Designed for Supabase PostgreSQL

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'student')),
    phone_number TEXT,
    college_name TEXT,
    department TEXT,
    academic_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')) DEFAULT 'Pending',
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Workshops Table
CREATE TABLE IF NOT EXISTS public.workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
    trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    session_date DATE NOT NULL,
    duration_mins INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enrollments Table (Many-to-many between student and workshops)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, workshop_id)
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- 6. Activities Table (Hands-on activities per workshop)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Activity Scores Table (Grades for hands-on activities)
CREATE TABLE IF NOT EXISTS public.activity_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(activity_id, student_id)
);

-- 8. Assessments Table (Assessments per workshop)
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Quiz', 'Practical Assessment', 'Viva', 'Circuit Building', 'Final Project')),
    max_score NUMERIC NOT NULL DEFAULT 100 CHECK (max_score > 0),
    pass_score NUMERIC NOT NULL DEFAULT 50 CHECK (pass_score >= 0),
    weightage NUMERIC NOT NULL DEFAULT 0 CHECK (weightage >= 0 AND weightage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Assessment Scores Table
CREATE TABLE IF NOT EXISTS public.assessment_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL CHECK (score >= 0),
    feedback TEXT,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(assessment_id, student_id)
);

-- 10. Feedback Table (AI or Trainer manual summary feedback)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feedback_text TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Workshop Rules Table (Configurations for certification)
CREATE TABLE IF NOT EXISTS public.workshop_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE UNIQUE,
    min_attendance_pct NUMERIC NOT NULL DEFAULT 80 CHECK (min_attendance_pct >= 0 AND min_attendance_pct <= 100),
    min_assessment_score NUMERIC NOT NULL DEFAULT 70 CHECK (min_assessment_score >= 0 AND min_assessment_score <= 100),
    mandatory_activities_completed BOOLEAN NOT NULL DEFAULT TRUE,
    final_project_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Certificates Table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    certificate_number TEXT NOT NULL UNIQUE,
    qr_code TEXT,
    status TEXT NOT NULL CHECK (status IN ('Eligible', 'Not Eligible', 'Issued')) DEFAULT 'Eligible',
    UNIQUE(student_id, workshop_id)
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------
-- Indexes for performance optimization
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_workshops_trainer ON public.workshops(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workshop ON public.sessions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_workshop ON public.enrollments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_activities_workshop ON public.activities(workshop_id);
CREATE INDEX IF NOT EXISTS idx_activity_scores_student ON public.activity_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_workshop ON public.assessments(workshop_id);
CREATE INDEX IF NOT EXISTS idx_assessment_scores_student ON public.assessment_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON public.certificates(student_id);

-- ----------------------------------------------------
-- Security Definer Functions to avoid policy recursion
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_trainer(user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'trainer'
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------
-- Row Level Security (RLS) Enablement
-- ----------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------

-- Profile policies
DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;
CREATE POLICY "Allow public read of profiles" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admins full control of profiles" ON public.profiles;
CREATE POLICY "Allow admins full control of profiles" ON public.profiles
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Workshops policies
DROP POLICY IF EXISTS "Allow authenticated read of workshops" ON public.workshops;
CREATE POLICY "Allow authenticated read of workshops" ON public.workshops
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins full control of workshops" ON public.workshops;
CREATE POLICY "Allow admins full control of workshops" ON public.workshops
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Sessions policies
DROP POLICY IF EXISTS "Allow authenticated read of sessions" ON public.sessions;
CREATE POLICY "Allow authenticated read of sessions" ON public.sessions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins full control of sessions" ON public.sessions;
CREATE POLICY "Allow admins full control of sessions" ON public.sessions
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Enrollments policies
DROP POLICY IF EXISTS "Allow students to view their own enrollments" ON public.enrollments;
CREATE POLICY "Allow students to view their own enrollments" ON public.enrollments
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow trainers to view enrollments of their workshops" ON public.enrollments;
CREATE POLICY "Allow trainers to view enrollments of their workshops" ON public.enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workshops 
            WHERE id = workshop_id AND trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admins full control of enrollments" ON public.enrollments;
CREATE POLICY "Allow admins full control of enrollments" ON public.enrollments
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Attendance policies
DROP POLICY IF EXISTS "Allow students to view their own attendance" ON public.attendance;
CREATE POLICY "Allow students to view their own attendance" ON public.attendance
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow trainers full control of attendance for their workshops" ON public.attendance;
CREATE POLICY "Allow trainers full control of attendance for their workshops" ON public.attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.workshops w ON s.workshop_id = w.id
            WHERE s.id = session_id AND w.trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admins full control of attendance" ON public.attendance;
CREATE POLICY "Allow admins full control of attendance" ON public.attendance
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Activities & Scores policies
DROP POLICY IF EXISTS "Allow authenticated read of activities" ON public.activities;
CREATE POLICY "Allow authenticated read of activities" ON public.activities
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins full control of activities" ON public.activities;
CREATE POLICY "Allow admins full control of activities" ON public.activities
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Allow students to view their own activity scores" ON public.activity_scores;
CREATE POLICY "Allow students to view their own activity scores" ON public.activity_scores
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow trainers full control of activity scores for their workshops" ON public.activity_scores;
CREATE POLICY "Allow trainers full control of activity scores for their workshops" ON public.activity_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.activities a
            JOIN public.workshops w ON a.workshop_id = w.id
            WHERE a.id = activity_id AND w.trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admins full control of activity scores" ON public.activity_scores;
CREATE POLICY "Allow admins full control of activity scores" ON public.activity_scores
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Assessments & Scores policies
DROP POLICY IF EXISTS "Allow authenticated read of assessments" ON public.assessments;
CREATE POLICY "Allow authenticated read of assessments" ON public.assessments
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage assessments" ON public.assessments;
CREATE POLICY "Allow admins to manage assessments" ON public.assessments
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Allow students to view their own assessment scores" ON public.assessment_scores;
CREATE POLICY "Allow students to view their own assessment scores" ON public.assessment_scores
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow trainers to manage assessment scores for their workshops" ON public.assessment_scores;
CREATE POLICY "Allow trainers to manage assessment scores for their workshops" ON public.assessment_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.assessments a
            JOIN public.workshops w ON a.workshop_id = w.id
            WHERE a.id = assessment_id AND w.trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admins to manage assessment scores" ON public.assessment_scores;
CREATE POLICY "Allow admins to manage assessment scores" ON public.assessment_scores
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Feedback policies
DROP POLICY IF EXISTS "Allow students to view feedback targeted to them" ON public.feedback;
CREATE POLICY "Allow students to view feedback targeted to them" ON public.feedback
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow trainers to manage feedback for their workshops" ON public.feedback;
CREATE POLICY "Allow trainers to manage feedback for their workshops" ON public.feedback
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workshops 
            WHERE id = workshop_id AND trainer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow admins to manage feedback" ON public.feedback;
CREATE POLICY "Allow admins to manage feedback" ON public.feedback
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Workshop rules policies
DROP POLICY IF EXISTS "Allow authenticated read of rules" ON public.workshop_rules;
CREATE POLICY "Allow authenticated read of rules" ON public.workshop_rules
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow admins to manage rules" ON public.workshop_rules;
CREATE POLICY "Allow admins to manage rules" ON public.workshop_rules
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Certificates policies
DROP POLICY IF EXISTS "Allow students to read their own certificates" ON public.certificates;
CREATE POLICY "Allow students to read their own certificates" ON public.certificates
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Allow admins to manage certificates" ON public.certificates;
CREATE POLICY "Allow admins to manage certificates" ON public.certificates
    FOR ALL USING (
        public.is_admin(auth.uid())
    );

-- Notifications policies
DROP POLICY IF EXISTS "Allow users to read their own notifications" ON public.notifications;
CREATE POLICY "Allow users to read their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update/read their own notifications" ON public.notifications;
CREATE POLICY "Allow users to update/read their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow authenticated to insert notifications" ON public.notifications;
CREATE POLICY "Allow authenticated to insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Audit logs policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Allow authenticated to write audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anyone to write audit logs" ON public.audit_logs;
CREATE POLICY "Allow anyone to write audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);



-- 15. Views for requested names to satisfy exact mapping (users, students, trainers)
CREATE OR REPLACE VIEW public.users AS
SELECT * FROM public.profiles;

CREATE OR REPLACE VIEW public.students AS
SELECT * FROM public.profiles WHERE role = 'student';

CREATE OR REPLACE VIEW public.trainers AS
SELECT * FROM public.profiles WHERE role = 'trainer';

-- Grant access to authenticated and anon roles for views
GRANT SELECT ON public.users TO authenticated, anon;
GRANT SELECT ON public.students TO authenticated, anon;
GRANT SELECT ON public.trainers TO authenticated, anon;

