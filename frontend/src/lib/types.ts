export interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: string
  is_active: boolean
  is_verified: boolean
  avatar_url: string | null
  phone: string | null
  college: string | null
  department: string | null
  year_of_study: string | null
  created_at: string
  last_login: string | null
}

export interface TeamMember {
  id: number
  user_id: number
  role: string
  joined_at: string
  user_name: string
  user_email: string
}

export interface Team {
  id: number
  name: string
  description: string | null
  team_code: string
  competition_id: number
  max_members: number
  is_ready: boolean
  presentation_order: number | null
  member_count: number
  members: TeamMember[]
  created_at: string
}

export interface CompetitionPhase {
  id: number
  competition_id: number
  phase_type: string
  name: string
  description: string | null
  order: number
  status: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export interface Competition {
  id: number
  name: string
  description: string | null
  theme: string | null
  status: string
  max_teams: number
  team_min_size: number
  team_max_size: number
  registration_start: string | null
  registration_end: string | null
  event_start: string | null
  event_end: string | null
  phases: CompetitionPhase[]
  created_at: string
}

export interface QuizQuestion {
  id: number
  round_id: number
  question_text: string
  question_type: string
  options: Record<string, string>
  points: number
  time_limit_seconds: number
  order: number
  is_active: boolean
}

export interface QuizRound {
  id: number
  competition_id: number
  round_number: number
  name: string
  description: string | null
  difficulty: string
  status: string
  time_limit_seconds: number
  points_per_question: number
  time_bonus_points: number
  question_count: number
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface QuizAnswer {
  id: number
  question_id: number
  team_id: number
  selected_answer: string
  is_correct: boolean
  points_earned: number
  time_taken_seconds: number
  answered_at: string
}

export interface QuizRoundResult {
  round_id: number
  team_id: number
  total_points: number
  correct_answers: number
  total_questions: number
  average_time: number
  answers: QuizAnswer[]
}

export interface DebugChallenge {
  id: number
  competition_id: number
  round_number: number
  name: string
  description: string
  difficulty: string
  buggy_code: string
  instructions: string
  time_limit_seconds: number
  points: number
  status: string
  test_case_count: number
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface DebugTestCase {
  id: number
  challenge_id: number
  name: string
  input_data: string
  expected_output: string
  is_hidden: boolean
  points: number
  order: number
}

export interface DebugSubmission {
  id: number
  challenge_id: number
  team_id: number
  status: string
  score: number
  execution_time_ms: number | null
  memory_used_mb: number | null
  test_results: unknown
  quality_score: number | null
  readability_score: number | null
  efficiency_score: number | null
  error_message: string | null
  submitted_at: string
  evaluated_at: string | null
}

export interface Presentation {
  id: number
  competition_id: number
  team_id: number
  team_name: string
  problem_statement: string
  idea_summary: string
  theme: string | null
  problem_category: string | null
  status: string
  presentation_order: number | null
  file_url: string | null
  total_score: number | null
  created_at: string
}

export interface PresentationScore {
  id: number
  presentation_id: number
  admin_id: number
  category: string
  score: number
  max_score: number
  feedback: string | null
  criteria: Record<string, number> | null
  scored_at: string
}

export interface LeaderboardEntry {
  rank: number
  team_id: number
  team_name: string
  total_score: number
  quiz_score: number
  debugging_score: number
  ideathon_score: number
  bonus_score: number
  member_count: number
  is_ready: boolean
}

export interface Leaderboard {
  competition_id: number
  total_teams: number
  entries: LeaderboardEntry[]
  updated_at: string
}

export interface Score {
  id: number
  team_id: number
  phase: string
  points: number
  description: string
  reference_id: number | null
  reference_type: string | null
  awarded_by: number
  created_at: string
}

export interface Clue {
  id: number
  competition_id: number
  name: string
  description: string
  clue_type: string
  content: string
  order: number
  source_phase: string | null
  source_round: number | null
  is_active: boolean
  created_at: string
}

export interface ClueDistribution {
  id: number
  clue_id: number
  team_id: number
  is_revealed: boolean
  revealed_at: string | null
  earned_by_round: number | null
  created_at: string
}

export interface Violation {
  id: number
  user_id: number
  team_id: number
  competition_id: number
  violation_type: string
  severity: string
  action_taken: string | null
  description: string | null
  is_resolved: boolean
  resolved_by: number | null
  resolved_at: string | null
  created_at: string
}

export interface Announcement {
  id: number
  competition_id: number
  title: string
  content: string
  priority: string
  is_pinned: boolean
  is_broadcast: boolean
  target_team_id: number | null
  created_by: number
  created_at: string
}

export interface AuditLog {
  id: number
  user_id: number
  action: string
  resource_type: string
  resource_id: number | null
  details: Record<string, unknown> | null
  ip_address: string | null
  status: string
  created_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
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
