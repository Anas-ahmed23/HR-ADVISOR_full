from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import shutil
import tempfile
import zipfile
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
load_dotenv()
from hr_analyzer import analyze_cv_pair

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_CV_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_BATCH_CVS = int(os.getenv("MAX_BATCH_CVS", "25"))


def safe_upload_name(filename, fallback):
    name = secure_filename(filename or "")
    return name or fallback


def unique_path(directory, filename):
    root, ext = os.path.splitext(filename)
    candidate = filename
    counter = 1
    while os.path.exists(os.path.join(directory, candidate)):
        candidate = f"{root}_{counter}{ext}"
        counter += 1
    return os.path.join(directory, candidate)


def extract_cv_zip(zip_path, extract_dir):
    extracted = []
    skipped = []

    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue

            original_name = member.filename.replace("\\", "/")
            base_name = os.path.basename(original_name)
            if not base_name:
                continue

            ext = os.path.splitext(base_name)[1].lower()
            if ext not in ALLOWED_CV_EXTENSIONS:
                skipped.append(original_name)
                continue

            safe_name = safe_upload_name(base_name, f"cv_{len(extracted) + 1}{ext}")
            target_path = unique_path(extract_dir, safe_name)

            with archive.open(member) as source, open(target_path, "wb") as target:
                shutil.copyfileobj(source, target)

            extracted.append({
                "name": base_name,
                "path": target_path,
            })

    return extracted, skipped


def summarize_batch_result(result):
    analysis = result.get("llm_analysis", result) if isinstance(result, dict) else {}
    if not isinstance(analysis, dict):
        analysis = {}

    return {
        "evaluation_result": analysis.get("evaluation_result", {}),
        "score_breakdown": analysis.get("score_breakdown", {}),
        "metadata": analysis.get("metadata", {}),
        "final_score": analysis.get("final_score"),
        "classification": analysis.get("classification"),
        "skill_score": analysis.get("skill_score"),
        "experience_score": analysis.get("experience_score"),
        "education_score": analysis.get("education_score"),
    }


def analyze_zip_batch(cv_file, jd_file):
    batch_dir = tempfile.mkdtemp(prefix="batch_", dir=UPLOAD_FOLDER)
    try:
        zip_name = safe_upload_name(cv_file.filename, "candidate_cvs.zip")
        jd_name = safe_upload_name(jd_file.filename, "job_description")

        zip_path = os.path.join(batch_dir, zip_name)
        jd_path = os.path.join(batch_dir, jd_name)
        cv_file.save(zip_path)
        jd_file.save(jd_path)

        cv_entries, skipped_files = extract_cv_zip(zip_path, batch_dir)
        if not cv_entries:
            return {
                "error": "ZIP file did not contain any supported CV files (.pdf, .docx, .txt)"
            }, 400

        if len(cv_entries) > MAX_BATCH_CVS:
            return {
                "error": (
                    f"ZIP contains {len(cv_entries)} supported CVs. "
                    f"Please split the archive into batches of {MAX_BATCH_CVS} CVs or fewer."
                )
            }, 400

        results = []
        for index, entry in enumerate(cv_entries, start=1):
            print(f"[backend_server] Batch CV {index}/{len(cv_entries)}: {entry['name']}")
            try:
                result = analyze_cv_pair(entry["path"], jd_path)
                results.append({
                    "cv_name": entry["name"],
                    "analysis": summarize_batch_result(result),
                    "error": None,
                })
            except Exception as e:
                print(f"[backend_server] Batch analyze error for {entry['name']}: {e}")
                results.append({
                    "cv_name": entry["name"],
                    "result": None,
                    "error": str(e),
                })

        return {
            "batch": True,
            "job_description": jd_file.filename,
            "archive": cv_file.filename,
            "total": len(cv_entries),
            "processed": len(results),
            "skipped_files": skipped_files,
            "results": results,
        }, 200
    finally:
        shutil.rmtree(batch_dir, ignore_errors=True)


@app.route("/analyze", methods=["POST"])
def analyze():
    print("[backend_server] POST /analyze received")
    cv_file = request.files.get("cv_file")
    jd_file = request.files.get("jd_file")

    if not cv_file or not jd_file:
        print("[backend_server] Missing cv_file or jd_file")
        return jsonify({"error": "CV file and JD file are required"}), 400

    if (cv_file.filename or "").lower().endswith(".zip"):
        print("[backend_server] ZIP batch received, running batch analysis...")
        try:
            payload, status = analyze_zip_batch(cv_file, jd_file)
            return jsonify(payload), status
        except zipfile.BadZipFile:
            return jsonify({"error": "Uploaded CV archive is not a valid ZIP file"}), 400
        except Exception as e:
            print(f"[backend_server] ZIP batch error: {e}")
            return jsonify({"error": str(e)}), 500

    cv_name = safe_upload_name(cv_file.filename, "candidate_cv")
    jd_name = safe_upload_name(jd_file.filename, "job_description")
    cv_path = os.path.join(UPLOAD_FOLDER, cv_name)
    jd_path = os.path.join(UPLOAD_FOLDER, jd_name)

    cv_file.save(cv_path)
    jd_file.save(jd_path)
    print("[backend_server] Files saved, running analyze_cv_pair...")

    try:
        result = analyze_cv_pair(cv_path, jd_path)
        print("[backend_server] Analysis complete, returning result")
        return jsonify(result)
    except Exception as e:
        print(f"[backend_server] analyze_cv_pair error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("[backend_server] Starting on http://127.0.0.1:5001 (POST /analyze)")
    app.run(host="127.0.0.1", port=5001, debug=True)
