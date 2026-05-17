"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ATSDashboard } from "@/components/ats-dashboard"
import { ProductPanel } from "@/components/product-shell"
import { useAnalysis } from "@/context/analysis-context"
import type { LLMAnalysis } from "@/types/analysis"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Archive,
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  FileText,
  Library,
  Loader2,
  Search,
  Sparkles,
  Table2,
  Upload,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────
   PREMADE JD CATALOGUE
───────────────────────────────────────── */
interface JDEntry {
  filename: string
  title: string
  category: string
}

const PREMADE_JDS: JDEntry[] = [
  // ── AI & Machine Learning ──
  { filename: "AI_and_Data_Science_Job_Description.pdf",                title: "AI & Data Science",                      category: "AI & Machine Learning" },
  { filename: "AI_Ethics_Consultant_Job_Description.pdf",               title: "AI Ethics Consultant",                   category: "AI & Machine Learning" },
  { filename: "AI_Product_Manager_Job_Description.pdf",                 title: "AI Product Manager",                     category: "AI & Machine Learning" },
  { filename: "AI_Research_Scientist_Job_Description.pdf",              title: "AI Research Scientist",                  category: "AI & Machine Learning" },
  { filename: "Junior_NLP_Engineer_Job_Description.pdf",                title: "Junior NLP Engineer",                    category: "AI & Machine Learning" },
  { filename: "Machine_Learning_Engineer_Job_Description.pdf",          title: "Machine Learning Engineer",              category: "AI & Machine Learning" },
  { filename: "NLP_Engineer_Job_Description.pdf",                       title: "NLP Engineer",                           category: "AI & Machine Learning" },
  { filename: "Predictive_Modeler_Job_Description.pdf",                 title: "Predictive Modeler",                     category: "AI & Machine Learning" },
  { filename: "Reinforcement_Learning_Engineer_Job_Description.pdf",    title: "Reinforcement Learning Engineer",        category: "AI & Machine Learning" },
  { filename: "Computer_Vision_Engineer_Job_Description.pdf",           title: "Computer Vision Engineer",               category: "AI & Machine Learning" },
  { filename: "Junior_Computer_Vision_Engineer_Job_Description.pdf",    title: "Junior Computer Vision Engineer",        category: "AI & Machine Learning" },
  { filename: "Junior_Reinforcement_Learning_Engineer_Job_Description.pdf", title: "Junior Reinforcement Learning Engineer", category: "AI & Machine Learning" },
  { filename: "Lead_AI_Research_Scientist_Job_Description.pdf",         title: "Lead AI Research Scientist",             category: "AI & Machine Learning" },
  { filename: "Lead_Computer_Vision_Engineer_Job_Description.pdf",      title: "Lead Computer Vision Engineer",          category: "AI & Machine Learning" },
  { filename: "Lead_Machine_Learning_Engineer_Job_Description.pdf",     title: "Lead Machine Learning Engineer",         category: "AI & Machine Learning" },
  { filename: "Lead_NLP_Engineer_Job_Description.pdf",                  title: "Lead NLP Engineer",                      category: "AI & Machine Learning" },
  { filename: "Lead_Reinforcement_Learning_Engineer_Job_Description.pdf", title: "Lead Reinforcement Learning Engineer", category: "AI & Machine Learning" },
  { filename: "Senior_AI_Ethics_Consultant_Job_Description.pdf",        title: "Senior AI Ethics Consultant",           category: "AI & Machine Learning" },
  { filename: "Senior_AI_Product_Manager_Job_Description.pdf",          title: "Senior AI Product Manager",             category: "AI & Machine Learning" },
  { filename: "Senior_AI_Research_Scientist_Job_Description.pdf",       title: "Senior AI Research Scientist",          category: "AI & Machine Learning" },
  { filename: "Senior_Computer_Vision_Engineer_Job_Description.pdf",    title: "Senior Computer Vision Engineer",       category: "AI & Machine Learning" },
  { filename: "Senior_Machine_Learning_Engineer_Job_Description.pdf",   title: "Senior Machine Learning Engineer",      category: "AI & Machine Learning" },
  { filename: "Senior_NLP_Engineer_Job_Description.pdf",                title: "Senior NLP Engineer",                   category: "AI & Machine Learning" },
  { filename: "Senior_Predictive_Modeler_Job_Description.pdf",          title: "Senior Predictive Modeler",             category: "AI & Machine Learning" },
  { filename: "Senior_Reinforcement_Learning_Engineer_Job_Description.pdf", title: "Senior Reinforcement Learning Engineer", category: "AI & Machine Learning" },

  // ── Data & Analytics ──
  { filename: "Big_Data_Engineer_Job_Description.pdf",                  title: "Big Data Engineer",                     category: "Data & Analytics" },
  { filename: "Business_Intelligence_Analyst_Job_Description.pdf",      title: "Business Intelligence Analyst",         category: "Data & Analytics" },
  { filename: "Data_Analyst_Job_Description.pdf",                       title: "Data Analyst",                          category: "Data & Analytics" },
  { filename: "Data_Scientist_Job_Description.pdf",                     title: "Data Scientist",                        category: "Data & Analytics" },
  { filename: "Database_Administrator_Job_Description.pdf",             title: "Database Administrator",                category: "Data & Analytics" },
  { filename: "Database_Architect_Job_Description.pdf",                 title: "Database Architect",                    category: "Data & Analytics" },
  { filename: "FinTech_Data_Analyst_job_Description.pdf",               title: "FinTech Data Analyst",                  category: "Data & Analytics" },
  { filename: "Junior_Data_Scientist_Job_Description.pdf",              title: "Junior Data Scientist",                 category: "Data & Analytics" },
  { filename: "Lead_Big_Data_Engineer_Job_Description.pdf",             title: "Lead Big Data Engineer",                category: "Data & Analytics" },
  { filename: "Lead_Business_Intelligence_Analyst_Job_Description.pdf", title: "Lead Business Intelligence Analyst",    category: "Data & Analytics" },
  { filename: "Lead_Data_Analyst_Job_Description.pdf",                  title: "Lead Data Analyst",                     category: "Data & Analytics" },
  { filename: "Lead_Data_Scientist_Job_Description.pdf",                title: "Lead Data Scientist",                   category: "Data & Analytics" },
  { filename: "Quantitative_Analyst__Quant__job_Description.pdf",       title: "Quantitative Analyst (Quant)",          category: "Data & Analytics" },
  { filename: "Senior_Big_Data_Engineer_Job_Description.pdf",           title: "Senior Big Data Engineer",              category: "Data & Analytics" },
  { filename: "Senior_Business_Intelligence_Analyst_Job_Description.pdf", title: "Senior Business Intelligence Analyst", category: "Data & Analytics" },
  { filename: "Senior_Data_Analyst_Job_Description.pdf",                title: "Senior Data Analyst",                   category: "Data & Analytics" },
  { filename: "Senior_Data_Scientist_Job_Description.pdf",              title: "Senior Data Scientist",                 category: "Data & Analytics" },
  { filename: "Senior_Database_Administrator_Job_Description.pdf",      title: "Senior Database Administrator",         category: "Data & Analytics" },
  { filename: "Senior_Quantitative_Analyst__Quant__job_Description.pdf", title: "Senior Quantitative Analyst",         category: "Data & Analytics" },

  // ── Software Engineering ──
  { filename: "Full_stack_Developer_Job_Description.pdf",               title: "Full Stack Developer",                  category: "Software Engineering" },
  { filename: "General_Computer_Science_Careers_Job_Description.pdf",   title: "General CS Careers",                    category: "Software Engineering" },
  { filename: "Junior_Full_stack_Developer_Job_Description.pdf",        title: "Junior Full Stack Developer",           category: "Software Engineering" },
  { filename: "Junior_Mobile_App_Developer_Job_Description.pdf",        title: "Junior Mobile App Developer",           category: "Software Engineering" },
  { filename: "Junior_Software_Engineer_Job_Description.pdf",           title: "Junior Software Engineer",              category: "Software Engineering" },
  { filename: "Lead_Full_stack_Developer_Job_Description.pdf",          title: "Lead Full Stack Developer",             category: "Software Engineering" },
  { filename: "Lead_Mobile_App_Developer_Job_Description.pdf",          title: "Lead Mobile App Developer",             category: "Software Engineering" },
  { filename: "Lead_Software_Engineer_Job_Description.pdf",             title: "Lead Software Engineer",                category: "Software Engineering" },
  { filename: "Lead_Web_Developer_Job_Description.pdf",                 title: "Lead Web Developer",                    category: "Software Engineering" },
  { filename: "Mobile_App_Developer_Job_Description.pdf",               title: "Mobile App Developer",                  category: "Software Engineering" },
  { filename: "Senior_Full_stack_Developer_Job_Description.pdf",        title: "Senior Full Stack Developer",           category: "Software Engineering" },
  { filename: "Senior_Mobile_App_Developer_Job_Description.pdf",        title: "Senior Mobile App Developer",           category: "Software Engineering" },
  { filename: "Senior_Software_Engineer_Job_Description.pdf",           title: "Senior Software Engineer",              category: "Software Engineering" },
  { filename: "Senior_Web_Developer_Job_Description.pdf",               title: "Senior Web Developer",                  category: "Software Engineering" },
  { filename: "Software_Architect_Job_Description.pdf",                 title: "Software Architect",                    category: "Software Engineering" },
  { filename: "Software_Development_Manager_Job_Description.pdf",       title: "Software Development Manager",          category: "Software Engineering" },
  { filename: "Software_Engineer_Job_Description.pdf",                  title: "Software Engineer",                     category: "Software Engineering" },
  { filename: "Systems_Architect_Job_Description.pdf",                  title: "Systems Architect",                     category: "Software Engineering" },
  { filename: "Web_Developer_Job_Description.pdf",                      title: "Web Developer",                         category: "Software Engineering" },

  // ── Cloud & DevOps ──
  { filename: "Cloud_Architect_Job_Description.pdf",                    title: "Cloud Architect",                       category: "Cloud & DevOps" },
  { filename: "Cloud_Engineer_Job_Description.pdf",                     title: "Cloud Engineer",                        category: "Cloud & DevOps" },
  { filename: "Cloud_Solutions_Architect_Job_Description.pdf",          title: "Cloud Solutions Architect",             category: "Cloud & DevOps" },
  { filename: "DevOps_Engineer_Job_Description.pdf",                    title: "DevOps Engineer",                       category: "Cloud & DevOps" },
  { filename: "DevOps_Team_Lead_Job_Description.pdf",                   title: "DevOps Team Lead",                      category: "Cloud & DevOps" },
  { filename: "Junior_Cloud_Engineer_Job_Description.pdf",              title: "Junior Cloud Engineer",                 category: "Cloud & DevOps" },
  { filename: "Senior_Cloud_Engineer_Job_Description.pdf",              title: "Senior Cloud Engineer",                 category: "Cloud & DevOps" },
  { filename: "Senior_DevOps_Engineer_Job_Description.pdf",             title: "Senior DevOps Engineer",                category: "Cloud & DevOps" },

  // ── Security ──
  { filename: "Lead_Security_Engineer_Job_Description.pdf",             title: "Lead Security Engineer",                category: "Security" },
  { filename: "RegTech_Specialist__Regulatory_Technology__job_Description.pdf", title: "RegTech Specialist",            category: "Security" },
  { filename: "Security_Analyst_Job_Description.pdf",                   title: "Security Analyst",                      category: "Security" },
  { filename: "Security_Engineer_Job_Description.pdf",                  title: "Security Engineer",                     category: "Security" },
  { filename: "Senior_Security_Analyst_Job_Description.pdf",            title: "Senior Security Analyst",               category: "Security" },

  // ── FinTech & Finance ──
  { filename: "Digital_Banking_Specialist_job_Description.pdf",         title: "Digital Banking Specialist",            category: "FinTech & Finance" },
  { filename: "FinTech__Financial_Technology__job_Description.pdf",     title: "FinTech (Financial Technology)",        category: "FinTech & Finance" },
  { filename: "FinTech_Software_Engineer_job_Description.pdf",          title: "FinTech Software Engineer",             category: "FinTech & Finance" },
  { filename: "Lead_FinTech_Software_Engineer_job_Description.pdf",     title: "Lead FinTech Software Engineer",        category: "FinTech & Finance" },
  { filename: "Payment_Systems_Architect_job_Description.pdf",          title: "Payment Systems Architect",             category: "FinTech & Finance" },
  { filename: "Risk_Management_Analyst_job_Description.pdf",            title: "Risk Management Analyst",               category: "FinTech & Finance" },
  { filename: "Senior_Digital_Banking_Specialist_job_Description.pdf",  title: "Senior Digital Banking Specialist",     category: "FinTech & Finance" },
  { filename: "Senior_FinTech_Software_Engineer_job_Description.pdf",   title: "Senior FinTech Software Engineer",      category: "FinTech & Finance" },
  { filename: "Senior_Payment_Systems_Architect_job_Description.pdf",   title: "Senior Payment Systems Architect",      category: "FinTech & Finance" },
  { filename: "Senior_Risk_Management_Analyst_job_Description.pdf",     title: "Senior Risk Management Analyst",        category: "FinTech & Finance" },

  // ── Blockchain & Web3 ──
  { filename: "Blockchain_Developer_job_Description.pdf",               title: "Blockchain Developer",                  category: "Blockchain & Web3" },
  { filename: "Junior_Blockchain_Developer_job_Description.pdf",        title: "Junior Blockchain Developer",           category: "Blockchain & Web3" },
  { filename: "Lead_Blockchain_Developer_job_Description.pdf",          title: "Lead Blockchain Developer",             category: "Blockchain & Web3" },
  { filename: "Senior_Blockchain_Developer_job_Description.pdf",        title: "Senior Blockchain Developer",           category: "Blockchain & Web3" },

  // ── Game, AR & VR ──
  { filename: "AR_Developer_job_Description.pdf",                       title: "AR Developer",                          category: "Game, AR & VR" },
  { filename: "Content_Creator_for_VR_Platforms_Job_Description.pdf",   title: "Content Creator for VR Platforms",      category: "Game, AR & VR" },
  { filename: "Game_Designer_job_Description.pdf",                       title: "Game Designer",                         category: "Game, AR & VR" },
  { filename: "Game_Developer_Job_Description.pdf",                      title: "Game Developer",                        category: "Game, AR & VR" },
  { filename: "Interactive_Media_Designer_job_Description.pdf",          title: "Interactive Media Designer",            category: "Game, AR & VR" },
  { filename: "Junior_AR_Developer_job_Description.pdf",                 title: "Junior AR Developer",                   category: "Game, AR & VR" },
  { filename: "Junior_VR_Developer_job_Description.pdf",                 title: "Junior VR Developer",                   category: "Game, AR & VR" },
  { filename: "Lead_3D_Artist_Modeler_job_Description.pdf",              title: "Lead 3D Artist & Modeler",              category: "Game, AR & VR" },
  { filename: "Lead_AR_Developer_job_Description.pdf",                   title: "Lead AR Developer",                     category: "Game, AR & VR" },
  { filename: "Lead_Game_Designer_job_Description.pdf",                  title: "Lead Game Designer",                    category: "Game, AR & VR" },
  { filename: "Lead_Game_Developer_Job_Description.pdf",                 title: "Lead Game Developer",                   category: "Game, AR & VR" },
  { filename: "Lead_VR_Developer_job_Description.pdf",                   title: "Lead VR Developer",                     category: "Game, AR & VR" },
  { filename: "Media_and_Virtual_Reality__VR__job_Description.pdf",      title: "Media & Virtual Reality",               category: "Game, AR & VR" },
  { filename: "Media_Systems_Architect_Job_Description.pdf",             title: "Media Systems Architect",               category: "Game, AR & VR" },
  { filename: "Media_Systems_Engineer_Job_Description.pdf",              title: "Media Systems Engineer",                category: "Game, AR & VR" },
  { filename: "Motion_Graphics_Designer_job_Description.pdf",            title: "Motion Graphics Designer",              category: "Game, AR & VR" },
  { filename: "Senior__AR_Developer_job_Description.pdf",                title: "Senior AR Developer",                   category: "Game, AR & VR" },
  { filename: "Senior_3D_Artist_Modeler_job_Description.pdf",            title: "Senior 3D Artist & Modeler",            category: "Game, AR & VR" },
  { filename: "Senior_Content_Creator_for_VR_Platforms_Job_Description.pdf", title: "Senior Content Creator for VR",    category: "Game, AR & VR" },
  { filename: "Senior_Game_Designer_job_Description.pdf",                title: "Senior Game Designer",                  category: "Game, AR & VR" },
  { filename: "Senior_Game_Developer_Job_Description.pdf",               title: "Senior Game Developer",                 category: "Game, AR & VR" },
  { filename: "Senior_Interactive_Media_Designer_job_Description.pdf",   title: "Senior Interactive Media Designer",     category: "Game, AR & VR" },
  { filename: "Senior_Media_Systems_Engineer_Job_Description.pdf",       title: "Senior Media Systems Engineer",         category: "Game, AR & VR" },
  { filename: "Senior_Motion_Graphics_Designer_job_Description.pdf",     title: "Senior Motion Graphics Designer",       category: "Game, AR & VR" },
  { filename: "Senior_VR_AR_Experience_Designer_job_Description.pdf",    title: "Senior VR/AR Experience Designer",      category: "Game, AR & VR" },
  { filename: "Senior_VR_Developer_job_Description.pdf",                 title: "Senior VR Developer",                   category: "Game, AR & VR" },
  { filename: "VR_AR_Experience_Designer_job_Description.pdf",           title: "VR/AR Experience Designer",             category: "Game, AR & VR" },
  { filename: "VR_Developer_job_Description.pdf",                        title: "VR Developer",                          category: "Game, AR & VR" },

  // ── QA & Testing ──
  { filename: "QA_Lead_Job_Description.pdf",                            title: "QA Lead",                               category: "QA & Testing" },
  { filename: "QA_Manager_Job_Description.pdf",                         title: "QA Manager",                            category: "QA & Testing" },
  { filename: "Quality_Assurance__QA__Engineer_Job_Description.pdf",    title: "QA Engineer",                           category: "QA & Testing" },
  { filename: "Senior_QA_Engineer_Job_Description.pdf",                 title: "Senior QA Engineer",                    category: "QA & Testing" },

  // ── IT & Support ──
  { filename: "IT_Consultant_Job_Description.pdf",                      title: "IT Consultant",                         category: "IT & Support" },
  { filename: "IT_Help_Desk_Technician_Job_Description.pdf",            title: "IT Help Desk Technician",               category: "IT & Support" },
  { filename: "IT_Project_Manager_Job_Description.pdf",                 title: "IT Project Manager",                    category: "IT & Support" },
  { filename: "Senior_IT_Consultant_Job_Description.pdf",               title: "Senior IT Consultant",                  category: "IT & Support" },
  { filename: "Senior_Technical_Support_Engineer_Job_Description.pdf",  title: "Senior Technical Support Engineer",     category: "IT & Support" },
  { filename: "Technical_Support_Engineer_Job_Description.pdf",         title: "Technical Support Engineer",            category: "IT & Support" },
  { filename: "Technical_Support_Team_Lead_Job_Description.pdf",        title: "Technical Support Team Lead",           category: "IT & Support" },

  // ── Design ──
  { filename: "UI_UX_Designer_Job_Description.pdf",                     title: "UI/UX Designer",                        category: "Design" },
  { filename: "Lead_UI_UX_Designer_Job_Description.pdf",                title: "Lead UI/UX Designer",                   category: "Design" },
  { filename: "Senior_UI_UX_Designer_Job_Description.pdf",              title: "Senior UI/UX Designer",                 category: "Design" },

  // ── Robotics ──
  { filename: "Robotics_Engineer_Job_Description.pdf",                  title: "Robotics Engineer",                     category: "Robotics" },
  { filename: "Lead_Robotics_Engineer_Job_Description.pdf",             title: "Lead Robotics Engineer",                category: "Robotics" },
  { filename: "Senior_Robotics_Engineer_Job_Description.pdf",           title: "Senior Robotics Engineer",              category: "Robotics" },
]

