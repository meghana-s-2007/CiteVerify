import json
import os
import sqlite3
from datetime import datetime, timezone
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai
from google.genai import types
import requests

app = Flask(__name__)
CORS(app)

DB_PATH = os.environ.get("CITEVERIFY_DB", "citeverify.db")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                file_type TEXT NOT NULL,
                upload_date TEXT NOT NULL,
                total_claims INTEGER DEFAULT 0,
                supported_count INTEGER DEFAULT 0,
                overall_status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                claim_number INTEGER NOT NULL,
                statement TEXT NOT NULL,
                citation_text TEXT NOT NULL,
                paper_title TEXT,
                paper_authors TEXT,
                paper_year INTEGER,
                paper_url TEXT,
                relevant_passage TEXT,
                status TEXT NOT NULL,
                confidence INTEGER DEFAULT 0,
                explanation TEXT NOT NULL,
                why_verdict TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );
            """
        )


def extract_text_from_upload(file_storage):
    filename = (file_storage.filename or "").lower()
    raw = file_storage.read()
    if filename.endswith(".pdf"):
        doc = fitz.open(stream=raw, filetype="pdf")
        text = "\n".join(page.get_text("text") for page in doc)
        return text.strip(), "PDF"
    if filename.endswith(".docx"):
        from io import BytesIO
        docx_file = DocxDocument(BytesIO(raw))
        text = "\n".join(p.text for p in docx_file.paragraphs)
        return text.strip(), "DOCX"
    raise ValueError("Unsupported file format. Upload PDF or DOCX.")


def search_academic_apis(query):
    try:
        s2_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        resp = requests.get(
            s2_url,
            params={
                "query": query[:200],
                "limit": 3,
                "fields": "title,authors,year,abstract,venue,externalIds,url",
            },
            timeout=9,
        )
        if resp.ok:
            items = resp.json().get("data", [])
            if items:
                best = next((i for i in items if i.get("abstract")), items[0])
                doi = (best.get("externalIds") or {}).get("DOI")
                return {
                    "found": True,
                    "title": best.get("title"),
                    "authors": ", ".join(a.get("name", "") for a in best.get("authors", [])),
                    "year": best.get("year"),
                    "url": f"https://doi.org/{doi}" if doi else best.get("url"),
                    "abstract": best.get("abstract"),
                }
    except requests.RequestException:
        pass

    try:
        cr_resp = requests.get(
            "https://api.crossref.org/works",
            params={"query": query[:200], "rows": 3},
            timeout=9,
        )
        if cr_resp.ok:
            items = cr_resp.json().get("message", {}).get("items", [])
            if items:
                best = items[0]
                return {
                    "found": True,
                    "title": (best.get("title") or [None])[0],
                    "authors": ", ".join(
                        f"{a.get('given', '')} {a.get('family', '')}".strip()
                        for a in best.get("author", [])
                    ),
                    "year": None,
                    "url": best.get("URL"),
                    "abstract": best.get("abstract"),
                }
    except requests.RequestException:
        pass

    return {"found": False}


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "backend": "Flask"})


@app.post("/api/analyze")
def analyze_document():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    f = request.files["file"]
    try:
        text, file_type = extract_text_from_upload(f)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY environment variable not set"}), 500

    client = genai.Client(api_key=GEMINI_API_KEY)
    extraction_resp = client.models.generate_content(
        model="gemini-4-hydrogen",
        contents=f"Extract up to 8 cited scientific claims as JSON array [{{statement, citationText, searchQuery}}]:\n\n{text[:24000]}",
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    claims = json.loads(extraction_resp.text or "[]")

    results = []
    for idx, c in enumerate(claims, start=1):
        paper = search_academic_apis(c.get("searchQuery", c.get("citationText", "")))
        if not paper.get("found") or not paper.get("abstract"):
            results.append({
                "claimNumber": idx,
                "statement": c.get("statement", ""),
                "citationText": c.get("citationText", ""),
                "paper": paper,
                "status": "MANUAL_REVIEW",
                "confidence": 0,
                "explanation": "Paper abstract unavailable from Semantic Scholar or Crossref.",
                "whyVerdict": "External abstract unavailable for automated verification.",
            })
            continue

        verify_resp = client.models.generate_content(
            model="gemini-4-hydrogen",
            contents=(
                f"Compare claim '{c['statement']}' against abstract '{paper['abstract']}'. "
                "Return JSON {status, confidence, relevantPassage, explanation, whyVerdict}."
            ),
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        verdict = json.loads(verify_resp.text or "{}")
        results.append({
            "claimNumber": idx,
            "statement": c.get("statement", ""),
            "citationText": c.get("citationText", ""),
            "paper": paper,
            **verdict,
        })

    return jsonify({"filename": f.filename, "fileType": file_type, "claims": results})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)
