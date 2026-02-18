import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import pdfplumber
from docx import Document
from PIL import Image
import io

from analyzer import analyze_document, calculate_risk_score
from highlighter import highlight_risky_clauses

app = Flask(__name__, template_folder='.')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File too large. Maximum size is 16MB."}), 413

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({"error": "Internal Server Error. Please try again later."}), 500

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/", methods=["GET", "POST"])
def index():

    result = None

    if request.method == "POST":
        result = process_upload(request)

    return render_template("index.html", result=result)


def process_upload(request):
    file = request.files.get("file")
    mode = request.form.get("mode")
    provider = request.form.get("provider")
    model_name = request.form.get("model_name")
    custom_api_key = request.form.get("custom_api_key", "").strip()
    confirm_fallback = request.form.get("confirm_fallback") == "true"

    if not file:
        return "No file uploaded."

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    text = ""
    image_parts = None
    # result = "" # This variable is no longer used for the final return value directly

    try:
        ext = filepath.lower()
        highlighted_pdf_path = None
        risk_data = None

        # -------- PDF --------
        if ext.endswith(".pdf"):
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
            
            # 1. Calculate Risk FIRST (we need flags)
            risk_data = calculate_risk_score(text)
            
            # 2. Highlight PDF if risk found
            if risk_data and risk_data['flags']:
                # Pass input PDF and risk flags to highlighter
                output_name = f"highlighted_{file.filename}"
                output_path = os.path.join(UPLOAD_FOLDER, output_name)
                
                highlighter_result = highlight_risky_clauses(filepath, risk_data['flags'], output_path)
                
                if highlighter_result:
                    highlighted_pdf_path = output_name  # Just the filename for the URL

        # -------- WORD DOC (DOCX) --------
        elif ext.endswith(".docx"):
            doc = Document(filepath)
            text = "\n".join([para.text for para in doc.paragraphs])

        # -------- TEXT --------
        elif ext.endswith(".txt"):
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()

        # -------- IMAGES (OCR) --------
        elif ext.endswith((".jpg", ".jpeg", ".png", ".webp")):
            image_parts = Image.open(filepath)
            text = "" # Text will be extracted by Gemini
            
        else:
            return jsonify({"error": "Unsupported file format. Upload PDF, DOCX, TXT, or Image."}), 400

        if not image_parts and len(text.strip()) == 0:
            return jsonify({"error": "No readable text found in document."}), 400
        
        # If we didn't calculate risk (non-PDF or image), do it now
        if not risk_data:
             risk_data = calculate_risk_score(text)

        # AI Analysis
        analysis_result = analyze_document(
            text=text,
            image_parts=image_parts,
            mode=mode,
            provider=provider,
            model_name=model_name,
            custom_api_key=custom_api_key,
            confirm_fallback=confirm_fallback
        )
            
        # If we have a highlighted PDF, include the link
        response_data = {
            "result": analysis_result,
            "risk_score": risk_data,
            "highlighted_pdf": highlighted_pdf_path
        }
            
        return jsonify(response_data)


    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error processing file: {str(e)}"}), 500
    
    finally:
        # For images, we might need to keep them open if Gemini streams, but here we wait for response
        # so it's safe to delete. 
        # Note: PIL.Image.open is lazy, but we passed it to Gemini which consumes it.
        # We should ensure file is closed.
        if image_parts:
             image_parts.close()

        if os.path.exists(filepath):
            os.remove(filepath)
            
    # This return is technically unreachable if the try block always returns jsonify or raises an exception
    # return result


@app.route("/api/analyze", methods=["POST"])
@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    return process_upload(request)


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # app.run(host="0.0.0.0", port=port, debug=True) 
    # Production: Use Gunicorn via start.sh
    app.run(debug=True, port=port)
