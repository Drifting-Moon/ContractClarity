from reportlab.pdfgen import canvas

def create_pdf(filename):
    c = canvas.Canvas(filename)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "HIGH RISK CONTRACT")
    
    c.setFont("Helvetica", 12)
    c.drawString(100, 700, "1. The Provider may terminate this agreement without cause.")
    c.drawString(100, 680, "2. The User agrees to indemnify the Provider against all claims.")
    c.drawString(100, 660, "3. This agreement shall automatically renew for successive terms.")
    c.drawString(100, 640, "4. The Provider shall have unlimited liability.")
    c.drawString(100, 620, "5. Any disputes shall be settled by binding arbitration.")
    c.save()

if __name__ == "__main__":
    create_pdf("high_risk_contract.pdf")
    print("high_risk_contract.pdf created")
