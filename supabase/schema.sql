-- ============================================
-- HackSphere — Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'team_leader', 'team_member');
CREATE TYPE competition_phase AS ENUM ('quiz', 'debugging', 'ideathon', 'clues');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
CREATE TYPE violation_action AS ENUM ('warned', 'frozen', 'locked', 'kicked', 'disqualified');
CREATE TYPE clue_type AS ENUM ('question', 'code_review', 'bug_fix', 'architecture', 'presentation');
CREATE TYPE presentation_status AS ENUM ('pending', 'presenting', 'completed');
CREATE TYPE quiz_difficulty AS ENUM ('easy', 'medium', 'hard');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    role user_role NOT NULL DEFAULT 'team_member',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Competitions
CREATE TABLE public.competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    max_teams INTEGER DEFAULT 50,
    max_members_per_team INTEGER DEFAULT 4,
    current_phase competition_phase DEFAULT 'quiz',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    leader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    is_eliminated BOOLEAN DEFAULT FALSE,
    presentation_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(competition_id, name)
);

-- Team Members
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- ============================================
-- QUIZ PHASE
-- ============================================

-- Quiz Questions
CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    correct_answer INTEGER NOT NULL,
    difficulty quiz_difficulty DEFAULT 'medium',
    points INTEGER DEFAULT 10,
    time_limit_seconds INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    round_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quiz Submissions
CREATE TABLE public.quiz_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    selected_answer INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_earned INTEGER DEFAULT 0,
    time_taken_seconds NUMERIC(10, 2),
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, question_id)
);

-- ============================================
-- DEBUGGING PHASE
-- ============================================

-- Debug Challenges
CREATE TABLE public.debug_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    starter_code TEXT,
    test_cases JSONB NOT NULL DEFAULT '[]',
    expected_output JSONB NOT NULL DEFAULT '[]',
    difficulty quiz_difficulty DEFAULT 'medium',
    points INTEGER DEFAULT 20,
    time_limit_minutes INTEGER DEFAULT 30,
    round_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Debug Submissions
CREATE TABLE public.debug_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.debug_challenges(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    status submission_status DEFAULT 'pending',
    test_results JSONB DEFAULT '[]',
    correctness_score NUMERIC(5, 2) DEFAULT 0,
    quality_score NUMERIC(5, 2) DEFAULT 0,
    readability_score NUMERIC(5, 2) DEFAULT 0,
    efficiency_score NUMERIC(5, 2) DEFAULT 0,
    total_score NUMERIC(5, 2) DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- IDEATHON PHASE
-- ============================================

-- Ideathon Submissions
CREATE TABLE public.ideathon_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    file_urls JSONB DEFAULT '[]',
    repo_url TEXT,
    presentation_slides_url TEXT,
    status submission_status DEFAULT 'pending',
    judge_scores JSONB DEFAULT '{}',
    total_score NUMERIC(5, 2) DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presentation Queue
CREATE TABLE public.presentation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    queue_position INTEGER NOT NULL,
    status presentation_status DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CLUE SYSTEM
-- ============================================

-- Clues (progressive hints)
CREATE TABLE public.clues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    phase competition_phase NOT NULL,
    clue_type clue_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    points_value INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Clues (received clues)
CREATE TABLE public.team_clues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    clue_id UUID NOT NULL REFERENCES public.clues(id) ON DELETE CASCADE,
    is_unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMPTZ,
    UNIQUE(team_id, clue_id)
);

-- ============================================
-- SCORING & LEADERBOARD
-- ============================================

-- Scores (aggregated per team per phase)
CREATE TABLE public.scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    phase competition_phase NOT NULL,
    points INTEGER DEFAULT 0,
    breakdown JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, competition_id, phase)
);

-- Score History (individual score events)
CREATE TABLE public.score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    phase competition_phase NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ANTI-CHEAT & VIOLATIONS
-- ============================================

-- Violations
CREATE TABLE public.violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    violation_type TEXT NOT NULL,
    description TEXT,
    severity INTEGER DEFAULT 1,
    action_taken violation_action,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ADMIN & AUDIT
-- ============================================

-- Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_teams_competition ON public.teams(competition_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_quiz_submissions_team ON public.quiz_submissions(team_id);
CREATE INDEX idx_debug_submissions_team ON public.debug_submissions(team_id);
CREATE INDEX idx_scores_team ON public.scores(team_id);
CREATE INDEX idx_scores_competition ON public.scores(competition_id);
CREATE INDEX idx_score_history_team ON public.score_history(team_id);
CREATE INDEX idx_violations_team ON public.violations(team_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);

-- ============================================
-- REALTIME — Enable for live tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presentation_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideathon_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (for FastAPI backend)
-- Authenticated users can read public data
CREATE POLICY "Public read for authenticated" ON public.competitions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.teams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.team_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.quiz_questions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.score_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.announcements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.presentation_queue FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Public read for authenticated" ON public.clues FOR SELECT USING (auth.role() = 'authenticated');

-- Users can read/update own profile
CREATE POLICY "Users manage own profile" ON public.users FOR ALL USING (auth.uid() = id);

-- Team leaders manage their team
CREATE POLICY "Team leaders manage" ON public.teams FOR ALL USING (
    leader_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = teams.id AND user_id = auth.uid())
);

-- Team members
CREATE POLICY "Team members access" ON public.team_members FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid())
);

-- Quiz submissions
CREATE POLICY "Team submits quiz" ON public.quiz_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = quiz_submissions.team_id AND user_id = auth.uid())
);

-- Debug submissions
CREATE POLICY "Team submits debug" ON public.debug_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = debug_submissions.team_id AND user_id = auth.uid())
);

-- Ideathon submissions
CREATE POLICY "Team submits ideathon" ON public.ideathon_submissions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = ideathon_submissions.team_id AND user_id = auth.uid())
);

-- Team clues
CREATE POLICY "Team reads clues" ON public.team_clues FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members WHERE team_id = team_clues.team_id AND user_id = auth.uid())
);

-- Violations (admin only via service role)
CREATE POLICY "Admin read violations" ON public.violations FOR SELECT USING (auth.role() = 'service_role');

-- Audit logs (admin only via service role)
CREATE POLICY "Admin read audit" ON public.audit_logs FOR SELECT USING (auth.role() = 'service_role');
