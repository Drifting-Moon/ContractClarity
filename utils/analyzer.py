import os
from google import genai
from google.api_core import exceptions
from dotenv import load_dotenv
import threading
import time
from .rule_based import rule_based_analysis

load_dotenv()

# Your premium server key (from .env)
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY")

# Lock to prevent race conditions with global API key configuration
api_lock = threading.Lock()


def analyze_document(text, image_parts=None, mode="free", provider="gemini", model_name="gemini-1.5-flash", custom_api_key=None, confirm_fallback=False):
    
    api_key = None
    model_to_use = model_name
    
    # Validation: Images require AI
    if image_parts and not text:
        text = "Analyze this document image." # Default prompt context for images

    # 1. Check Keywords
    # ---------------- PREMIUM MODE ----------------
    if mode == "premium":

        if not DEFAULT_API_KEY:
             # If server key is missing
             if not confirm_fallback:
                 return {"status": "confirmation_needed"}
             if image_parts:
                 return "⚠️ **Error:** Premium AI key missing. OCR/Image analysis requires an active AI connection. Rule-based fallback cannot read images."
             return "⚠️ **Warning:** Premium AI key not configured on server. \n\n" + rule_based_analysis(text)

        api_key = DEFAULT_API_KEY
        # Fix: Use the passed model_name if available, otherwise default to a valid one
        model_to_use = model_name if model_name else "gemini-flash-latest"


    # ---------------- FREE MODE ----------------
    else:

        if not custom_api_key:
             # If user key is missing
             if not confirm_fallback:
                 return {"status": "confirmation_needed"}
             if image_parts:
                 return "⚠️ **Error:** No API key provided. OCR/Image analysis requires an active AI connection. Rule-based fallback cannot read images."
             return "⚠️ **Warning:** No API key provided (Free Mode). Showing basic analysis. \n\n" + rule_based_analysis(text)

        api_key = custom_api_key

        # Only Gemini actually supported for now
        if provider != "gemini":
            return f"{provider} integration coming soon. Currently only Gemini is supported."

        model_to_use = model_name if model_name else "gemini-flash-latest"


    # ---------------- AI EXECUTION ----------------
    try:
        with api_lock:
            if api_key:
                api_key = api_key.strip()
                # Debug: Print masked key to verify it's being read correctly
                masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
                print(f"[DEBUG] Using API Key: {masked_key}")

            # New SDK Client Initialization
            client = genai.Client(api_key=api_key)

            prompt = structured_prompt(text)

            # Prepare contents
            contents = []
            if image_parts:
                contents.append(image_parts)
            contents.append(prompt)

            # Fallback Strategy for High Availability
            # 1. Primary: Requested model (usually gemini-flash-lite-latest)
            # 2. Secondary: gemini-flash-latest (Standard 1.5 Flash)
            # 3. Tertiary: gemini-2.0-flash-lite (Newer, might have different quota)
            
            models_to_try = [model_to_use]
            if model_to_use != "gemini-flash-latest":
                models_to_try.append("gemini-flash-latest")
            if model_to_use != "gemini-2.0-flash-lite":
                models_to_try.append("gemini-2.0-flash-lite")
            
            # Remove duplicates preserve order
            models_to_try = list(dict.fromkeys(models_to_try))
            
            success = False
            last_error = None
            
            for current_model in models_to_try:
                print(f"[INFO] Attempting to generate with model: {current_model}")
                
                # Retry logic PER MODEL
                max_retries = 2 # Reduced per model since we have multiple models
                retry_delay = 3
                
                for attempt in range(max_retries):
                    try:
                        response = client.models.generate_content(
                            model=current_model,
                            contents=contents
                        )
                        success = True
                        break # Break retry loop
                    except Exception as e:
                        last_error = e
                        error_str = str(e)
                        # Check for 503 (Service Unavailable) OR 429 (Rate Limit / Resource Exhausted)
                        if "503" in error_str or "ServiceUnavailable" in error_str or "server_error" in error_str or "429" in error_str or "ResourceExhausted" in error_str:
                            if attempt < max_retries - 1:
                                print(f"[WARNING] Model {current_model} Error (503/429). Retrying in {retry_delay}s...")
                                time.sleep(retry_delay)
                                retry_delay *= 2
                                continue
                        else:
                            # If it's not a temporary error (e.g. 400 Invalid Argument), don't retry this model
                            break
                            
                if success:
                    break # Break model loop
            
            if not success:
                raise last_error # Re-raise the last error if all models/retries failed

        # --- RISK SCORING ALGORITHM ---
        # Calculate algorithmic score regardless of AI result
        risk_data = calculate_risk_score(text)
        risk_header = f"""
# 🚨 Contract Risk Assessment
**Risk Score:** {risk_data['score']}/100 ({risk_data['level']})  
**Why?** Detected: {', '.join(risk_data['flags'])}

---
"""
        # -------------------------------

        if hasattr(response, "text") and response.text:
            return risk_header + response.text
        else:
            return risk_header + str(response)

    except Exception as e:
        import sys
        import traceback
        
        # Risk score can still be calculated even if AI fails (if text exists)
        risk_data = calculate_risk_score(text) if text else {'score': 0, 'level': 'Unknown', 'flags': []}
        fallback_header = f"**Risk Score:** {risk_data['score']}/100 ({risk_data['level']})\n\n"

        # Check for Rate Limit (429)
        error_str = str(e)
        if "429" in error_str or "ResourceExhausted" in error_str:
             print(f"\n[WARNING] Rate Limit Hit: {e}", file=sys.stderr)
             return f"⚠️ **System Busy (Rate Limit):** \n\n{fallback_header}The free AI tier is currently overloaded. Please wait 1 minute and try again.\n\n" + (rule_based_analysis(text) if not image_parts else " (OCR unavailable without AI)")

        print(f"\n[ERROR] Gemini API Failed: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return f"AI Error: {type(e).__name__}: {str(e)} \n\n{fallback_header}Fallback Analysis:\n" + (rule_based_analysis(text) if not image_parts else " (OCR unavailable due to error)")


def calculate_risk_score(text):
    """
    Algorithmic Risk Scoring for Contracts.
    Scans for 20+ precise legal keywords and assigns weighted penalties.
    """
    if not text:
        return {"score": 0, "level": "Low", "flags": []}

    text_lower = text.lower()
    score = 0
    flags = []

    # Risk Categories & Weights
    # High Impact (30 pts) -> Immediate Deal-Breakers
    high_risks = {
        "termination without cause": 30,
        "termination for convenience": 30,
        "indemnify": 25,
        "indemnification": 25,
        "unlimited liability": 30,
        "liquidated damages": 25,
        "automatic renewal": 25,
        "auto-renewal": 25
    }

    # Medium Impact (15 pts) -> Standard but risky
    medium_risks = {
        "arbitration": 15,
        "exclusive jurisdiction": 15,
        "non-compete": 15,
        "exclusivity": 15,
        "penalty": 15,
        "late payment fee": 10,
        "confidentiality": 10,
        "work for hire": 15
    }

    # Low Impact (5 pts) -> Annoyances
    low_risks = {
        "written notice": 5,
        "30 days": 5,
        "reasonable efforts": 5
    }

    # 1. Scan High Risks
    for term, points in high_risks.items():
        if term in text_lower:
            score += points
            if term not in flags: flags.append(term.title())

    # 2. Scan Medium Risks
    for term, points in medium_risks.items():
        if term in text_lower:
            score += points
            # Only add to flags if we don't have too many already
            if term not in flags and len(flags) < 6: flags.append(term.title())

    # 3. Cap Score at 100
    score = min(score, 100)

    # Determine Level
    level = "Low"
    if score >= 70:
        level = "HIGH"
    elif score >= 40:
        level = "MEDIUM"

    return {
        "score": score,
        "level": level,
        "flags": flags if flags else ["Standard Terms"]
    }


def structured_prompt(text):

    return f"""
    You are an Expert Senior Legal Consultant with 20+ years of experience in contract law.
    
    Your task is to analyze the following legal document and provide a crucial, risk-focused summary for a client who is NOT a lawyer.
    
    IMPORTANT: Do NOT include any conversational filler (e.g., "As an Expert...", "Here is the analysis"). Start directly with the first header.

    Structure your response EXACTLY as follows:
    
    � **Executive Summary**
    [Provide a 2-3 sentence high-level overview of what this agreement is and its primary purpose.]
    
    🚨 **Risk Assessment**
    **Risk Score:** [LOW / MEDIUM / HIGH]
    **Justification:** [Briefly explain why this score was given.]
    
    � **Identified Parties**
    **First Party (Provider/Employer/etc.):** [Name]
    **Second Party (Client/Employee/etc.):** [Name]
    
    � **Key Clauses (Plain English)**
    [Summarize the top 5 most critical clauses. addressing Payment, Termination, Liability, etc.]
    - **[Clause Name]:** [Explanation of what it means in simple terms, not just what it says.]
    
    ⚠️ **Critical Risks & Warnings**
    [Highlight specific dangers, financial traps, or unfair terms.]
    - 🔴 **[Risk Title]:** [Description]
    
    🔍 **Missing Clauses**
    [Identify standard clauses that are suspiciously missing, e.g., Confidentiality, Dispute Resolution, Termination rights.]
    
    📅 **Key Dates & Deadlines**
    [List effective dates, renewal dates, and notice periods.]
    
    🎯 **Actionable Recommendations**
    [Specific advice on what to negotiate or clarify.]
    - [Recommendation 1]
    - [Recommendation 2]
    
    ---
    **Document Text:**
    {text[:15000]}
    """
