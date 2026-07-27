export type UserRole = 'super_admin' | 'admin' | 'team_leader' | 'team_member'
export type CompetitionPhase = 'quiz' | 'debugging' | 'ideathon' | 'clues'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'flagged'
export type ViolationAction = 'warned' | 'frozen' | 'locked' | 'kicked' | 'disqualified'
export type ClueType = 'question' | 'code_review' | 'bug_fix' | 'architecture' | 'presentation'
export type PresentationStatus = 'pending' | 'presenting' | 'completed'
export type QuizDifficulty = 'easy' | 'medium' | 'hard'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Competition {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  max_teams: number
  max_members_per_team: number
  current_phase: CompetitionPhase
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  competition_id: string
  leader_id: string
  invite_code: string
  is_eliminated: boolean
  presentation_order: number | null
  created_at: string
  updated_at: string
  member_count?: number
  members?: TeamMember[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  joined_at: string
  user?: User
}

export interface QuizQuestion {
  id: string
  competition_id: string
  question_text: string
  options: string[]
  correct_answer: number
  difficulty: QuizDifficulty
  points: number
  time_limit_seconds: number
  is_active: boolean
  round_number: number
  created_at: string
}

export interface QuizSubmission {
  id: string
  team_id: string
  question_id: string
  selected_answer: number
  is_correct: boolean
  points_earned: number
  time_taken_seconds: number | null
  answered_at: string
}

export interface DebugChallenge {
  id: string
  competition_id: string
  title: string
  description: string
  starter_code: string | null
  test_cases: TestCase[]
  expected_output: unknown[]
  difficulty: QuizDifficulty
  points: number
  time_limit_minutes: number
  round_number: number
  created_at: string
}

export interface TestCase {
  input: string
  expected: string
  hidden: boolean
}

export interface DebugSubmission {
  id: string
  team_id: string
  challenge_id: string
  submitted_code: string
  status: SubmissionStatus
  test_results: TestResult[]
  correctness_score: number
  quality_score: number
  readability_score: number
  efficiency_score: number
  total_score: number
  points_earned: number
  execution_time_ms: number | null
  submitted_at: string
}

export interface TestResult {
  passed: boolean
  input: string
  expected: string
  actual: string
}

export interface IdeathonSubmission {
  id: string
  team_id: string
  competition_id: string
  title: string
  description: string
  file_urls: string[]
  repo_url: string | null
  presentation_slides_url: string | null
  status: SubmissionStatus
  judge_scores: Record<string, number>
  total_score: number
  points_earned: number
  submitted_at: string
}

export interface PresentationQueue {
  id: string
  team_id: string
  competition_id: string
  queue_position: number
  status: PresentationStatus
  started_at: string | null
  ended_at: string | null
  created_at: string
  team?: Team
}

export interface Clue {
  id: string
  competition_id: string
  phase: CompetitionPhase
  clue_type: ClueType
  title: string
  content: string
  points_value: number
  is_active: boolean
  created_at: string
}

export interface TeamClue {
  id: string
  team_id: string
  clue_id: string
  is_unlocked: boolean
  unlocked_at: string | null
  clue?: Clue
}

export interface Score {
  id: string
  team_id: string
  competition_id: string
  phase: CompetitionPhase
  points: number
  breakdown: Record<string, unknown>
  updated_at: string
}

export interface ScoreHistory {
  id: string
  team_id: string
  competition_id: string
  phase: CompetitionPhase
  points: number
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Violation {
  id: string
  team_id: string
  competition_id: string
  user_id: string | null
  violation_type: string
  description: string | null
  severity: number
  action_taken: ViolationAction | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface Announcement {
  id: string
  competition_id: string
  title: string
  message: string
  priority: number
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface LeaderboardEntry {
  rank: number
  team_id: string
  team_name: string
  total_score: number
  quiz_score: number
  debugging_score: number
  ideathon_score: number
  bonus_score: number
  member_count: number
}

export interface Leaderboard {
  competition_id: string
  total_teams: number
  entries: LeaderboardEntry[]
  updated_at: string
}

export interface AdminDashboard {
  total_teams: number
  total_participants: number
  active_competitions: number
  total_violations: number
  teams_registered: number
  teams_ready: number
  quiz_stats: { active_rounds: number; total_submissions: number }
  debug_stats: { active_challenges: number; total_submissions: number }
  ideathon_stats: { pending_presentations: number; completed: number }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
}
