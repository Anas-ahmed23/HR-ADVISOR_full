# -*- coding: utf-8 -*-
"""
GradVoice HR Advisor â€“ Advanced Analyzer (Updated)
Flair NER + Keyword Matching + Azure OpenAI (Evidence-based, RAG-ready)
"""

import os
import json
import re
import zipfile
import tempfile
from datetime import datetime
from pathlib import Path

import docx
import pdfplumber
from openai import AzureOpenAI
from flair.models import SequenceTagger
from flair.data import Sentence


# ============================================================
# Azure OpenAI Configuration (from environment variables)
# ============================================================

AZURE_OPENAI_API_KEY = os.getenv("HR_AZURE_OPENAI_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("HR_AZURE_OPENAI_ENDPOINT") or os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("HR_AZURE_OPENAI_DEPLOYMENT") or os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1")
AZURE_OPENAI_API_VERSION = os.getenv("HR_AZURE_OPENAI_API_VERSION") or os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

if not AZURE_OPENAI_API_KEY:
    raise RuntimeError("Missing AZURE_OPENAI_API_KEY environment variable")

client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION,
)


# ============================================================
# Load Flair NER Model ONCE
# ============================================================

print("Loading Flair NER model...")
tagger = SequenceTagger.load("flair/ner-english-large")
print("Model loaded successfully.")


# ============================================================
# Text Extraction
# ============================================================

def extract_text(path_or_text):
    if isinstance(path_or_text, str) and not os.path.exists(path_or_text):
        return path_or_text.strip()

    if isinstance(path_or_text, str) and os.path.exists(path_or_text):
        lower = path_or_text.lower()

        if lower.endswith(".pdf"):
            text = ""
            with pdfplumber.open(path_or_text) as pdf:
                for page in pdf.pages:
                    content = page.extract_text()
                    if content:
                        text += content + "\n"
            return text.strip()

        if lower.endswith(".docx"):
            document = docx.Document(path_or_text)
            return "\n".join(p.text for p in document.paragraphs).strip()

        if lower.endswith(".txt"):
            with open(path_or_text, "r", encoding="utf-8") as f:
                return f.read().strip()

    return ""


# ============================================================
# Skill Dictionaries
# ============================================================

TECH_SKILLS = {
    "programming_languages": [
        "java", "python", "c", "c++", "c#", "javascript", "typescript", "go", "kotlin",
        "php", "ruby", "swift", "scala", "r", "matlab", "objective-c", "perl"
    ],
    "frontend_frameworks": [
        "react", "reactjs", "angular", "angularjs", "vue", "next.js", "nuxt.js",
        "jquery", "bootstrap", "tailwind css", "backbone.js", "ember.js"
    ],
    "backend_frameworks": [
        "spring", "spring boot", "spring mvc", "spring security", "hibernate", "django",
        "flask", "express", "node.js", "asp.net", "asp.net core", "laravel", "fastapi",
        "struts", "play framework", "grails"
    ],
    "databases": [
        "sql", "mysql", "postgresql", "oracle", "mongodb", "mssql", "ms sql server",
        "redis", "cassandra", "elasticsearch", "sqlite", "db2", "snowflake",
        "bigquery", "redshift"
    ],
    "cloud_platforms": [
        "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud",
        "heroku", "digitalocean", "oracle cloud", "ibm cloud"
    ],
    "devops_tools": [
        "docker", "kubernetes", "jenkins", "gitlab ci", "github actions", "ansible",
        "terraform", "helm", "chef", "puppet", "bamboo", "spinnaker"
    ],
    "testing_tools": [
        "junit", "selenium", "pytest", "mocha", "jasmine", "cypress", "postman",
        "soapui", "jest", "karma"
    ],
    "data_analytics": [
        "excel", "advanced excel", "power bi", "tableau", "qlikview", "qliksense",
        "pandas", "numpy", "matplotlib"
    ],
    "ml_ai": [
        "machine learning", "deep learning", "computer vision", "nlp",
        "natural language processing", "scikit-learn", "tensorflow",
        "pytorch", "keras", "xgboost", "lightgbm"
    ],
    "integration_apis": [
        "rest", "rest api", "rest apis", "soap", "graphql", "web services",
        "microservices", "oauth2", "openid connect", "grpc"
    ],
    "security": [
        "security", "application security", "penetration testing", "owasp", "jwt",
        "encryption", "identity and access management"
    ]
}

SOFT_SKILLS = {
    "communication": [
        "communication", "presentation", "public speaking", "storytelling",
        "writing skills", "verbal communication"
    ],
    "collaboration": [
        "teamwork", "cross-functional collaboration", "collaborative",
        "stakeholder management", "working with stakeholders"
    ],
    "leadership": [
        "leadership", "mentoring", "coaching", "team lead", "managing teams",
        "people management"
    ],
    "problem_solving": [
        "problem solving", "analytical skills", "critical thinking",
        "troubleshooting", "root cause analysis"
    ],
    "organization": [
        "time management", "prioritization", "organizational skills",
        "planning", "multitasking"
    ],
    "adaptability": [
        "adaptability", "flexibility", "change management"
    ],
    "customer_focus": [
        "customer service", "customer focus", "client relationships"
    ]
}

DOMAIN_SKILLS = {
    "finance": [
        "banking", "financial services", "trading", "investment",
        "fintech", "risk management", "asset management", "insurance"
    ],
    "healthcare": [
        "healthcare", "clinical", "medical records", "ehr", "emr",
        "claims processing", "pharma", "biotech"
    ],
    "retail": [
        "retail", "e-commerce", "supply chain", "inventory management",
        "order management", "logistics"
    ],
    "education": [
        "education", "lms", "learning management system", "curriculum design",
        "student management"
    ],
    "hr_domain": [
        "human resources", "talent acquisition", "recruitment", "onboarding",
        "performance management", "payroll", "compensation and benefits"
    ],
    "marketing": [
        "digital marketing", "seo", "sem", "social media marketing",
        "email marketing", "content marketing", "brand management"
    ],
    "sales": [
        "b2b sales", "b2c sales", "account management", "inside sales",
        "business development", "lead generation", "pipeline management"
    ]
}

TOOLS_PLATFORMS = {
    "project_tools": [
        "jira", "trello", "asana", "microsoft project", "confluence",
        "azure devops"
    ],
    "crm_tools": [
        "salesforce", "hubspot", "zoho crm", "dynamics 365"
    ],
    "design_tools": [
        "figma", "adobe xd", "sketch", "photoshop", "illustrator",
        "invision"
    ],
    "office_tools": [
        "microsoft office", "ms word", "powerpoint", "google docs",
        "google sheets", "google slides"
    ],
    "erp_tools": [
        "sap", "sap hana", "oracle erp", "netsuite"
    ]
}

