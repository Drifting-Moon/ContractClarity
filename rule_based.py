import re

def rule_based_analysis(text):
    # --- Dates ---
    # Matches: Jan 1, 2024 | 2024-01-01 | 01/01/2024
    date_patterns = [
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
        r'\b\d{4}-\d{2}-\d{2}\b',
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
    ]
    dates = []
    for p in date_patterns:
        dates.extend(re.findall(p, text))

    # --- Money ---
    # Matches: $1,000 | €500 | 500 USD | 500 INR
    money_patterns = [
        r'[\$\€\£\₹]\s?\d+(?:,\d{3})*(?:\.\d{2})?',
        r'\b\d+(?:,\d{3})*(?:\.\d{2})?\s+(?:USD|EUR|GBP|INR|CAD|AUD)\b'
    ]
    money = []
    for p in money_patterns:
        money.extend(re.findall(p, text))

    # --- Parties ---
    # Naive attempt to find parties in "Between X and Y"
    parties = re.findall(r'(?i)between\s+(.*?)\s+and\s+(.*?)(?:,|\s+defined|\s+herein)', text)
    extracted_parties = []
    if parties:
        for p in parties:
            p1, p2 = p
            # clean up a bit
            p1 = p1.strip()
            p2 = p2.strip()
            if len(p1) < 100 and len(p2) < 100: # Sanity check length
                extracted_parties.append(f"{p1} & {p2}")

    # --- Clauses & Risks ---
    obligations = []
    risks = []
    gov_law = []
    confidentiality = []
    termination = []

    # Split by sentence boundaries (roughly)
    sentences = re.split(r'(?<=[.!?]) +', text)

    for s in sentences:
        s_lower = s.lower()
        s_clean = s.strip()
        if not s_clean: continue

        # Obligations
        if "shall" in s_lower or "must" in s_lower or "agree to" in s_lower:
            obligations.append(s_clean)
        
        # Risks
        if "breach" in s_lower or "penalty" in s_lower or "indemnif" in s_lower or "liability" in s_lower:
            risks.append(s_clean)

        # Specific Clauses
        if "governing law" in s_lower or "jurisdiction" in s_lower or "laws of" in s_lower:
            gov_law.append(s_clean)
        
        if "confidential" in s_lower or "non-disclosure" in s_lower:
            confidentiality.append(s_clean)

        if "terminat" in s_lower and ("notice" in s_lower or "immediate" in s_lower):
            termination.append(s_clean)


    # De-duplicate
    dates = list(set(dates))
    money = list(set(money))
    obligations = list(set(obligations))
    risks = list(set(risks))
    gov_law = list(set(gov_law))
    confidentiality = list(set(confidentiality))
    termination = list(set(termination))

    # Helper to format list
    def fmt_list(items, limit=3):
        if not items: return "None detected."
        return chr(10).join(['- ' + i[:200] + ('...' if len(i)>200 else '') for i in items[:limit]])

    sections = [
        f"🔍 **Document Overview (Advanced Rule-Based Analysis)**\nUsing pattern matching to extract key insights (No AI Key Provided).",
        
        f"🏷️ **Identified Parties**\n{fmt_list(extracted_parties, 1) if extracted_parties else 'Not automatically detected.'}",
        
        f"📅 **Key Dates**\n{', '.join(dates) if dates else 'No specific dates detected.'}",
        
        f"💰 **Financial Amounts**\n{', '.join(money) if money else 'No monetary values detected.'}",

        f"⚖️ **Governing Law / Jurisdiction**\n{fmt_list(gov_law, 1)}",

        f"🔒 **Confidentiality Clauses**\n{fmt_list(confidentiality, 1)}",

        f"🛑 **Termination & Notice**\n{fmt_list(termination, 1)}",
        
        f"📋 **Key Obligations**\n{fmt_list(obligations, 3)}",

        f"⚠️ **Potential Risks**\n{fmt_list(risks, 3)}",
        
        f"🎯 **Recommendation**\nFor a comprehensive analysis including summaries and legal interpretation, please provide a valid API Key or use Premium Mode."
    ]

    return "\n\n".join(sections)
