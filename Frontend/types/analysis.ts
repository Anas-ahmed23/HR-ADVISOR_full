export interface MatchedSkill {
  jd_skill: string
  cv_skill: string
  match_type?: string
  evidence?: string
  confidence?: number
  similarity?: number
}

export interface PriorityItem {
  priority: number
  action: string
  reason: string
}

export interface SkillGroup {
  group: string
  skills: string[]
}

export interface ScoreBreakdown {
  skill_score?: number
  experience_score?: number
  education_score?: number
  soft_skill_score?: number
  responsibility_alignment_score?: number
  domain_fit_score?: number
  impact_score?: number
  resume_quality_score?: number
}

export interface JDAnalysis {
  job_title?: string
  job_summary?: string
  requirements?: string[]
  responsibilities?: string[]
  tools_and_technologies?: string[]
  domain?: string
  seniority?: string
}

export interface LLMAnalysis {
  metadata?: { job_title?: string; created_at?: string }
  evaluation_result?: {
    classification?: string
    final_score?: number
    application_readiness?: string
    headline?: string
    short_verdict?: string
  }
  ats_summary?: {
    headline?: string
    short_verdict?: string
    top_strengths?: string[]
    top_gaps?: string[]
  }
  job_description_analysis?: JDAnalysis
  cv_skills_hard?: string[]
  cv_skills_soft?: string[]
  jd_skills_hard?: string[]
  jd_skills_soft?: string[]
  matched_skills?: MatchedSkill[]
  missing_skills?: string[]
  missing_skills_grouped?: SkillGroup[]
  score_breakdown?: ScoreBreakdown
  candidate_advice?: {
    overall_advice?: string
    priority_improvements?: PriorityItem[]
    cv_improvements?: string[]
    learning_recommendations?: string[]
    interview_tips?: string[]
  }
  insights?: { strengths?: string[]; gaps?: string[]; recommendations?: string[] }
  /* legacy fallback fields */
  final_score?: number
  classification?: string
  skill_score?: number
  experience_score?: number
  education_score?: number
}

export interface DashboardProps {
  llm_analysis: LLMAnalysis
  onReset: () => void
}
