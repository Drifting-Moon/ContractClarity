import sys
import os

# Add parent directory to path to find utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.highlighter import highlight_risky_clauses

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