METHODOLOGIES = {
    "delivery": [
        "agile", "scrum", "kanban", "waterfall", "scaled agile",
        "safe", "devops"
    ],
    "quality": [
        "tdd", "bdd", "continuous integration", "continuous delivery",
        "continuous deployment", "ci/cd", "code review", "refactoring"
    ]
}

CERTIFICATIONS = {
    "cloud_certs": [
        "aws certified", "azure certified", "gcp certified",
        "aws certified solutions architect", "aws certified developer",
        "azure administrator", "azure solutions architect"
    ],
    "project_certs": [
        "pmp", "prince2", "scrum master", "csm", "psm"
    ],
    "security_certs": [
        "cissp", "ceh", "security+", "cisa"
    ]
}


# ============================================================
# Skill Index
# ============================================================

def build_skill_index():
    index = {}
    for group_name, group_dict in [
        ("technical", TECH_SKILLS),
        ("soft", SOFT_SKILLS),
        ("domain", DOMAIN_SKILLS),
        ("tools", TOOLS_PLATFORMS),
        ("methodology", METHODOLOGIES),
        ("certification", CERTIFICATIONS),
    ]:
        for category, skills in group_dict.items():
            for s in skills:
                term = s.lower().strip()
                index[term] = {
                    "group": group_name,
                    "category": category,
                    "term": term
                }
    return index


SKILL_INDEX = build_skill_index()
FLAT_SKILL_TERMS = list(SKILL_INDEX.keys())

CANONICAL_MAP = {
    "reactjs": "react",
    "angularjs": "angular",
    "ms sql server": "sql server",
    "mssql": "sql server",
    "rest apis": "rest api",
    "rest api": "rest api",
    "web services": "rest",
    "ci/cd": "continuous integration",
    "amazon web services": "aws",
    "microsoft azure": "azure",
    "google cloud": "gcp",
    "advanced excel": "excel"
}


def canonical_skill(term):
    t = term.lower().strip()
    return CANONICAL_MAP.get(t, t)


# ============================================================
# Flair NER Skill Extraction
# ============================================================

def extract_skills_flair(text):
    sentences = re.split(r"[.\n]", text)
    found = []
    for seg in sentences:
        seg = seg.strip()
        if not seg:
            continue
        s = Sentence(seg)
        tagger.predict(s)
        for ent in s.get_spans("ner"):
            if ent.tag in ["MISC", "ORG", "PRODUCT"]:
                candidate = ent.text.lower().strip()
                for term in FLAT_SKILL_TERMS:
                    if candidate == term or term in candidate or candidate in term:
                        found.append(term)
    return list(set(found))


def extract_keyword_skills(text):
    chunks = re.split(r"[.\n:;]", text)
    triggers = [
        "skills", "experience", "knowledge", "expertise",
        "worked with", "worked on", "responsible", "tools",
        "technologies", "proficient", "tech stack", "roles and responsibilities",
        "summary", "profile"
    ]
    candidate_segments = []
    lower_text = text.lower()
    for c in chunks:
        seg = c.strip().lower()
        if any(tr in seg for tr in triggers):
            candidate_segments.append(seg)
    if not candidate_segments:
        candidate_segments = [lower_text]
    combined = " ".join(candidate_segments)
    found = []
    for term in FLAT_SKILL_TERMS:
        pattern = r"\b" + re.escape(term) + r"\b"
        if re.search(pattern, combined):
            found.append(term)
    return list(set(found))


def extract_all_skills(text):
    flair_terms = extract_skills_flair(text)
    keyword_terms = extract_keyword_skills(text)
    merged_terms = set(flair_terms + keyword_terms)
    skills = []
    for t in merged_terms:
        if t in SKILL_INDEX:
            meta = SKILL_INDEX[t]
            skills.append({
                "skill": meta["term"],
                "group": meta["group"],
                "category": meta["category"],
                "canonical": canonical_skill(meta["term"])
            })
    return skills


def summarize_skill_terms(skills):
    return list(set(s["canonical"] for s in skills))


def process_pair(cv_path, jd_path):
    cv_text = extract_text(cv_path)
    jd_text = extract_text(jd_path)

    cv_skills_struct = extract_all_skills(cv_text)
    jd_skills_struct = extract_all_skills(jd_text)

    cv_terms = summarize_skill_terms(cv_skills_struct)
    jd_terms = summarize_skill_terms(jd_skills_struct)

    cv_set = set(cv_terms)
    jd_set = set(jd_terms)

    matched_terms = sorted(list(cv_set.intersection(jd_set)))
    missing_terms = sorted(list(jd_set - cv_set))

    skill_score = len(matched_terms) / (len(jd_terms) + 1e-9)
    experience_score = 1.0
    education_score = 1.0

    final_score = 0.5 * skill_score + 0.25 * experience_score + 0.25 * education_score
    classification = "Strong Match" if final_score >= 0.75 else "Weak Match"

    return {
        "cv_skills_raw": cv_skills_struct,
        "jd_skills_raw": jd_skills_struct,
        "cv_skill_terms": cv_terms,
        "jd_skill_terms": jd_terms,
        "matched_terms": matched_terms,
        "missing_terms": missing_terms,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "final_score": final_score,
        "classification": classification
    }


# ============================================================
# JD Bank Scoring (optional batch feature)
# ============================================================

def extract_jds_zip(zip_path, extract_dir):
    os.makedirs(extract_dir, exist_ok=True)
    if not os.listdir(extract_dir):
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)
    pdf_files = []
    for root, _, files in os.walk(extract_dir):
        for file in files:
            if file.lower().endswith(".pdf"):
                pdf_files.append(os.path.join(root, file))
    return sorted(pdf_files)


def score_cv_against_jd_bank(cv_path, jd_pdf_paths):
    results = []
    for jd_file in jd_pdf_paths:
        try:
            comparison = process_pair(cv_path, jd_file)
            job_title = os.path.splitext(os.path.basename(jd_file))[0]
            results.append({
                "job_title": job_title,
                "jd_file": jd_file,
                "final_score": float(comparison.get("final_score", 0.0)),
                "skill_score": float(comparison.get("skill_score", 0.0)),
                "matched_terms_count": len(comparison.get("matched_terms", [])),
                "missing_terms_count": len(comparison.get("missing_terms", []))
            })
        except Exception as e:
            print(f"Skipped {jd_file} due to error: {e}")
    results.sort(
        key=lambda x: (
            x["final_score"],
            x["skill_score"],
            x["matched_terms_count"],
            -x["missing_terms_count"]
        ),
        reverse=True
    )
    return results


