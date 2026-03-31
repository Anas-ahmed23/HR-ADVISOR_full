# -*- coding: utf-8 -*-
"""
GradVoice HR Advisor – Advanced Analyzer
GLiNER + SBERT + Azure OpenAI (Evidence-based)
"""

import os
import re
import json
import unicodedata
import pdfplumber
import docx2txt
import numpy as np

from gliner import GLiNER
import spacy
from sentence_transformers import SentenceTransformer, util
from sklearn.cluster import AgglomerativeClustering

from openai import AzureOpenAI


# ============================================================
# Azure OpenAI Configuration (REQUIRED)
# ============================================================

AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
AZURE_OPENAI_API_VERSION = "2024-12-01-preview"

if not AZURE_OPENAI_API_KEY:
    raise RuntimeError("Missing AZURE_OPENAI_API_KEY environment variable")

client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION,
)


# ============================================================
# Load Models ONCE
# ============================================================

print("Loading NLP models...")

nlp = spacy.load("en_core_web_sm")
gliner = GLiNER.from_pretrained("urchade/gliner_large")
sbert = SentenceTransformer("all-MiniLM-L6-v2")

print("Models loaded successfully.")


# ============================================================
# Labels
# ============================================================

SKILL_LABELS = [
    "Programming Language", "Framework", "Library", "Tool",
    "Technology", "Database", "Cloud Platform", "API"
]

HR_LABELS = [
    "Skill", "Technical Skill", "Programming Language", "Framework",
    "Technology", "Library", "Tool", "Cloud Platform", "Database",
    "Operating System", "API", "Protocol",
    "Education", "Degree", "Field of Study",
    "Certification", "Years of Experience", "Experience"
]


# ============================================================
# Text Extraction & Cleaning
# ============================================================

def extract_text(path: str) -> str:
    if path.lower().endswith(".pdf"):
        with pdfplumber.open(path) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    if path.lower().endswith(".docx"):
        return docx2txt.process(path)
    if path.lower().endswith(".txt"):
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    return ""


def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"\S+@\S+", " ", text)
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ============================================================
# GLiNER Entity Extraction
# ============================================================

def chunk_text(text, max_tokens=250):
    doc = nlp(text)
    tokens = [t.text for t in doc]
    return [" ".join(tokens[i:i + max_tokens]) for i in range(0, len(tokens), max_tokens)]


def extract_entities(text, labels):
    chunks = chunk_text(text)
    result = {l: [] for l in labels}

    for chunk in chunks:
        preds = gliner.predict_entities(chunk, labels=labels, threshold=0.35)
        for p in preds:
            result[p["label"]].append(p["text"].lower())

    for k in result:
        result[k] = list(dict.fromkeys(result[k]))

    return result


# ============================================================
# Skill Processing
# ============================================================

def normalize_skills(items):
    out = []
    for t in items:
        doc = nlp(t)
        out.append(" ".join(tok.lemma_.lower() for tok in doc))
    return list(dict.fromkeys(out))


def extract_technical_skills(ent):
    skills = []
    for k in SKILL_LABELS:
        skills += ent.get(k, [])
    return normalize_skills(skills)


# ============================================================
# Skill Clustering & Matching
# ============================================================

def cluster_skills(skills):
    if len(skills) <= 1:
        return {0: skills}

    embeddings = sbert.encode(skills)
    clustering = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=0.9,
        metric="euclidean",
        linkage="ward"
    )
    labels = clustering.fit_predict(embeddings)

    clusters = {}
    for i, lbl in enumerate(labels):
        clusters.setdefault(lbl, []).append(skills[i])

    return clusters


def semantic_skill_match(cv_skills, jd_skills):
    if not cv_skills or not jd_skills:
        return [], jd_skills, 0.0

    all_skills = cv_skills + jd_skills
    clusters = cluster_skills(all_skills)

    skill_to_cluster = {}
    for cid, items in clusters.items():
        for s in items:
            skill_to_cluster[s] = cid

    cv_emb = sbert.encode(cv_skills)
    jd_emb = sbert.encode(jd_skills)
    sim = util.cos_sim(jd_emb, cv_emb).cpu().numpy()

    matched, missing = [], []
    total_sim = 0.0

    for i, jd_skill in enumerate(jd_skills):
        idx = np.argmax(sim[i])
        score = sim[i][idx]

        if skill_to_cluster[jd_skill] == skill_to_cluster.get(cv_skills[idx]):
            matched.append({
                "jd_skill": jd_skill,
                "cv_skill": cv_skills[idx],
                "similarity": float(score)
            })
            total_sim += score
        else:
            missing.append(jd_skill)

    return matched, missing, total_sim / max(len(jd_skills), 1)


# ============================================================
# Experience & Education
# ============================================================

def extract_years(text):
    nums = re.findall(r"(\d+)\s*years?", text.lower())
    return max(map(int, nums)) if nums else None


def experience_score(cv_text, jd_text):
    cv_y = extract_years(cv_text)
    jd_y = extract_years(jd_text)

    if cv_y is None and jd_y is None:
        return 0.5
    if jd_y and not cv_y:
        return 0.3
    if cv_y >= jd_y:
        return 1.0
    return cv_y / jd_y


def education_score(cv_text, jd_text):
    edu_terms = ["bachelor", "master", "phd", "bsc", "msc"]
    cv_e = any(t in cv_text.lower() for t in edu_terms)
    jd_e = any(t in jd_text.lower() for t in edu_terms)

    if cv_e and jd_e:
        return 1.0
    if jd_e and not cv_e:
        return 0.3
    return 0.6


# ============================================================
# Azure OpenAI HR Reasoning
# ============================================================

SYSTEM_PROMPT = """You are an expert HR Advisor AI.
You must evaluate the candidate strictly based on evidence in the CV.
Return only valid JSON."""


def llm_hr_reasoning(cv_text, jd_text, gliner_result):
    payload = {
        "cv_text": cv_text,
        "jd_text": jd_text,
        "extracted_skills": gliner_result
    }

    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(payload)}
        ],
        temperature=0.0,
        max_completion_tokens=2048
    )

    return json.loads(response.choices[0].message.content)


# ============================================================
# MAIN ENTRY POINT (USED BY FLASK)
# ============================================================

def analyze_cv_pair(cv_path, jd_path):
    cv_raw = clean_text(extract_text(cv_path))
    jd_raw = clean_text(extract_text(jd_path))

    cv_ent = extract_entities(cv_raw, SKILL_LABELS)
    jd_ent = extract_entities(jd_raw, SKILL_LABELS)

    cv_skills = extract_technical_skills(cv_ent)
    jd_skills = extract_technical_skills(jd_ent)

    matched, missing, skill_s = semantic_skill_match(cv_skills, jd_skills)
    exp_s = experience_score(cv_raw, jd_raw)
    edu_s = education_score(cv_raw, jd_raw)

    final = 0.65 * skill_s + 0.25 * exp_s + 0.10 * edu_s

    classification = (
        "Strong Match" if final >= 0.75
        else "Good Match" if final >= 0.5
        else "Weak Match"
    )

    return {
        "llm_analysis": {
            "final_score": round(final, 3),
            "classification": classification,
            "matched_skills": matched,
            "missing_skills": missing,
            "skill_score": round(skill_s, 3),
            "experience_score": round(exp_s, 3),
            "education_score": round(edu_s, 3),
        }
    }
