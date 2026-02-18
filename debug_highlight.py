from highlighter import highlight_risky_clauses
import os
import sys

pdf_path = "high_risk_contract.pdf"
flags = ["Indemnify", "Unlimited Liability", "Arbitration"]

print(f"Testing highlighting on {pdf_path} with flags: {flags}")

if not os.path.exists(pdf_path):
    print(f"Error: {pdf_path} does not exist.")
    sys.exit(1)

try:
    output = highlight_risky_clauses(pdf_path, flags)
    print(f"Result path: {output}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Exception happened: {e}")