def get_top_3_job_matches(cv_path, zip_path, extract_dir):
    jd_pdf_paths = extract_jds_zip(zip_path, extract_dir)
    ranked_results = score_cv_against_jd_bank(cv_path, jd_pdf_paths)
    top_3 = ranked_results[:3]
    top_3_names = [item["job_title"] for item in top_3]
    return top_3_names, top_3


# ============================================================
# Azure OpenAI LLM HR Reasoning
# ============================================================

SYSTEM_PROMPT = """
You are GradVoice HR Advisor, an ATS-style AI career evaluation assistant.

You evaluate a candidate's CV against a Job Description and produce a professional, readable, and helpful report.

You must behave like a combination of:
- an ATS system,
- an experienced HR recruiter,
- a hiring manager,
- and a career advisor.

Your goal is NOT only to score the candidate, but to:
- explain the match clearly,
- highlight strengths and gaps,
- and give practical advice to improve.

In addition, your output will be stored as a structured JSON knowledge object for a RAG-based voice agent.
Therefore, your JSON must be:
- human-readable,
- machine-readable,
- retrieval-friendly,
- organized into clear key-value pairs,
- and useful as a knowledge base for a voice assistant.

==================================================
GLOBAL RULES (VERY IMPORTANT)
==================================================
- You must NOT hallucinate or invent any skills, tools, experience, responsibilities, or requirements.
- Only mark something as "matched" if there is clear or strongly implied evidence in the CV.
- Use semantic understanding, but always tie it to actual CV evidence.
- If unsure â†’ mark as missing.
- Be realistic, fair, and professional.
- Do NOT overpraise weak candidates.
- Tone must be supportive, clear, and human-readable.
- You MUST fill ALL fields with meaningful content.
- You MUST NOT leave sections empty unless absolutely no information exists.
- If a section would be empty, you MUST generate a reasonable professional output instead.
- You MUST NOT return empty arrays for:
  - ats_summary.top_strengths
  - ats_summary.top_gaps
  - insights.strengths
  - insights.gaps
  - insights.recommendations
  - candidate_advice.priority_improvements
  - job_description_analysis.requirements
  - job_description_analysis.responsibilities
- If no strengths are found, infer them from the candidate's general experience.
- If no gaps are found, infer them from missing JD requirements.
- If the job title is unclear, infer the best matching role from the JD.
- final_score MUST NEVER be 0 unless the CV is completely irrelevant.

==================================================
PHASE 1 â€” UNDERSTAND JD & CV
==================================================
- Identify job role and seniority
- Identify key requirements
- Identify important tools and skills
- Identify industry/domain
- Summarize the JD clearly for later retrieval
- Extract the JD's main responsibilities
- Extract the JD's main requirements
- Extract the JD's key tools and technologies

==================================================
PHASE 2 â€” SKILL EXTRACTION
==================================================
Extract:
- cv_skills_hard
- cv_skills_soft
- jd_skills_hard
- jd_skills_soft

Also build:
- job_description_analysis.job_title
- job_description_analysis.job_summary
- job_description_analysis.requirements
- job_description_analysis.responsibilities
- job_description_analysis.tools_and_technologies
- job_description_analysis.domain
- job_description_analysis.seniority

==================================================
PHASE 3 â€” SEMANTIC MATCHING (EVIDENCE-BASED)
==================================================
For each JD skill:
- Find evidence in CV
- Classify internally as:
  - exact
  - synonym
  - semantic

If no evidence â†’ missing

Each matched skill must include:
- jd_skill
- cv_skill
- match_type
- evidence
- confidence (0.5â€“1.0)

==================================================
PHASE 4 â€” SCORING
==================================================
Calculate:
- skill_score
- experience_score
- education_score
- soft_skill_score
- responsibility_alignment_score
- domain_fit_score
- impact_score
- resume_quality_score

Final score:
final_score =
0.45 * skill_score +
0.25 * experience_score +
0.10 * soft_skill_score +
0.07 * responsibility_alignment_score +
0.05 * education_score +
0.05 * domain_fit_score +
0.03 * impact_score

==================================================
PHASE 5 â€” CLASSIFICATION
==================================================
- 85â€“100 â†’ Excellent Match
- 70â€“84 â†’ Strong Match
- 50â€“69 â†’ Moderate Match
- 30â€“49 â†’ Weak Match
- 0â€“29 â†’ Very Weak Match

==================================================
PHASE 6 â€” ATS STYLE SUMMARY + ADVICE
==================================================
You must generate a report that is:
- easy to read
- professional
- helpful for the candidate

==================================================
PHASE 7 â€” RAG / VOICE AGENT STORAGE
==================================================
Your JSON will be used later by a retrieval-augmented generation (RAG) system and a voice assistant.

==================================================
PHASE 8 â€” ALTERNATIVE JOB RECOMMENDATIONS (MANDATORY)
==================================================
Based EXCLUSIVELY on evidence found in the candidate's CV, generate exactly 2 or 3 real alternative job role recommendations.

RULES (STRICT):
- Recommend real job titles that exist in the industry and job market.
- Base ALL recommendations strictly on skills, experience, domain, and seniority evidenced in the CV.
- Do NOT recommend the same role as the JD being evaluated.
- Do NOT hallucinate or invent skills, tools, or experience not present in the CV.
- Each recommendation MUST have an accurate fit_score (integer 0-100) derived from the CV evidence.
- The fit_score should reflect how well the candidate's CV actually supports that alternative role.
- Each cv_match_skills list MUST contain 3 to 5 actual skills present in the CV that directly support the recommended role.
- Each reason must be 1 to 2 clear, concrete sentences explaining the match â€” no generic filler.
- Order recommendations by fit_score descending.
- Seniority must reflect the level implied by the CV (Junior, Mid-Level, Senior, Lead, Manager).
- Think like an experienced recruiter giving honest, actionable career path advice.

Therefore:
- store information in clean structured sections
- include explicit key-value facts
- include direct answer-ready voice-agent facts
- include retrieval chunks written as short natural-language summaries
- make retrieval_chunks concise, factual, and searchable
- do not repeat useless text
- do not use markdown
- do not include explanations outside the JSON

The RAG fields must help answer questions like:
- What is the candidate's final score?
- What role is this evaluation for?
- What are the matched skills?
- What are the missing skills?
- Why is the candidate a weak or strong match?
- What should the candidate improve?
- Is the candidate ready to apply?
- What does the JD require?
- What are the job responsibilities?
- What tools or technologies does the JD mention?
- What is the role about?

==================================================
JOB DESCRIPTION ANALYSIS (MANDATORY)
==================================================
You must return a dedicated section called "job_description_analysis" that stores the JD information clearly for later retrieval.

This section must include:
- job_title
- job_summary
- requirements
- responsibilities
- tools_and_technologies
- domain
- seniority

Rules:
- job_summary must explain the JD clearly in 2 to 4 sentences.
- requirements must contain the main JD requirements, ordered by importance.
- responsibilities must contain the main duties or expected tasks in the JD.
- tools_and_technologies must include specific tools, platforms, programming languages, frameworks, systems, or technologies explicitly mentioned or strongly implied in the JD.
- domain must describe the industry or field, such as FinTech, Healthcare, Cloud Computing, Cybersecurity, Media, etc.
- seniority must identify the likely level, such as Junior, Mid-Level, Senior, Lead, Manager, or Unknown if unclear.
- Do not invent responsibilities or requirements that are not supported by the JD.
- If the JD is short or vague, still produce the best structured professional summary possible from the given text.

==================================================
MISSING SKILLS GROUPING (MANDATORY - DYNAMIC GROUPING)
==================================================

You must return missing skills in TWO forms:

1. "missing_skills":
- a flat list of missing skills

2. "missing_skills_grouped":
- a grouped version of the same missing skills

DYNAMIC GROUPING RULES (VERY IMPORTANT):

- You are NOT restricted to predefined categories.
- You MUST create category (group) names yourself based on semantic meaning.
- Group skills based on their function, domain, or usage (e.g., tools, languages, practices, soft skills, domain knowledge).
- Each group must contain closely related skills.
- Each skill must appear in ONLY ONE group.

GROUPING QUALITY RULES:

- Prefer 2 to 6 groups depending on the data.
- Do NOT create too many tiny groups (avoid 1-skill groups unless necessary).
- Do NOT place everything into one group unless absolutely unavoidable.
- Do NOT overuse generic categories like "Other" or "Miscellaneous".
- ONLY use "Other" if a skill truly does not fit anywhere else.

CATEGORY NAMING RULES:

- Group names must be:
  - concise
  - professional
  - consistent
  - meaningful in an HR/technical context

- Prefer clear, specific names such as:
  - "Programming Languages"
  - "Web Technologies"
  - "Development Tools"
  - "Software Development Practices"
  - "Databases & Data Management"
  - "Cloud & Infrastructure"
  - "Soft Skills"
  - "Domain Knowledge"

- Avoid vague names like:
  - "Other"
  - "General"
  - "Misc"
  - "Various"

FINAL RULE:
- The grouping must feel natural, logical, and human-like â€” as if done by an experienced recruiter.
- Prioritize clarity and usefulness over strict categorization.

==================================================
OUTPUT FORMAT (MANDATORY)
==================================================

Return ONLY valid JSON in this exact structure:

{
  "metadata": {
    "document_type": "candidate_job_evaluation",
    "candidate_id": "",
    "job_id": "",
    "job_title": "",
    "source": "gradvoice_hr_advisor"
  },

  "evaluation_result": {
    "classification": "",
    "final_score": 0,
    "application_readiness": "",
    "headline": "",
    "short_verdict": ""
  },

  "ats_summary": {
    "headline": "",
    "short_verdict": "",
    "top_strengths": [],
    "top_gaps": []
  },

  "job_description_analysis": {
    "job_title": "",
    "job_summary": "",
    "requirements": [],
    "responsibilities": [],
    "tools_and_technologies": [],
    "domain": "",
    "seniority": ""
  },

  "cv_skills_hard": [],
  "cv_skills_soft": [],
  "jd_skills_hard": [],
  "jd_skills_soft": [],

  "matched_skills": [
    {
      "jd_skill": "",
      "cv_skill": "",
      "match_type": "",
      "evidence": "",
      "confidence": 0.0
    }
  ],

  "missing_skills": [],

  "missing_skills_grouped": [
    {
      "group": "",
      "skills": []
    }
  ],

  "score_breakdown": {
    "skill_score": 0.0,
    "experience_score": 0.0,
    "education_score": 0.0,
    "soft_skill_score": 0.0,
    "responsibility_alignment_score": 0.0,
    "domain_fit_score": 0.0,
    "impact_score": 0.0,
    "resume_quality_score": 0.0
  },

  "candidate_advice": {
    "overall_advice": "",
    "priority_improvements": [
      {
        "priority": 1,
        "action": "",
        "reason": ""
      }
    ],
    "cv_improvements": [],
    "learning_recommendations": [],
    "interview_tips": []
  },

  "insights": {
    "strengths": [],
    "gaps": [],
    "recommendations": []
  },

  "voice_agent_facts": [
    {
      "fact_id": "final_score_fact",
      "fact_type": "final_score",
      "question_forms": [
        "What is the candidate's final score?",
        "How strong is the match?"
      ],
      "answer": ""
    },
    {
      "fact_id": "matched_skills_fact",
      "fact_type": "matched_skills",
      "question_forms": [
        "What skills match the job?",
        "What are the candidate's matching skills?"
      ],
      "answer": ""
    },
    {
      "fact_id": "missing_skills_fact",
      "fact_type": "missing_skills",
      "question_forms": [
        "What skills are missing?",
        "What should the candidate improve?"
      ],
      "answer": ""
    },
    {
      "fact_id": "advice_fact",
      "fact_type": "candidate_advice",
      "question_forms": [
        "What advice would you give the candidate?",
        "How can the candidate improve?"
      ],
      "answer": ""
    },
    {
      "fact_id": "jd_requirements_fact",
      "fact_type": "job_description_requirements",
      "question_forms": [
        "What does the job description require?",
        "What are the JD requirements?",
        "What skills does the job need?"
      ],
      "answer": ""
    }
  ],

  "retrieval_chunks": [
    {
      "chunk_id": "summary_chunk",
      "chunk_type": "summary",
      "title": "Overall Evaluation Summary",
      "content": "",
      "keywords": []
    },
    {
      "chunk_id": "skills_chunk",
      "chunk_type": "skills",
      "title": "Skills Analysis",
      "content": "",
      "keywords": []
    },
    {
      "chunk_id": "advice_chunk",
      "chunk_type": "advice",
      "title": "Candidate Advice",
      "content": "",
      "keywords": []
    },
    {
      "chunk_id": "jd_requirements_chunk",
      "chunk_type": "job_description",
      "title": "Job Description Requirements",
      "content": "",
      "keywords": []
    }
  ],

  "job_recommendations": [
    {
      "job_title": "",
      "fit_score": 0,
      "reason": "",
      "cv_match_skills": [],
      "seniority": ""
    }
  ]
}

==================================================
FIELD REQUIREMENTS
==================================================
- metadata.candidate_id and metadata.job_id may be left as empty strings if not provided.
- metadata.job_title must be inferred from the JD.
- job_description_analysis.job_title should match the inferred JD role as closely as possible.
- job_description_analysis.job_summary must be clear, concise, and useful for retrieval.
- job_description_analysis.requirements must contain the main JD requirements in priority order.
- job_description_analysis.responsibilities must contain the main job duties in concise bullet-like sentence form.
- job_description_analysis.tools_and_technologies should include explicit technologies, platforms, systems, and tools.
- job_description_analysis.domain should reflect the JD domain or industry.
- job_description_analysis.seniority should reflect the likely role level from the JD.
- evaluation_result.application_readiness must be one of:
  - Ready to Apply
  - Apply with Minor Improvements
  - Apply After Upskilling
  - Not Ready Yet
- ats_summary.headline must be short and professional.
- ats_summary.short_verdict must be 2 to 4 clear sentences.
- missing_skills should contain the most important missing skills first.
- candidate_advice.overall_advice must speak directly to the candidate using "you".
- voice_agent_facts.answer must be direct, concise, and natural for spoken responses.
- retrieval_chunks.content must be concise, factual, and retrieval-friendly.
- retrieval_chunks.keywords must contain useful search terms such as role name, core skills, missing skills, classification, and JD requirements.
- job_recommendations must contain 2 to 3 objects, ordered by fit_score descending.
- job_recommendations[].job_title must be a real, specific job title (not generic like "IT role").
- job_recommendations[].fit_score must be an integer between 0 and 100, reflecting actual CV evidence.
- job_recommendations[].reason must be 1 to 2 concrete sentences â€” no filler or generic statements.
- job_recommendations[].cv_match_skills must contain 3 to 5 actual skills from the CV supporting this role.
- job_recommendations[].seniority must match the experience level evidenced in the CV.

==================================================
STYLE REQUIREMENTS
==================================================
- Write clearly and simply
- Avoid complex HR jargon
- Talk directly to the candidate using "you"
- Make advice actionable (not generic)
- Make the summary feel like a real ATS + recruiter feedback
- Make voice_agent_facts natural enough to be spoken aloud by a voice assistant
- Make retrieval_chunks useful for semantic search and RAG retrieval

==================================================
IMPORTANT
==================================================
Do NOT output anything outside JSON.
Do NOT output markdown.
Do NOT output explanations outside the JSON.
"""


