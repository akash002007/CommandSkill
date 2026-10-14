-- ==============================================================================
-- Migration: Recruitment Pipeline Optimization & Multi-Tenant Security
-- Optimizes queries, adds composite indexes, enables optimistic concurrency control,
-- and enforces multi-tenant Row Level Security (RLS) on applications.
-- ==============================================================================

-- 1. Add Optimistic Concurrency Control (OCC) and Idempotency tracking columns
DO $$ 
BEGIN 
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_idempotency_key TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_updated_by TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS current_stage_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 2. Add Composite and Performance Indexes for Scalable Querying
-- Primary candidate pipeline index: filter by internship and status/stage
CREATE INDEX IF NOT EXISTS idx_applications_internship_status 
    ON applications (internship_id, status);

-- Candidate pipeline sorting index: chronological pagination by applied_at
CREATE INDEX IF NOT EXISTS idx_applications_internship_applied_at 
    ON applications (internship_id, applied_at DESC);

-- Candidate status lookup across drives
CREATE INDEX IF NOT EXISTS idx_applications_user_status 
    ON applications (user_id, status);

-- Composite index for stage lookup if current_stage_id is present
CREATE INDEX IF NOT EXISTS idx_applications_internship_stage 
    ON applications (internship_id, current_stage_id);

-- 3. Multi-Tenant Recruiter Row-Level Security (RLS) Policies on Applications
-- Allow recruiters to view applications only for internships belonging to their company
DO $$
BEGIN
    CREATE POLICY "Recruiters can view applications for their company internships"
        ON applications FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM internships i
                JOIN recruiter_profiles rp ON rp.company_id = i.company_id
                WHERE i.id = applications.internship_id
                AND rp.id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid() 
                AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow recruiters to update application statuses only for their company internships
DO $$
BEGIN
    CREATE POLICY "Recruiters can update applications for their company internships"
        ON applications FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM internships i
                JOIN recruiter_profiles rp ON rp.company_id = i.company_id
                WHERE i.id = applications.internship_id
                AND rp.id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid() 
                AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM internships i
                JOIN recruiter_profiles rp ON rp.company_id = i.company_id
                WHERE i.id = applications.internship_id
                AND rp.id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.id = auth.uid() 
                AND up.role IN ('SUPER_ADMIN', 'PLATFORM_ADMIN')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Trigger to automatically increment OCC version on application updates
CREATE OR REPLACE FUNCTION increment_application_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_application_version ON applications;
CREATE TRIGGER trg_increment_application_version
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION increment_application_version();
