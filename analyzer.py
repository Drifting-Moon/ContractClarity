import os
import google.generativeai as genai
from dotenv import load_dotenv
import threading
from rule_based import rule_based_analysis

load_dotenv()

# Your premium server key (from .env)
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY")

# Lock to prevent race conditions with global API key configuration
api_lock = threading.Lock()


def analyze_document(text, mode="free", provider="gemini", model_name="gemini-1.5-flash", custom_api_key=None, confirm_fallback=False):
    
    api_key = None
    model_to_use = model_name

    # 1. Check Keywords
    # ---------------- PREMIUM MODE ----------------
    if mode == "premium":

        if not DEFAULT_API_KEY:
             # If server key is missing
             if not confirm_fallback:
                 return {"status": "confirmation_needed"}
             return "⚠️ **Warning:** Premium AI key not configured on server. \n\n" + rule_based_analysis(text)

        api_key = DEFAULT_API_KEY
        model_to_use = "gemini-1.5-flash"  # your premium default model


    # ---------------- FREE MODE ----------------
    else:

        if not custom_api_key:
             # If user key is missing
             if not confirm_fallback:
                 return {"status": "confirmation_needed"}
             return "⚠️ **Warning:** No API key provided (Free Mode). Showing basic analysis. \n\n" + rule_based_analysis(text)

        api_key = custom_api_key

        # Only Gemini actually supported for now
        if provider != "gemini":
            return f"{provider} integration coming soon. Currently only Gemini is supported."

        model_to_use = model_name if model_name else "gemini-1.5-flash"


    # ---------------- AI EXECUTION ----------------
    try:
        with api_lock:
            genai.configure(api_key=api_key)

            model = genai.GenerativeModel(model_to_use)

            prompt = structured_prompt(text)

            response = model.generate_content(prompt)

        if hasattr(response, "text") and response.text:
            return response.text
        else:
            return str(response)

    except Exception as e:
        return f"AI Error: {str(e)} \n\nFallback Analysis:\n" + rule_based_analysis(text)


def structured_prompt(text):

    return f"""
    You are an Expert Senior Legal Consultant with 20+ years of experience in contract law.
    
    Your task is to analyze the following legal document and provide a crucial, risk-focused summary for a client who is NOT a lawyer.
    
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