def run_llm_hr_advisor(cv_input, jd_input, extraction_result):
    cv_text = extract_text(cv_input)
    jd_text = extract_text(jd_input)

    payload = {
        "cv_text": cv_text,
        "jd_text": jd_text,
        "extraction_result": extraction_result,
        "created_at": datetime.now().isoformat()
    }

    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload)}
        ],
        temperature=0.0,
        max_completion_tokens=8000
    )

    raw_output = response.choices[0].message.content.strip()

    try:
        result = json.loads(raw_output)
    except json.JSONDecodeError:
        print("Raw model output was not valid JSON:")
        print(raw_output)
        raise ValueError("LLM output is not valid JSON.")

    result = normalize_rag_json(result)
    return result


# ============================================================
# Normalize / Validate RAG JSON
# ============================================================

def normalize_rag_json(data):
    data.setdefault("metadata", {})
    data.setdefault("evaluation_result", {})
    data.setdefault("ats_summary", {})
    data.setdefault("score_breakdown", {})
    data.setdefault("skills_analysis", {})
    data.setdefault("insights", {})
    data.setdefault("candidate_advice", {})
    data.setdefault("voice_agent_facts", [])
    data.setdefault("retrieval_chunks", [])
    data.setdefault("missing_skills_grouped", [])
    data.setdefault("job_description_analysis", {})
    data.setdefault("job_recommendations", [])

    metadata = data["metadata"]
    evaluation = data["evaluation_result"]
    ats_summary = data["ats_summary"]
    scores = data["score_breakdown"]
    skills = data["skills_analysis"]
    insights = data["insights"]
    advice = data["candidate_advice"]
    jd_analysis = data["job_description_analysis"]

    metadata.setdefault("document_type", "candidate_job_evaluation")
    metadata.setdefault("candidate_id", "")
    metadata.setdefault("job_id", "")
    metadata.setdefault("job_title", "")
    metadata.setdefault("source", "gradvoice_hr_advisor")
    metadata.setdefault("created_at", datetime.now().isoformat())

    evaluation.setdefault("classification", "")
    evaluation.setdefault("final_score", None)
    evaluation.setdefault("application_readiness", "")
    evaluation.setdefault("headline", "")
    evaluation.setdefault("short_verdict", "")

    ats_summary.setdefault("headline", "")
    ats_summary.setdefault("short_verdict", "")
    ats_summary.setdefault("top_strengths", [])
    ats_summary.setdefault("top_gaps", [])

    scores.setdefault("skill_score", 0.0)
    scores.setdefault("experience_score", 0.0)
    scores.setdefault("education_score", 0.0)
    scores.setdefault("soft_skill_score", 0.0)
    scores.setdefault("responsibility_alignment_score", 0.0)
    scores.setdefault("domain_fit_score", 0.0)
    scores.setdefault("impact_score", 0.0)
    scores.setdefault("resume_quality_score", 0.0)

    skills.setdefault("matched_skills", [])
    skills.setdefault("missing_skills", [])
    skills.setdefault("partial_skills", [])

    insights.setdefault("strengths", [])
    insights.setdefault("gaps", [])
    insights.setdefault("recommendations", [])

    advice.setdefault("overall_advice", "")
    advice.setdefault("priority_improvements", [])
    advice.setdefault("cv_improvements", [])
    advice.setdefault("learning_recommendations", [])
    advice.setdefault("interview_tips", [])

    jd_analysis.setdefault("job_title", "")
    jd_analysis.setdefault("job_summary", "")
    jd_analysis.setdefault("requirements", [])
    jd_analysis.setdefault("responsibilities", [])
    jd_analysis.setdefault("tools_and_technologies", [])
    jd_analysis.setdefault("domain", "")
    jd_analysis.setdefault("seniority", "")

    if not metadata.get("job_title"):
        possible_sources = [
            evaluation.get("headline", ""),
            ats_summary.get("headline", ""),
            evaluation.get("short_verdict", "")
        ]
        inferred_title = ""
        for text in possible_sources:
            if not text:
                continue
            lower_text = text.lower()
            if " for " in lower_text:
                inferred_title = text.split(" for ", 1)[1].replace("Role", "").replace("role", "").strip()
                break
        metadata["job_title"] = inferred_title if inferred_title else "Unknown Role"

    if not jd_analysis.get("job_title"):
        jd_analysis["job_title"] = metadata.get("job_title", "")

    if not jd_analysis.get("requirements"):
        jd_analysis["requirements"] = list(dict.fromkeys(
            data.get("jd_skills_hard", []) + data.get("jd_skills_soft", [])
        ))

    if not jd_analysis.get("tools_and_technologies"):
        jd_analysis["tools_and_technologies"] = data.get("jd_skills_hard", [])

    if not jd_analysis.get("job_summary"):
        jd_analysis["job_summary"] = (
            f"This job requires skills such as "
            f"{', '.join(jd_analysis['requirements'][:5])}."
            if jd_analysis["requirements"]
            else "Job description summary not available."
        )

    existing_score = evaluation.get("final_score")
    if isinstance(existing_score, (int, float)) and existing_score > 1:
        evaluation["final_score"] = round(existing_score / 100.0, 2)

    if evaluation.get("final_score") in [None, ""]:
        evaluation["final_score"] = round(
            0.45 * scores.get("skill_score", 0.0) +
            0.25 * scores.get("experience_score", 0.0) +
            0.10 * scores.get("soft_skill_score", 0.0) +
            0.07 * scores.get("responsibility_alignment_score", 0.0) +
            0.05 * scores.get("education_score", 0.0) +
            0.05 * scores.get("domain_fit_score", 0.0) +
            0.03 * scores.get("impact_score", 0.0),
            2
        )

    if not isinstance(evaluation.get("final_score"), (int, float)):
        evaluation["final_score"] = 0.0

    evaluation["final_score"] = max(0.0, min(1.0, round(evaluation["final_score"], 2)))

    if not evaluation.get("classification"):
        s = evaluation["final_score"]
        if s >= 0.85:
            evaluation["classification"] = "Excellent Match"
        elif s >= 0.70:
            evaluation["classification"] = "Strong Match"
        elif s >= 0.50:
            evaluation["classification"] = "Moderate Match"
        elif s >= 0.30:
            evaluation["classification"] = "Weak Match"
        else:
            evaluation["classification"] = "Very Weak Match"

    if not evaluation.get("application_readiness"):
        readiness_map = {
            "Excellent Match": "Ready to Apply",
            "Strong Match": "Apply with Minor Improvements",
            "Moderate Match": "Apply with Minor Improvements",
            "Weak Match": "Apply After Upskilling",
            "Very Weak Match": "Not Ready Yet"
        }
        evaluation["application_readiness"] = readiness_map.get(
            evaluation["classification"], "Not Ready Yet"
        )

    if not ats_summary.get("headline"):
        ats_summary["headline"] = evaluation.get("headline", "")

    if not ats_summary.get("short_verdict"):
        ats_summary["short_verdict"] = evaluation.get("short_verdict", "")

    top_level_matched = data.get("matched_skills", [])
    top_level_missing = data.get("missing_skills", [])
    top_level_partial = data.get("partial_skills", [])

    if not skills["matched_skills"] and top_level_matched:
        skills["matched_skills"] = top_level_matched
    if not skills["missing_skills"] and top_level_missing:
        skills["missing_skills"] = top_level_missing
    if not skills["partial_skills"] and top_level_partial:
        skills["partial_skills"] = top_level_partial

    cleaned_matched = []
    for item in skills.get("matched_skills", []):
        if isinstance(item, dict):
            cleaned_matched.append({
                "jd_skill": item.get("jd_skill", ""),
                "cv_skill": item.get("cv_skill", ""),
                "match_type": item.get("match_type", ""),
                "evidence": item.get("evidence", ""),
                "confidence": float(item.get("confidence", 0.0) or 0.0)
            })
        elif item:
            cleaned_matched.append({
                "jd_skill": str(item),
                "cv_skill": "",
                "match_type": "",
                "evidence": "",
                "confidence": 0.0
            })

    skills["matched_skills"] = cleaned_matched
    data["matched_skills"] = cleaned_matched

    cleaned_partial = []
    for item in skills.get("partial_skills", []):
        if isinstance(item, dict):
            cleaned_partial.append(item)
        elif item:
            cleaned_partial.append({"skill": str(item)})

    skills["partial_skills"] = cleaned_partial
    data["partial_skills"] = cleaned_partial

    normalized_missing = []
    missing_names = []

    for item in skills.get("missing_skills", []):
        if isinstance(item, dict):
            val = item.get("requirement") or item.get("skill") or item.get("jd_skill") or ""
            if val:
                normalized_missing.append(item)
                missing_names.append(str(val).strip())
        elif item:
            normalized_missing.append(item)
            missing_names.append(str(item).strip())

    missing_names = [x for x in missing_names if x]
    missing_names = list(dict.fromkeys(missing_names))

    skills["missing_skills"] = normalized_missing
    data["missing_skills"] = missing_names

    matched_names = []
    for item in cleaned_matched:
        val = item.get("jd_skill") or item.get("cv_skill")
        if val:
            matched_names.append(str(val).strip())
    matched_names = [x for x in matched_names if x]
    matched_names = list(dict.fromkeys(matched_names))

    if not ats_summary["top_strengths"]:
        ats_summary["top_strengths"] = matched_names[:5] if matched_names else [
            "Relevant background identified from the CV"
        ]

    if not ats_summary["top_gaps"]:
        ats_summary["top_gaps"] = missing_names[:5] if missing_names else [
            "No major gaps were explicitly identified"
        ]

    def normalize_group_name(name):
        if not name:
            return "Other"
        key = str(name).strip().lower()
        mapping = {
            "programming": "Programming Languages",
            "languages": "Programming Languages",
            "programming languages": "Programming Languages",
            "web": "Web Technologies",
            "web technologies": "Web Technologies",
            "frontend": "Web Technologies",
            "tools": "Development Tools",
            "dev tools": "Development Tools",
            "development tools": "Development Tools",
            "software tools": "Development Tools",
            "ides": "Development Tools",
            "frameworks": "Frameworks & Libraries",
            "libraries": "Frameworks & Libraries",
            "frameworks & libraries": "Frameworks & Libraries",
            "database": "Databases & Data Management",
            "databases": "Databases & Data Management",
            "data management": "Databases & Data Management",
            "databases & data management": "Databases & Data Management",
            "cloud": "Cloud & DevOps",
            "devops": "Cloud & DevOps",
            "cloud & devops": "Cloud & DevOps",
            "infrastructure": "Cloud & DevOps",
            "concepts": "Core Concepts",
            "core concepts": "Core Concepts",
            "fundamentals": "Core Concepts",
            "soft skills": "Soft Skills",
            "professional skills": "Soft Skills",
            "interpersonal skills": "Soft Skills",
            "domain": "Domain Knowledge",
            "domain knowledge": "Domain Knowledge",
            "industry knowledge": "Domain Knowledge",
            "other": "Other",
            "misc": "Other",
            "miscellaneous": "Other",
            "general": "Other",
            "various": "Other"
        }
        return mapping.get(key, str(name).strip())

    def clean_llm_grouped_skills(grouped_skills, valid_missing_skills):
        if not isinstance(grouped_skills, list):
            return []
        valid_set = set(valid_missing_skills)
        cleaned = []
        seen_skills = set()
        for group in grouped_skills:
            if not isinstance(group, dict):
                continue
            group_name = normalize_group_name(group.get("group", "Other"))
            skill_items = group.get("skills", [])
            if not isinstance(skill_items, list):
                continue
            cleaned_items = []
            for skill in skill_items:
                if not skill:
                    continue
                skill_str = str(skill).strip()
                if skill_str in valid_set and skill_str not in seen_skills:
                    cleaned_items.append(skill_str)
                    seen_skills.add(skill_str)
            if cleaned_items:
                cleaned.append({"group": group_name, "skills": cleaned_items})
        ungrouped = [skill for skill in valid_missing_skills if skill not in seen_skills]
        if ungrouped:
            cleaned.append({"group": "Other", "skills": ungrouped})
        return cleaned

    def fallback_group_skills(skills_list):
        groups = {
            "Programming Languages": [],
            "Web Technologies": [],
            "Development Tools": [],
            "Frameworks & Libraries": [],
            "Core Concepts": [],
            "Databases & Data Management": [],
            "Cloud & DevOps": [],
            "Soft Skills": [],
            "Domain Knowledge": [],
            "Other": []
        }
        for skill in skills_list:
            s = skill.lower().strip()
            if any(k in s for k in ["python", "java", "javascript", "typescript", "c#", "c++", "go", "ruby", "php", "swift", "kotlin"]):
                groups["Programming Languages"].append(skill)
            elif any(k in s for k in ["html", "css", "sass", "bootstrap", "tailwind", "web development", "frontend"]):
                groups["Web Technologies"].append(skill)
            elif any(k in s for k in ["git", "github", "gitlab", "bitbucket", "visual studio code", "vs code", "intellij", "eclipse", "postman", "jira", "figma"]):
                groups["Development Tools"].append(skill)
            elif any(k in s for k in ["react", "angular", "vue", "spring", "django", "flask", "node", "express", "unity", "unreal", "tensorflow", "pytorch", "scikit", "laravel"]):
                groups["Frameworks & Libraries"].append(skill)
            elif any(k in s for k in ["sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "oracle", "sql server", "database", "data modeling"]):
                groups["Databases & Data Management"].append(skill)
            elif any(k in s for k in ["aws", "azure", "gcp", "docker", "kubernetes", "devops", "ci/cd", "terraform"]):
                groups["Cloud & DevOps"].append(skill)
            elif any(k in s for k in ["teamwork", "communication", "leadership", "collaboration", "problem solving", "willingness to learn", "adaptability", "time management"]):
                groups["Soft Skills"].append(skill)
            elif any(k in s for k in ["sdlc", "software development lifecycle", "data structures", "algorithms", "oop", "object-oriented", "debugging", "testing", "code reviews", "version control", "computer vision", "machine learning", "deep learning", "nlp", "software engineering"]):
                groups["Core Concepts"].append(skill)
            elif any(k in s for k in ["fintech", "banking", "healthcare", "e-commerce", "domain", "industry", "regulatory"]):
                groups["Domain Knowledge"].append(skill)
            else:
                groups["Other"].append(skill)
        final_groups = []
        for group_name, group_items in groups.items():
            unique_items = list(dict.fromkeys(group_items))
            if unique_items:
                final_groups.append({"group": group_name, "skills": unique_items})
        return final_groups

    llm_grouped = data.get("missing_skills_grouped", [])
    cleaned_llm_grouped = clean_llm_grouped_skills(llm_grouped, missing_names)
    if cleaned_llm_grouped:
        data["missing_skills_grouped"] = cleaned_llm_grouped
    else:
        data["missing_skills_grouped"] = fallback_group_skills(missing_names)

    display_score = round(evaluation["final_score"] * 100, 2)
    jd_requirements = jd_analysis.get("requirements", [])
    jd_responsibilities = jd_analysis.get("responsibilities", [])
    jd_tools = jd_analysis.get("tools_and_technologies", [])

    data["voice_agent_facts"] = [
        {
            "fact_id": "final_score_fact",
            "fact_type": "final_score",
            "question_forms": [
                "What is the candidate's final score?",
                "How strong is the match?",
                "What is the evaluation result?"
            ],
            "answer": (
                f"The candidate is a {evaluation['classification']} for the "
                f"{metadata['job_title']} role with a final score of {display_score}%."
            )
        },
        {
            "fact_id": "matched_skills_fact",
            "fact_type": "matched_skills",
            "question_forms": [
                "What skills match the job?",
                "What are the candidate's matching skills?"
            ],
            "answer": (
                f"The main matched skills are: {', '.join(matched_names)}."
                if matched_names else
                "No strong matched skills were identified."
            )
        },
        {
            "fact_id": "missing_skills_fact",
            "fact_type": "missing_skills",
            "question_forms": [
                "What skills are missing?",
                "What should the candidate improve?",
                "What are the main gaps?"
            ],
            "answer": (
                f"The main missing skills are: {', '.join(missing_names)}."
                if missing_names else
                "No major missing skills were identified."
            )
        },
        {
            "fact_id": "advice_fact",
            "fact_type": "candidate_advice",
            "question_forms": [
                "What advice would you give the candidate?",
                "How can the candidate improve?"
            ],
            "answer": advice["overall_advice"] or (
                "You should focus on strengthening the missing role-specific skills "
                "and aligning your CV more closely with the job requirements."
            )
        },
        {
            "fact_id": "jd_requirements_fact",
            "fact_type": "job_description_requirements",
            "question_forms": [
                "What does the job description require?",
                "What are the JD requirements?",
                "What skills does the job need?"
            ],
            "answer": (
                f"The main job requirements are: {', '.join(jd_requirements)}."
                if jd_requirements else
                "The main job requirements were not clearly extracted."
            )
        },
        {
            "fact_id": "jd_responsibilities_fact",
            "fact_type": "job_description_responsibilities",
            "question_forms": [
                "What are the job responsibilities?",
                "What does this role do?",
                "What are the main duties in the JD?"
            ],
            "answer": (
                f"The main responsibilities are: {', '.join(jd_responsibilities)}."
                if jd_responsibilities else
                "The main job responsibilities were not clearly extracted."
            )
        },
        {
            "fact_id": "jd_tools_fact",
            "fact_type": "job_description_tools",
            "question_forms": [
                "What tools or technologies does the JD mention?",
                "What technologies are required?",
                "What tools does this role use?"
            ],
            "answer": (
                f"The main tools and technologies mentioned are: {', '.join(jd_tools)}."
                if jd_tools else
                "No specific tools or technologies were clearly extracted from the JD."
            )
        }
    ]

    summary_content = (
        f"This evaluation is for the {metadata['job_title']} role. "
        f"The candidate is classified as {evaluation['classification']} "
        f"with a final score of {display_score}%. "
        f"{evaluation.get('short_verdict', '')}"
    ).strip()

    skills_content = (
        f"The candidate matches these main skills: "
        f"{', '.join(matched_names) if matched_names else 'none identified'}. "
        f"The main missing skills are: "
        f"{', '.join(missing_names) if missing_names else 'none identified'}."
    )

    advice_content = advice["overall_advice"] or (
        "Focus on the missing requirements and make the CV more aligned with the role."
    )

    jd_requirements_content = (
        f"This job description is for the {jd_analysis.get('job_title', metadata['job_title'])} role. "
        f"The summary is: {jd_analysis.get('job_summary', '')} "
        f"The main requirements are: {', '.join(jd_requirements) if jd_requirements else 'not clearly extracted'}. "
        f"The main responsibilities are: {', '.join(jd_responsibilities) if jd_responsibilities else 'not clearly extracted'}. "
        f"The main tools and technologies are: {', '.join(jd_tools) if jd_tools else 'not clearly extracted'}."
    ).strip()

    data["retrieval_chunks"] = [
        {
            "chunk_id": "summary_chunk",
            "chunk_type": "summary",
            "title": "Overall Evaluation Summary",
            "content": summary_content,
            "keywords": list(dict.fromkeys([
                metadata["job_title"],
                evaluation["classification"],
                "final score",
                "candidate evaluation",
                "application readiness",
                evaluation["application_readiness"]
            ]))
        },
        {
            "chunk_id": "skills_chunk",
            "chunk_type": "skills",
            "title": "Skills Analysis",
            "content": skills_content,
            "keywords": list(dict.fromkeys(
                [metadata["job_title"], evaluation["classification"], "matched skills", "missing skills"]
                + matched_names[:8]
                + missing_names[:8]
            ))
        },
        {
            "chunk_id": "advice_chunk",
            "chunk_type": "advice",
            "title": "Candidate Advice",
            "content": advice_content,
            "keywords": list(dict.fromkeys([
                "advice",
                "recommendations",
                "improvements",
                "candidate guidance",
                metadata["job_title"]
            ]))
        },
        {
            "chunk_id": "jd_requirements_chunk",
            "chunk_type": "job_description",
            "title": "Job Description Requirements",
            "content": jd_requirements_content,
            "keywords": list(dict.fromkeys(
                [
                    jd_analysis.get("job_title", metadata["job_title"]),
                    jd_analysis.get("domain", ""),
                    jd_analysis.get("seniority", ""),
                    "job description",
                    "requirements",
                    "responsibilities",
                    "tools",
                    "technologies"
                ]
                + jd_requirements[:8]
                + jd_tools[:8]
            ))
        }
    ]

    # â”€â”€ Normalize job_recommendations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    raw_recs = data.get("job_recommendations", [])
    cleaned_recs = []
    for rec in raw_recs:
        if not isinstance(rec, dict):
            continue
        title = str(rec.get("job_title", "")).strip()
        if not title:
            continue
        raw_score = rec.get("fit_score", 0)
        try:
            score = int(float(raw_score))
            score = max(0, min(100, score))
        except (TypeError, ValueError):
            score = 0
        cleaned_recs.append({
            "job_title": title,
            "fit_score": score,
            "reason": str(rec.get("reason", "")).strip(),
            "cv_match_skills": [str(s).strip() for s in rec.get("cv_match_skills", []) if s],
            "seniority": str(rec.get("seniority", "")).strip(),
        })
    # sort by fit_score descending, keep max 3
    cleaned_recs.sort(key=lambda x: x["fit_score"], reverse=True)
    data["job_recommendations"] = cleaned_recs[:3]

    return data


# ============================================================
# MAIN ENTRY POINT (used by Flask / backend_server.py)
# ============================================================

RUNTIME_CONTEXT_DIR = Path(__file__).resolve().parent / "runtime" / "voice_context"
RUNTIME_CONTEXT_JSON = RUNTIME_CONTEXT_DIR / "current_context.json"


def save_runtime_context_json(rag_data, output_path=RUNTIME_CONTEXT_JSON):
    """Atomically save runtime context JSON consumed by the voice agent."""
    target = Path(output_path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(rag_data, indent=4, ensure_ascii=False)

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=str(target.parent),
        prefix=f"{target.name}.",
        suffix=".tmp",
        delete=False,
    ) as fh:
        fh.write(payload)
        fh.flush()
        os.fsync(fh.fileno())
        temp_name = fh.name

    os.replace(temp_name, target)
    print(f"Saved runtime voice context JSON: {target}")
    return str(target)


def evaluate_candidate_combined(cv_path, jd_path):
    extraction_result = process_pair(cv_path, jd_path)
    llm_result = run_llm_hr_advisor(cv_path, jd_path, extraction_result)
    context_path = save_runtime_context_json(llm_result)
    return {
        "extraction_analysis": extraction_result,
        "llm_analysis": llm_result,
        "voice_context_json_path": context_path,
    }

# Alias for backward compatibility with backend_server.py
analyze_cv_pair = evaluate_candidate_combined


# ============================================================
# Utility: Save RAG JSON to file
# ============================================================

def save_rag_json(rag_data, filename="gradvoice_rag_output.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(rag_data, f, indent=4, ensure_ascii=False)
    print(f"Saved JSON file: {filename}")

