from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
load_dotenv()
from hr_analyzer import analyze_cv_pair

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/analyze", methods=["POST"])
def analyze():
    print("[backend_server] POST /analyze received")
    cv_file = request.files.get("cv_file")
    jd_file = request.files.get("jd_file")

    if not cv_file or not jd_file:
        print("[backend_server] Missing cv_file or jd_file")
        return jsonify({"error": "CV file and JD file are required"}), 400

    cv_path = os.path.join(UPLOAD_FOLDER, cv_file.filename)
    jd_path = os.path.join(UPLOAD_FOLDER, jd_file.filename)

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
