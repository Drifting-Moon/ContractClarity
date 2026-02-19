import fitz  # PyMuPDF
import os

def highlight_risky_clauses(pdf_path, risk_flags, output_filename=None):
    """
    Opens a PDF, searches for the risk_flags (list of strings),
    and highlights them in RED.
    Saves the new PDF and returns the output path.
    """
    if not pdf_path or not os.path.exists(pdf_path):
        return None

    if not risk_flags:
        return None

    try:
        doc = fitz.open(pdf_path)
        found_any = False

        for page in doc:
            for term in risk_flags:
                # Search for the term (case-insensitive)
                # quads=True returns the coordinates of the text
                quads = page.search_for(term, quads=True)

                if quads:
                    found_any = True
                    # Add Highlight Annotation
                    # We can do one highlight per occurence
                    for quad in quads:
                        annot = page.add_highlight_annot(quad)
                        annot.set_colors(stroke=(1, 0.4, 0.4)) # Light Red color
                        annot.set_opacity(0.5)
                        annot.update()

        if output_filename:
            output_path = output_filename
        else:
            # Create a default output name
            dir_name = os.path.dirname(pdf_path)
            base_name = os.path.basename(pdf_path)
            output_path = os.path.join(dir_name, f"highlighted_{base_name}")

        doc.save(output_path)
        doc.close()
        
        return output_path

    except Exception as e:
        print(f"Error highlighting PDF: {e}")
        return None
