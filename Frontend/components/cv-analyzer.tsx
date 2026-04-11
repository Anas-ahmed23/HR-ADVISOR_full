"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ATSDashboard } from "@/components/ats-dashboard"
import { ProductPanel } from "@/components/product-shell"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  FileText,
  Library,
  Loader2,
  Search,
  Sparkles,
  Target,
  Upload,
  Zap,
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
}: {
  selectedFilename: string | null
  onSelect: (jd: JDEntry) => void
  loading: boolean
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
    <div className="flex flex-col gap-3">
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
      <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-0.5">
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
   MAIN COMPONENT
───────────────────────────────────────── */
export function CVAnalyzer() {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [selectedJd, setSelectedJd] = useState<JDEntry | null>(null)
  const [jdMode, setJdMode] = useState<"library" | "upload">("library")
  const [jdLoading, setJdLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const switchJdMode = (mode: "library" | "upload") => {
    if (mode === jdMode) return
    setJdMode(mode)
    setJdFile(null)
    setSelectedJd(null)
  }

  const canRun = !!cvFile && !!jdFile && !loading && !jdLoading

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
    setResult(null)
    try {
      const form = new FormData()
      form.append("cv_file", cvFile)
      form.append("jd_file", jdFile)
      const res = await fetch("/api/analyze_cv", { method: "POST", body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      setResult(await res.json())
    } catch (err: any) {
      setError(err.message ?? "Analysis failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setCvFile(null)
    setJdFile(null)
    setSelectedJd(null)
  }

  /* ── RESULTS VIEW ── */
  if (result) {
    return <ATSDashboard llm_analysis={result} onReset={handleReset} />
  }

  /* ── UPLOAD VIEW ── */
  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          Evidence-based AI analysis
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
          CV Analyzer
        </h1>
        <p className="max-w-2xl text-base leading-8 text-white/60">
          Upload a candidate CV, select a job description, and get structured fit analysis, skill extraction, and evidence-backed scoring in seconds.
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
              <FileText className={cn("h-4 w-4", cvFile ? "text-violet-300" : "text-white/35")} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/35">Candidate CV</div>
              <div className={cn("mt-1 text-sm font-semibold", cvFile ? "text-white" : "text-white/35")}>
                {cvFile ? "Uploaded" : "Pending"}
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
                {cvFile && jdFile ? "Both ready" : "Awaiting setup"}
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
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">

        {/* LEFT: CV UPLOAD + SELECTED JD DISPLAY */}
        <ProductPanel className="p-6 md:p-7">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Step 1</div>
                <div className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white">Upload your CV</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/55">
                {cvFile ? "CV ready" : "Pending"}
              </div>
            </div>

            {/* CV Drop zone */}
            <DropZone
              label="Candidate CV"
              sublabel="PDF, DOCX, or TXT"
              accept=".pdf,.docx,.txt"
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
                    Analyzing — this may take a moment…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run Analysis
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {!cvFile && (
                <p className="text-center text-xs text-white/28">Upload your CV above to get started</p>
              )}
              {cvFile && !jdFile && (
                <p className="text-center text-xs text-white/28">Select a job description from the library →</p>
              )}
            </div>
          </div>
        </ProductPanel>

        {/* RIGHT: HOW IT WORKS + JD PICKER */}
        <div className="space-y-4">

          {/* How it works */}
          <ProductPanel className="p-5 md:p-6">
            <div className="space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/35">Quick guide</div>
                <div className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-white">How it works</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: FileText,   step: "01", label: "Upload CV",       detail: "Drop your candidate's resume in PDF, DOCX, or TXT format.", accent: "#7A4DFF" },
                  { icon: Briefcase,  step: "02", label: "Pick a JD",       detail: "Browse our library of 130+ curated job descriptions and select one.", accent: "#06b6d4" },
                  { icon: Sparkles,   step: "03", label: "Get insights",    detail: "Receive a full fit score, skill gaps, and recruiter recommendations.", accent: "#34d399" },
                ].map(({ icon: Icon, step, label, detail, accent }) => (
                  <div key={step} className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-black/20 p-3.5">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl border text-[10px] font-bold"
                      style={{ background: `${accent}12`, borderColor: `${accent}25`, color: accent }}
                    >
                      {step}
                    </div>
                    <div className="text-xs font-semibold text-white">{label}</div>
                    <div className="text-[11px] leading-[1.6] text-white/40">{detail}</div>
                  </div>
                ))}
              </div>

              {/* What you get */}
              <div className="grid gap-2 pt-1">
                {[
                  { icon: Target, label: "Fit score",              detail: "Weighted match across 8 dimensions.",                   accent: "text-violet-300", bg: "bg-violet-400/12 border-violet-400/20" },
                  { icon: Brain,  label: "Skill gap analysis",     detail: "Missing & matched skills with evidence.",               accent: "text-cyan-300",   bg: "bg-cyan-400/12 border-cyan-400/20"   },
                  { icon: Zap,    label: "Recruiter advice",       detail: "Priority improvements and next steps.",                 accent: "text-emerald-300", bg: "bg-emerald-400/12 border-emerald-400/20" },
                ].map(({ icon: Icon, label, detail, accent, bg }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-2.5">
                    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border", bg)}>
                      <Icon className={cn("h-3.5 w-3.5", accent)} />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{label}</div>
                      <div className="text-[11px] text-white/40">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ProductPanel>

          {/* JD Library */}
          <ProductPanel className={cn("p-5 md:p-6 transition-opacity duration-200", jdMode === "upload" && "pointer-events-none opacity-35")}>
            <div className="space-y-4">
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
              />
            </div>
          </ProductPanel>

        </div>
      </div>
    </div>
  )
}

export default CVAnalyzer
