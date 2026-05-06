import pymupdf
import re
import os
from datetime import datetime
import json 


def normalize(s: str) -> str:
    s = s.replace('\r', '\n')
    s = re.sub(r'[\u00A0\u202F\u2007]', ' ', s)
    s = re.sub(r'[ \t\f\v]+', ' ', s)
    s = re.sub(r'\n[ \t]*\n+', '\n', s)
    return s

def extract_text_from_pdf(pdf_path: str, exam_year: int) -> str:
    """Extract text from PDF. Use OCR if exam year < 2022."""
    if exam_year < 2022:
        pass
    else:
        doc = pymupdf.open(pdf_path)
        text = "\n".join(page.get_text() for page in doc)
    return normalize(text)

def scrap_pdf_file(PDF_PATH: str):
    year_match = re.search(r'\d{2}\.\d{2}\.(\d{4})', PDF_PATH)
    exam_year = int(year_match.group(1)) if year_match else 2022
    if exam_year < 2022:
        print(f"Skipping file {PDF_PATH} due to old exam year {exam_year}.")
        return

    text = extract_text_from_pdf(PDF_PATH, exam_year)

    year_of_exam = re.search(r'\d{2}\.\d{2}\.\d{4}', text)
    zestaw = re.search(r'Zestaw numer\s+(\d+)', text)
    if zestaw is None:
        zestaw = re.search(r'Zestaw nr\s+(\d+)', text)
    m_phrase = re.search(r'Numer\s+pytania.*?z\s+zestawu', text, flags=re.IGNORECASE | re.DOTALL)
    if m_phrase:
        ak_start = m_phrase.start()
    else:
        m_pairs = re.search(r'(?:^|\n)\s*\d+\s+[A-D](?:\s+\d+\s+[A-D]){5,}', text)
        ak_start = m_pairs.start() if m_pairs else len(text)

    questions_text = text[:ak_start].strip()
    answer_key_text = text[ak_start:].strip()

    blocks = re.split(r'(?m)^(?=\d+\.\s)', questions_text)
    blocks = [b.strip() for b in blocks if b.strip()]

    result = []

    for idx, b in enumerate(blocks):
        qm = re.match(r'(\d+)\.\s+(.*?)(?=\n[A-D][\.\)]\s+)', b, flags=re.DOTALL)
        if not qm:
            continue

        q_text = re.sub(r'\s+', ' ', qm.group(2)).strip()

        opt_pairs = re.findall(r'([A-D])[\.\)]\s+(.*?)(?=\s+[A-D][\.\)]\s+|$)', b, flags=re.DOTALL)
        opts = {}
        for k, v in opt_pairs:
            cleaned = re.sub(r'\s+', ' ', v).strip()
            cleaned = cleaned.rstrip(' ;.')
            cleaned = re.sub(r'\s+\d{1,3}$', '', cleaned)
            opts[k] = cleaned

        item = {
            "id": idx,
            "question": q_text,
            "option_A": opts.get("A", ""),
            "option_B": opts.get("B", ""),
            "option_C": opts.get("C", ""),
            "option_D": opts.get("D", "")
        }
        result.append(item)

    answers = dict(re.findall(r'\b(\d{1,3})\s*([ABCD])\b', answer_key_text))

    for item in result:
        item["correct_answer"] = answers.get(str(item["id"]), "")
        item["exam_date"] = year_of_exam.group(0) if year_of_exam else None

        with open(f"data/output{year_of_exam.group(0)}.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        return

if __name__ == "__main__":
    for root, dirs, files in os.walk("raw_exams/"):
        for filename in files:
            if filename.lower().endswith(".pdf"):
                pdf_path = os.path.join(root, filename)
                scrap_pdf_file(pdf_path)