const CATEGORY_ORDER = [
  "AI & Machine Learning",
  "Software Engineering",
  "Data & Analytics",
  "Cloud & DevOps",
  "FinTech & Finance",
  "Security",
  "Blockchain & Web3",
  "Game, AR & VR",
  "QA & Testing",
  "IT & Support",
  "Design",
  "Robotics",
]

const CATEGORY_COLORS: Record<string, { accent: string; bg: string; border: string }> = {
  "AI & Machine Learning":  { accent: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
  "Software Engineering":   { accent: "#7A4DFF", bg: "rgba(122,77,255,0.08)",  border: "rgba(122,77,255,0.2)"  },
  "Data & Analytics":       { accent: "#06b6d4", bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.2)"   },
  "Cloud & DevOps":         { accent: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)"  },
  "Security":               { accent: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
  "FinTech & Finance":      { accent: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  },
  "Blockchain & Web3":      { accent: "#fb923c", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)"  },
  "Game, AR & VR":          { accent: "#e879f9", bg: "rgba(232,121,249,0.08)", border: "rgba(232,121,249,0.2)" },
  "QA & Testing":           { accent: "#2dd4bf", bg: "rgba(45,212,191,0.08)",  border: "rgba(45,212,191,0.2)"  },
  "IT & Support":           { accent: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" },
  "Design":                 { accent: "#f472b6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.2)" },
  "Robotics":               { accent: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)"  },
}

/* ─────────────────────────────────────────
   DROP ZONE (CV only)
───────────────────────────────────────── */
interface BatchAnalysisItem {
  cv_name: string
  analysis?: LLMAnalysis | null
  result?: (LLMAnalysis & { llm_analysis?: LLMAnalysis }) | null
  error?: string | null
}

interface BatchAnalysisResponse {
  batch: true
  archive?: string
  job_description?: string
  total?: number
  processed?: number
  skipped_files?: string[]
  results: BatchAnalysisItem[]
}

interface BatchCandidateRow {
  cvName: string
  overall: number | null
  technical: number | null
  experience: number | null
  education: number | null
  softSkills: number | null
  responsibility: number | null
  recommendation: string
  classification: string
  error?: string | null
}

function isBatchAnalysis(data: unknown): data is BatchAnalysisResponse {
  if (!data || typeof data !== "object") return false
  const value = data as { batch?: unknown; results?: unknown }
  return value.batch === true && Array.isArray(value.results)
}

function isZipFile(file: File | null) {
  return Boolean(file?.name.toLowerCase().endsWith(".zip"))
}

function unwrapBatchAnalysis(item: BatchAnalysisItem): LLMAnalysis | null {
  if (item.analysis) return item.analysis
  if (!item.result) return null
  return item.result.llm_analysis ?? item.result
}

function normalizeScore(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  const percentage = value <= 1 ? value * 100 : value
  return Math.max(0, Math.min(100, Math.round(percentage)))
}

function formatScore(value: number | null) {
  return value === null ? "-" : `${value}%`
}

function recommendationFromScore(score: number | null) {
  if (score === null) return "Manual review"
  if (score >= 80) return "Strong shortlist"
  if (score >= 65) return "Interview review"
  if (score >= 50) return "Manual review"
  return "Not recommended"
}

function buildBatchRows(batch: BatchAnalysisResponse): BatchCandidateRow[] {
  return batch.results
    .map(item => {
      const analysis = unwrapBatchAnalysis(item)
      if (!analysis) {
        return {
          cvName: item.cv_name,
          overall: null,
          technical: null,
          experience: null,
          education: null,
          softSkills: null,
          responsibility: null,
          recommendation: "Analysis failed",
          classification: "Failed",
          error: item.error ?? "No analysis returned",
        }
      }

      const scores = analysis.score_breakdown ?? {}
      const overall = normalizeScore(analysis.evaluation_result?.final_score ?? analysis.final_score)
      const classification = analysis.evaluation_result?.classification ?? analysis.classification ?? "Unclassified"

      return {
        cvName: item.cv_name,
        overall,
        technical: normalizeScore(scores.skill_score ?? analysis.skill_score),
        experience: normalizeScore(scores.experience_score ?? analysis.experience_score),
        education: normalizeScore(scores.education_score ?? analysis.education_score),
        softSkills: normalizeScore(scores.soft_skill_score),
        responsibility: normalizeScore(scores.responsibility_alignment_score),
        recommendation:
          analysis.evaluation_result?.application_readiness ??
          recommendationFromScore(overall),
        classification,
        error: item.error,
      }
    })
    .sort((a, b) => {
      if (a.error && !b.error) return 1
      if (!a.error && b.error) return -1
      return (b.overall ?? -1) - (a.overall ?? -1)
    })
}

function DropZone({
  label,
  sublabel,
  accept,
  file,
  onFile,
  icon: Icon,
  accentColor,
  accentClass,
}: {
  label: string
  sublabel: string
  accept: string
  file: File | null
  onFile: (f: File) => void
  icon: typeof FileText
  accentColor: string
  accentClass: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed p-8 text-center transition-all duration-200",
        dragging ? "scale-[1.01]" : "hover:scale-[1.005]",
      )}
      style={{
        borderColor: dragging ? accentColor : file ? `${accentColor}88` : "rgba(255,255,255,0.1)",
        background: dragging ? `${accentColor}0e` : file ? `${accentColor}07` : "rgba(255,255,255,0.018)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-200"
        style={{
          background: file ? `${accentColor}18` : "rgba(255,255,255,0.04)",
          borderColor: file ? `${accentColor}30` : "rgba(255,255,255,0.1)",
        }}
      >
        {file
          ? <CheckCircle2 className="h-6 w-6" style={{ color: accentColor }} />
          : <Icon className="h-6 w-6 text-white/40 transition-colors group-hover:text-white/65" />
        }
      </div>
      <div className="space-y-1.5">
        {file ? (
          <>
            <p className="max-w-[180px] truncate text-sm font-semibold text-white">{file.name}</p>
            <p className="text-xs text-white/40">{(file.size / 1024).toFixed(1)} KB · Click to replace</p>
          </>
        ) : (
          <>
            <p className={cn("text-sm font-semibold", accentClass)}>{label}</p>
            <p className="text-xs text-white/38">{sublabel}</p>
          </>
        )}
      </div>
      {!file && (
        <div className="flex items-center gap-1.5 text-white/28">
          <Upload className="h-3 w-3" />
          <span className="text-xs">Drag & drop or click</span>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   JD PICKER
───────────────────────────────────────── */
function JDPicker({
  selectedFilename,
  onSelect,
  loading,
  stretch = false,
}: {
  selectedFilename: string | null
  onSelect: (jd: JDEntry) => void
  loading: boolean
  stretch?: boolean
}) {
  const [search, setSearch] = useState("")
  const [openCategory, setOpenCategory] = useState<string | null>("AI & Machine Learning")

  const filtered = useMemo(() => {
    if (!search.trim()) return PREMADE_JDS
    const q = search.toLowerCase()
    return PREMADE_JDS.filter(
      jd => jd.title.toLowerCase().includes(q) || jd.category.toLowerCase().includes(q)
    )
  }, [search])

  const grouped = useMemo(() => {
    const map = new Map<string, JDEntry[]>()
    for (const jd of filtered) {
      if (!map.has(jd.category)) map.set(jd.category, [])
      map.get(jd.category)!.push(jd)
    }
    // sort by CATEGORY_ORDER
    const result: { category: string; jds: JDEntry[] }[] = []
    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat)) result.push({ category: cat, jds: map.get(cat)! })
    }
    // any remaining categories not in order
    for (const [cat, jds] of map) {
      if (!CATEGORY_ORDER.includes(cat)) result.push({ category: cat, jds })
    }
    return result
  }, [filtered])

  // When searching, expand all categories
  useEffect(() => {
    if (search.trim()) setOpenCategory("__all__")
    else setOpenCategory("AI & Machine Learning")
  }, [search])

  const showAll = search.trim() !== "" || openCategory === "__all__"

  return (
    <div className={cn("flex flex-col gap-3", stretch && "min-h-0 flex-1")}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search job titles or categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/25 focus:border-violet-400/40 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Category accordion list */}
      <div className={cn(
        "space-y-1.5 overflow-y-auto pr-1 [scrollbar-color:rgba(167,139,250,0.36)_rgba(255,255,255,0.04)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-300/30 [&::-webkit-scrollbar-thumb:hover]:bg-violet-300/45 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-white/[0.035]",
        stretch ? "min-h-[340px] flex-1" : "max-h-[340px]",
      )}>
        {grouped.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-sm text-white/30">
            No job descriptions match your search.
          </div>
        )}
        {grouped.map(({ category, jds }) => {
          const colors = CATEGORY_COLORS[category] ?? { accent: "#7A4DFF", bg: "rgba(122,77,255,0.08)", border: "rgba(122,77,255,0.2)" }
          const isOpen = showAll || openCategory === category

          return (
            <div key={category} className="rounded-2xl border border-white/8 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => !showAll && setOpenCategory(isOpen ? null : category)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ background: colors.accent }}
                  />
                  <span className="text-sm font-semibold text-white">{category}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ color: colors.accent, background: colors.bg }}
                  >
                    {jds.length}
                  </span>
                </div>
                {!showAll && (
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 text-white/30 transition-transform", isOpen && "rotate-180")}
                  />
                )}
              </button>

              {/* JD chips */}
              {isOpen && (
                <div className="flex flex-wrap gap-2 px-4 pb-3">
                  {jds.map(jd => {
                    const selected = selectedFilename === jd.filename
                    return (
                      <button
                        key={jd.filename}
                        onClick={() => onSelect(jd)}
                        disabled={loading}
                        className={cn(
                          "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                            ? "text-white"
                            : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80"
                        )}
                        style={selected ? {
                          background: colors.bg,
                          borderColor: colors.border,
                          color: colors.accent,
                          boxShadow: `0 0 0 1px ${colors.border}`,
                        } : undefined}
                      >
                        {selected && <span className="mr-1.5">✓</span>}
                        {jd.title}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   ANALYZING VIEW (multi-stage loading)
───────────────────────────────────────── */
const ANALYSIS_STAGES = [
  "Parsing CV and extracting structure…",
  "Identifying hard and soft skills…",
  "Matching against job requirements…",
  "Scoring fit across 8 dimensions…",
  "Generating candidate advice…",
  "Finalising report…",
]

function AnalyzingView({ cvName, jdName }: { cvName: string; jdName: string }) {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx(i => Math.min(i + 1, ANALYSIS_STAGES.length - 1))
    }, 7000)
    return () => clearInterval(id)
  }, [])

  const progress = Math.round(((stageIdx + 1) / ANALYSIS_STAGES.length) * 100)

  return (
    <div className="flex min-h-[62vh] flex-col items-center justify-center gap-8 py-16">
      {/* Orbital ring */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-violet-400/12" />
        <div
          className="animate-orbit absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#7A4DFF", borderRightColor: "rgba(122,77,255,0.35)" }}
        />
        <Sparkles className="animate-pulse-icon h-7 w-7 text-violet-300" />
      </div>

      {/* Stage message */}
      <div className="space-y-2 text-center">
        <div key={stageIdx} className="animate-stage-in text-lg font-semibold tracking-[-0.02em] text-white">
          {ANALYSIS_STAGES[stageIdx]}
        </div>
        <div className="text-sm text-white/40">This may take 30–60 seconds</div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-300 transition-all duration-[1400ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/28">
          <span>Stage {stageIdx + 1} of {ANALYSIS_STAGES.length}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* File context chips */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/8 px-3 py-1.5 text-xs text-violet-200/80">
          <FileText className="h-3 w-3 shrink-0" />
          <span className="max-w-[160px] truncate">{cvName}</span>
        </div>
        <div className="h-1 w-1 rounded-full bg-white/20" />
        <div className="flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1.5 text-xs text-cyan-200/80">
          <Briefcase className="h-3 w-3 shrink-0" />
          <span className="max-w-[160px] truncate">{jdName}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const BATCH_ANALYSIS_STAGES = [
  "Extracting candidate archive...",
  "Reading CV files in sequence...",
  "Evaluating each CV against the job description...",
  "Normalizing scores for comparison...",
  "Building enterprise screening table...",
]

function BatchAnalyzingView({ archiveName, jdName }: { archiveName: string; jdName: string }) {
  const [stageIdx, setStageIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStageIdx(i => Math.min(i + 1, BATCH_ANALYSIS_STAGES.length - 1))
    }, 8000)
    return () => clearInterval(id)
  }, [])

  const progress = Math.round(((stageIdx + 1) / BATCH_ANALYSIS_STAGES.length) * 100)

  return (
    <div className="mx-auto flex min-h-[68vh] w-full max-w-6xl flex-col justify-center gap-6 py-12">
      <div className="flex flex-col gap-5 rounded-[32px] border border-cyan-300/14 bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10">
              <Archive className="h-6 w-6 text-cyan-200" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_18px_rgba(167,139,250,0.75)]" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/55">Bulk CV screening</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">
                Screening candidate archive
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/48">
                Each CV is being evaluated against the same job description. The result will be a ranked table focused on score signals and hiring readiness.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-white/55">
            {progress}% complete
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-violet-300/16 bg-violet-300/8 px-4 py-3 text-sm text-violet-100/75">
            <Archive className="h-4 w-4 shrink-0" />
            <span className="truncate">{archiveName}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-cyan-300/16 bg-cyan-300/8 px-4 py-3 text-sm text-cyan-100/75">
            <Briefcase className="h-4 w-4 shrink-0" />
            <span className="truncate">{jdName}</span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/35">
            <span>Batch pipeline</span>
            <span>Stage {stageIdx + 1} of {BATCH_ANALYSIS_STAGES.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-300 transition-all duration-[1400ms] ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div key={stageIdx} className="mt-3 animate-stage-in text-sm font-semibold text-white/78">
            {BATCH_ANALYSIS_STAGES[stageIdx]}
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
          <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_1fr] gap-3 border-b border-white/8 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            <span>CV file</span>
            <span>Overall</span>
            <span>Skills</span>
            <span>Experience</span>
            <span>Recommendation</span>
          </div>
          {[0, 1, 2, 3].map(row => (
            <div key={row} className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_1fr] gap-3 border-b border-white/[0.045] px-4 py-4 last:border-b-0">
              <div className="h-3 rounded-full bg-white/10" />
              <div className="h-3 rounded-full bg-cyan-300/18" />
              <div className="h-3 rounded-full bg-violet-300/18" />
              <div className="h-3 rounded-full bg-white/10" />
              <div className="h-3 rounded-full bg-emerald-300/16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BatchResultsDashboard({
  batch,
  onReset,
}: {
  batch: BatchAnalysisResponse
  onReset: () => void
}) {
  const rows = useMemo(() => buildBatchRows(batch), [batch])
  const successfulRows = rows.filter(row => !row.error && row.overall !== null)
  const averageScore = successfulRows.length
    ? Math.round(successfulRows.reduce((sum, row) => sum + (row.overall ?? 0), 0) / successfulRows.length)
    : null
  const strongMatches = rows.filter(row => !row.error && (row.overall ?? 0) >= 75).length
  const reviewQueue = rows.filter(row => row.error || (row.overall ?? 0) < 75).length

  return (
    <div className="animate-result-in space-y-6">
      <div className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/24 bg-cyan-300/10">
              <Table2 className="h-6 w-6 text-cyan-200" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/55">Batch analysis complete</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                Bulk CV screening table
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">
                Ranked candidate results for one job description. The detailed single-CV recommendation view is intentionally replaced with the score fields HR teams need for fast screening.
              </p>
            </div>
          </div>
          <Button
            onClick={onReset}
            className="w-full rounded-full border border-white/12 bg-white/[0.06] text-white hover:bg-white/[0.1] lg:w-auto"
          >
            Analyze another batch
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <Users className="h-4 w-4 text-cyan-200/80" />
            <div className="mt-3 text-2xl font-semibold text-white">{batch.total ?? rows.length}</div>
            <div className="mt-1 text-xs text-white/38">CVs screened</div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <BarChart3 className="h-4 w-4 text-violet-200/80" />
            <div className="mt-3 text-2xl font-semibold text-white">{formatScore(averageScore)}</div>
            <div className="mt-1 text-xs text-white/38">Average score</div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-200/80" />
            <div className="mt-3 text-2xl font-semibold text-white">{strongMatches}</div>
            <div className="mt-1 text-xs text-white/38">Strong matches</div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <FileSearch className="h-4 w-4 text-amber-200/80" />
            <div className="mt-3 text-2xl font-semibold text-white">{reviewQueue}</div>
            <div className="mt-1 text-xs text-white/38">Need review</div>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-violet-300/14 bg-violet-300/8 px-4 py-3 text-violet-100/70">
            <span className="text-white/38">Archive: </span>
            <span className="break-words">{batch.archive ?? "Uploaded ZIP"}</span>
          </div>
          <div className="min-w-0 rounded-2xl border border-cyan-300/14 bg-cyan-300/8 px-4 py-3 text-cyan-100/70">
            <span className="text-white/38">Job description: </span>
            <span className="break-words">{batch.job_description ?? "Selected JD"}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.035] text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                <th className="px-5 py-4">CV name</th>
                <th className="px-4 py-4">Overall</th>
                <th className="px-4 py-4">Technical</th>
                <th className="px-4 py-4">Experience</th>
                <th className="px-4 py-4">Education</th>
                <th className="px-4 py-4">Soft skills</th>
                <th className="px-4 py-4">Responsibility</th>
                <th className="px-5 py-4">Hiring recommendation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.cvName}-${index}`} className="border-b border-white/[0.055] last:border-b-0 hover:bg-white/[0.025]">
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        row.error ? "border-red-300/20 bg-red-300/8" : "border-white/10 bg-white/[0.04]"
                      )}>
                        {row.error
                          ? <AlertCircle className="h-4 w-4 text-red-200" />
                          : <FileText className="h-4 w-4 text-white/48" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{row.cvName}</div>
                        <div className={cn("mt-0.5 text-xs", row.error ? "text-red-200/70" : "text-white/35")}>
                          {row.error ?? row.classification}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <ScorePill score={row.overall} emphasis />
                  </td>
                  <td className="px-4 py-4"><ScorePill score={row.technical} /></td>
                  <td className="px-4 py-4"><ScorePill score={row.experience} /></td>
                  <td className="px-4 py-4"><ScorePill score={row.education} /></td>
                  <td className="px-4 py-4"><ScorePill score={row.softSkills} /></td>
                  <td className="px-4 py-4"><ScorePill score={row.responsibility} /></td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex max-w-[220px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold",
                      row.error
                        ? "border-red-300/18 bg-red-300/8 text-red-100/75"
                        : (row.overall ?? 0) >= 75
                          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100/80"
                          : "border-amber-300/20 bg-amber-300/10 text-amber-100/80"
                    )}>
                      <span className="truncate">{row.recommendation}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {batch.skipped_files && batch.skipped_files.length > 0 && (
        <div className="rounded-2xl border border-amber-300/18 bg-amber-300/8 px-4 py-3 text-sm text-amber-100/72">
          Skipped {batch.skipped_files.length} unsupported file{batch.skipped_files.length === 1 ? "" : "s"} from the ZIP.
        </div>
      )}
    </div>
  )
}

function ScorePill({ score, emphasis = false }: { score: number | null; emphasis?: boolean }) {
  return (
    <span className={cn(
      "inline-flex min-w-[58px] justify-center rounded-full border px-3 py-1.5 text-xs font-semibold",
      score === null
        ? "border-white/10 bg-white/[0.035] text-white/35"
        : emphasis
          ? "border-violet-300/24 bg-violet-300/12 text-violet-100"
          : "border-white/10 bg-white/[0.045] text-white/68"
    )}>
      {formatScore(score)}
    </span>
  )
}

export function CVAnalyzer() {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [selectedJd, setSelectedJd] = useState<JDEntry | null>(null)
  const [jdMode, setJdMode] = useState<"library" | "upload">("library")
  const [jdLoading, setJdLoading] = useState(false)
  const { result, setResult, clearResult, isComplete } = useAnalysis()
  const [batchResult, setBatchResult] = useState<BatchAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wasRestored, setWasRestored] = useState(false)
  const isBatchCandidate = isZipFile(cvFile)

  /* Track if result was pre-loaded from localStorage (not this session's run) */
  useEffect(() => {
    if (isComplete && !loading) setWasRestored(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Scroll to top when fresh analysis result arrives */
  useEffect(() => {
    if (result && !wasRestored) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  useEffect(() => {
    if (batchResult) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [batchResult])

  const switchJdMode = (mode: "library" | "upload") => {
    if (mode === jdMode) return
    setJdMode(mode)
    setJdFile(null)
    setSelectedJd(null)
  }

  const canRun = !!cvFile && !!jdFile && !loading && !jdLoading
  const workspacePanelHeight = jdMode === "upload" ? "xl:h-[760px]" : "xl:h-[586px]"

  const handleSelectJd = async (jd: JDEntry) => {
    setSelectedJd(jd)
    setJdFile(null)
    setJdLoading(true)
    try {
      const res = await fetch(`/jds/${encodeURIComponent(jd.filename)}`)
      if (!res.ok) throw new Error("Failed to load job description")
      const blob = await res.blob()
      const file = new File([blob], jd.filename, { type: "application/pdf" })
      setJdFile(file)
    } catch {
      setError(`Could not load "${jd.title}". Please try again.`)
      setSelectedJd(null)
    } finally {
      setJdLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!cvFile || !jdFile) return
    setLoading(true)
    setError(null)
    setWasRestored(false)
    setBatchResult(null)
    clearResult()
    try {
      const form = new FormData()
      form.append("cv_file", cvFile)
      form.append("jd_file", jdFile)
      const res = await fetch("/api/analyze_cv", { method: "POST", body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const data = await res.json()
      if (isBatchAnalysis(data)) {
        setBatchResult(data)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message ?? "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    clearResult()
    setBatchResult(null)
    setError(null)
    setCvFile(null)
    setJdFile(null)
    setSelectedJd(null)
  }

  /* ── RESULTS VIEW ── */
  if (batchResult) {
    return <BatchResultsDashboard batch={batchResult} onReset={handleReset} />
  }

  if (result) {
    return (
      <div className="animate-result-in">
        {wasRestored && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-violet-400/18 bg-violet-400/8 px-5 py-3">
            <div className="flex items-center gap-2.5 text-sm text-violet-200/80">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-300" />
              Previous analysis restored from your last session.
            </div>
            <button
              onClick={handleReset}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white/80"
            >
              Clear &amp; start fresh
            </button>
          </div>
        )}
        <ATSDashboard llm_analysis={result} onReset={handleReset} />
      </div>
    )
  }

  /* ── ANALYZING VIEW ── */
  if (loading) {
    if (isBatchCandidate) {
      return (
        <BatchAnalyzingView
          archiveName={cvFile?.name ?? "CV archive"}
          jdName={selectedJd?.title ?? jdFile?.name ?? "Job Description"}
        />
      )
    }

    return (
      <AnalyzingView
        cvName={cvFile?.name ?? "CV"}
        jdName={selectedJd?.title ?? jdFile?.name ?? "Job Description"}
      />
    )
  }

  /* ── UPLOAD VIEW ── */
  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered fit analysis
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
          CV Analyzer
        </h1>
        <p className="max-w-2xl text-base leading-8 text-white/60">
          Upload one CV or a ZIP of CVs, choose a job description, and receive the right analysis view for individual or bulk screening.
        </p>
      </div>

      {/* UPLOAD STATUS STRIP */}
      <ProductPanel className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {/* CV status */}
          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              cvFile ? "border-violet-400/30 bg-violet-400/15" : "border-white/10 bg-white/[0.04]"
            )}>
              {isBatchCandidate
                ? <Archive className="h-4 w-4 text-violet-300" />
                : <FileText className={cn("h-4 w-4", cvFile ? "text-violet-300" : "text-white/35")} />
              }
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">{isBatchCandidate ? "CV Batch" : "Candidate CV"}</div>
              <div className={cn("mt-1 text-sm font-semibold", cvFile ? "text-white" : "text-white/35")}>
                {cvFile ? isBatchCandidate ? "Batch uploaded" : "Uploaded" : "Pending"}
              </div>
              <div className="mt-0.5 truncate text-xs text-white/35">
                {cvFile ? cvFile.name : "No file selected"}
              </div>
            </div>
          </div>

          {/* JD status */}
          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              jdLoading ? "border-cyan-400/30 bg-cyan-400/15" : jdFile ? "border-cyan-400/30 bg-cyan-400/15" : "border-white/10 bg-white/[0.04]"
            )}>
              {jdLoading
                ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                : <Briefcase className={cn("h-4 w-4", jdFile ? "text-cyan-300" : "text-white/35")} />
              }
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Job Description</div>
              <div className={cn("mt-1 text-sm font-semibold", jdFile ? "text-white" : "text-white/35")}>
                {jdLoading ? "Loading…" : jdFile ? "Selected" : "Pending"}
              </div>
              <div className="mt-0.5 truncate text-xs text-white/35">
                {jdFile && jdMode === "upload" ? jdFile.name : selectedJd ? selectedJd.title : jdMode === "upload" ? "Upload your JD file" : "Select from library →"}
              </div>
            </div>
          </div>

          {/* Ready status */}
          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              canRun ? "border-emerald-400/30 bg-emerald-400/15" : "border-white/10 bg-white/[0.04]"
            )}>
              <CheckCircle2 className={cn("h-4 w-4", canRun ? "text-emerald-300" : "text-white/35")} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Ready</div>
              <div className={cn("mt-1 text-sm font-semibold", canRun ? "text-white" : "text-white/35")}>
                {canRun ? "Ready" : "Waiting"}
              </div>
              <div className="mt-0.5 text-xs text-white/35">
                {cvFile && jdFile ? isBatchCandidate ? "Batch ready" : "Both ready" : "Awaiting setup"}
              </div>
            </div>
          </div>

          {/* Analysis status */}
          <div className="flex gap-3 rounded-[22px] border border-white/8 bg-black/20 px-4 py-4">
            <div className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              loading ? "border-violet-400/30 bg-violet-400/15" : "border-white/10 bg-white/[0.04]"
            )}>
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                : <FileSearch className="h-4 w-4 text-white/35" />
              }
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Analysis</div>
              <div className={cn("mt-1 text-sm font-semibold", loading ? "text-white" : "text-white/35")}>
                {loading ? "Running" : "Idle"}
              </div>
              <div className="mt-0.5 text-xs text-white/35">
                {loading ? "Processing files…" : "Awaiting run command"}
              </div>
            </div>
          </div>
        </div>
      </ProductPanel>

      {/* MAIN WORKSPACE */}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.1fr]">

        {/* LEFT: CV UPLOAD + SELECTED JD DISPLAY */}
        <ProductPanel className={cn("self-start p-6 md:p-7", workspacePanelHeight)}>
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Step 1</div>
                <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Upload CVs</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55">
                {cvFile ? isBatchCandidate ? "Batch ready" : "CV ready" : "Pending"}
              </div>
            </div>

            {/* CV Drop zone */}
            <DropZone
              label="Candidate CV or ZIP"
              sublabel="PDF, DOCX, TXT, or ZIP"
              accept=".pdf,.docx,.txt,.zip"
              file={cvFile}
              onFile={setCvFile}
              icon={FileText}
              accentColor="#7A4DFF"
              accentClass="text-violet-300"
            />

            {/* Step 2 — JD source toggle */}
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.22em] text-white/35">Step 2 · Job description</div>

              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => switchJdMode("library")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                    jdMode === "library"
                      ? "border-violet-400/40 bg-violet-400/12 text-violet-200"
                      : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60"
                  )}
                >
                  <Library className="h-3.5 w-3.5" />
                  Use our library
                </button>
                <button
                  onClick={() => switchJdMode("upload")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                    jdMode === "upload"
                      ? "border-cyan-400/40 bg-cyan-400/12 text-cyan-200"
                      : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload my own
                </button>
              </div>

              {/* Library mode — selected JD display */}
              {jdMode === "library" && (
                selectedJd ? (
                  <div
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all"
                    style={{
                      background: CATEGORY_COLORS[selectedJd.category]?.bg ?? "rgba(122,77,255,0.08)",
                      borderColor: CATEGORY_COLORS[selectedJd.category]?.border ?? "rgba(122,77,255,0.2)",
                    }}
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: CATEGORY_COLORS[selectedJd.category]?.accent ?? "#7A4DFF" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{selectedJd.title}</div>
                      <div className="mt-0.5 text-xs text-white/40">{selectedJd.category}</div>
                    </div>
                    {jdLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-3.5 text-center text-xs text-white/28">
                    No job description selected · Choose one from the library →
                  </div>
                )
              )}

              {/* Upload mode — JD drop zone */}
              {jdMode === "upload" && (
                <DropZone
                  label="Job Description"
                  sublabel="PDF, DOCX, or TXT"
                  accept=".pdf,.docx,.txt"
                  file={jdFile}
                  onFile={setJdFile}
                  icon={Briefcase}
                  accentColor="#06b6d4"
                  accentClass="text-cyan-300"
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-[22px] border border-red-400/20 bg-red-400/8 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div>
                    <div className="text-sm font-medium text-red-200">Analysis failed</div>
                    <div className="mt-1 text-sm leading-6 text-red-100/75">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full rounded-full bg-[#7A4DFF] text-white shadow-[0_16px_40px_rgba(122,77,255,0.28)] hover:bg-[#6a3ff2] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                onClick={() => void handleAnalyze()}
                disabled={!canRun}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isBatchCandidate ? "Screening batch..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {isBatchCandidate ? "Run Batch Analysis" : "Run Analysis"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {!cvFile && (
                <p className="text-center text-xs text-white/28">Upload one CV or a ZIP of CVs above to get started</p>
              )}
              {cvFile && !jdFile && (
                <p className="text-center text-xs text-white/28">Select a job description from the library →</p>
              )}
            </div>
          </div>
        </ProductPanel>

        {/* RIGHT: JD PICKER */}
        <div className={cn("min-h-0", workspacePanelHeight)}>

          {/* JD Library */}
          <ProductPanel className={cn("flex h-full p-5 transition-opacity duration-200 md:p-6", jdMode === "upload" && "pointer-events-none opacity-35")}>
            <div className="flex h-full min-h-0 w-full flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/35">Step 2 · Job description library</div>
                  <div className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white">Select a job description</div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55">
                  {PREMADE_JDS.length} roles
                </div>
              </div>
              <JDPicker
                selectedFilename={selectedJd?.filename ?? null}
                onSelect={handleSelectJd}
                loading={jdLoading}
                stretch
              />
            </div>
          </ProductPanel>

        </div>
      </div>
    </div>
  )
}

export default CVAnalyzer
