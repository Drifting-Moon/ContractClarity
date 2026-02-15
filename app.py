from flask import Flask, render_template, request, jsonify
import os
import pdfplumber

from analyzer import analyze_document

app = Flask(__name__)

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
    custom_api_key = request.form.get("custom_api_key")
    confirm_fallback = request.form.get("confirm_fallback") == "true"

    if not file:
        return "No file uploaded."

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    text = ""
    result = ""

    try:
        # -------- PDF --------
        if filepath.lower().endswith(".pdf"):
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""

        # -------- TEXT --------
        elif filepath.lower().endswith(".txt"):
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()

        else:
            return "Unsupported file format. Upload PDF or TXT."

        if len(text.strip()) == 0:
            return "No readable text found in document."
        
        result = analyze_document(
            text=text,
            mode=mode,
            provider=provider,
            model_name=model_name,
            custom_api_key=custom_api_key,
            confirm_fallback=confirm_fallback
        )


    except Exception as e:
        result = f"Error processing file: {str(e)}"
    
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)
            
    return result


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    result = process_upload(request)
    if isinstance(result, dict) and result.get("status") == "confirmation_needed":
        return jsonify(result)
    return jsonify({"result": result})


if __name__ == "__main__":
    app.run(debug=True, port=8000)
