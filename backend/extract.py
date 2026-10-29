"""Read content from PDF (PyMuPDF), Word (python-docx) and images (Pillow, OpenCV, Tesseract OCR)."""
import io
def extract(name: str, data: bytes):
    n = name.lower()
    if n.endswith(".pdf"):
        import fitz
        return "\n".join(p.get_text() for p in fitz.open(stream=data, filetype="pdf")), "", False
    if n.endswith(".docx"):
        import docx
        return "\n".join(p.text for p in docx.Document(io.BytesIO(data)).paragraphs), "", False
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGB")
    r, g, b = im.resize((1, 1)).getpixel((0, 0)); color = "#%02x%02x%02x" % (r, g, b)
    try:
        import cv2, numpy as np, pytesseract
        gray = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY)
        return pytesseract.image_to_string(gray), color, True
    except Exception:
        return "", color, True
