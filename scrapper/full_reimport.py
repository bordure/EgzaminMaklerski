"""
Full reimport pipeline — re-extracts questions from PDFs with correct table formatting
while preserving domain/section/topic classification from existing JSON files.

Steps:
1. Save classification data from all existing JSONs (keyed by exam_date + id)
2. Re-extract questions fresh from PDFs (pdf_extracting logic)
3. Reformat SZOG order-book tables deterministically with auto row/col-major detection
4. Restore domain/section/topic from saved data
"""

import json
import re
import glob
from pathlib import Path

import pymupdf

DATA_DIR = Path(__file__).parent / "data"
RAW_EXAMS_DIR = Path(__file__).parent / "raw_exams"

CLASSIFICATION_FIELDS = ("domain", "section", "topic")
ALL_FIELDS = CLASSIFICATION_FIELDS  # only these need preserving; others come from PDF

# ── helpers ──────────────────────────────────────────────────────────────────

def normalize(s: str) -> str:
    s = s.replace('\r', '\n')
    s = re.sub(r'[\u00A0\u202F\u2007]', ' ', s)
    s = re.sub(r'[ \t\f\v]+', ' ', s)
    s = re.sub(r'\n[ \t]*\n+', '\n', s)
    return s


# ── PDF re-extraction (same logic as pdf_extracting.py) ──────────────────────

def extract_from_pdf(pdf_path: Path) -> list[dict]:
    """Re-extract all questions from a PDF, returning raw (unformatted) question dicts."""
    year_match = re.search(r'\d{2}\.\d{2}\.(\d{4})', pdf_path.name)
    exam_year = int(year_match.group(1)) if year_match else 2022

    doc = pymupdf.open(str(pdf_path))
    text = normalize("\n".join(page.get_text() for page in doc))

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
    answers = dict(re.findall(r'\b(\d{1,3})\s*([ABCD])\b', answer_key_text))

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
            "option_D": opts.get("D", ""),
            "correct_answer": answers.get(str(idx), ""),
            "exam_date": year_of_exam.group(0) if year_of_exam else None,
        }
        result.append(item)

    return result


# ── Order-book table formatter with auto row/col-major detection ──────────────

_ORDERBOOK_HEADER = re.compile(r'(KUPNO)\s+(LIMIT)\s+(SPRZEDA[ŻZ])', re.IGNORECASE)


def _toks(s: str) -> list:
    return [t for t in re.split(r'\s+', s.strip()) if t]


def _parse_price(tok: str):
    try:
        return float(tok.replace(',', '.'))
    except (ValueError, AttributeError):
        return None


def _is_monotonic(prices: list) -> bool:
    nums = [p for p in prices if p is not None]
    if len(nums) < 2:
        return True
    return (all(a >= b for a, b in zip(nums, nums[1:])) or
            all(a <= b for a, b in zip(nums, nums[1:])))


def _count_numeric(price_list: list) -> int:
    return sum(1 for p in price_list if p is not None)


def _detect_layout(toks: list) -> tuple:
    """
    Returns ('row', n_rows) or ('column', n_rows).

    Heuristic for order-book tables (KUPNO / LIMIT / SPRZEDAŻ):
    1. If len(toks) % 3 != 0 → row-major (incomplete last row with padding)
    2. Otherwise try both; check which gives monotonic LIMIT
    3. If both monotonic → prefer interpretation with most numeric values in LIMIT
       (order books never have --- in the LIMIT column)
    """
    n = len(toks)
    if n == 0:
        return ('row', 0)

    # Rule 1: non-divisible → row-major
    if n % 3 != 0:
        return ('row', (n // 3) + 1)

    n_rows = n // 3

    limit_cm = [_parse_price(toks[n_rows + i]) for i in range(n_rows)]
    limit_rm = [_parse_price(toks[i * 3 + 1]) for i in range(n_rows)]

    mono_cm = _is_monotonic(limit_cm)
    mono_rm = _is_monotonic(limit_rm)

    if mono_cm and not mono_rm:
        return ('column', n_rows)
    if mono_rm and not mono_cm:
        return ('row', n_rows)

    # Both (or neither) monotonic → tiebreak by which layout fills LIMIT with real prices
    if _count_numeric(limit_cm) > _count_numeric(limit_rm):
        return ('column', n_rows)
    return ('row', n_rows)


def _cell(tok: str) -> str:
    return '—' if tok in ('---', '--', '-', '—') else tok


def _build_table(col_a: list, col_b: list, col_c: list, headers: tuple) -> str:
    h1, h2, h3 = headers
    w1 = max(len(h1), max((len(_cell(v)) for v in col_a), default=1))
    w2 = max(len(h2), max((len(_cell(v)) for v in col_b), default=1))
    w3 = max(len(h3), max((len(_cell(v)) for v in col_c), default=1))
    lines = [
        f"| {h1:<{w1}} | {h2:<{w2}} | {h3:<{w3}} |",
        f"|{'-' * (w1 + 2)}|{'-' * (w2 + 2)}|{'-' * (w3 + 2)}|",
    ]
    for a, b, c in zip(col_a, col_b, col_c):
        lines.append(f"| {_cell(a):<{w1}} | {_cell(b):<{w2}} | {_cell(c):<{w3}} |")
    return "\n".join(lines)


_VALID_TABLE_TOK = re.compile(
    r'^(---|--|-|\d[\d.,]*|\d+|PKC|PCR|WNF|DDM|\([A-Z]+:\d[\d.,]*\))$',
    re.IGNORECASE,
)


def _split_table_tokens(text_after_header: str):
    """
    Consume valid order-book tokens from the start of text_after_header,
    stopping at the first non-table token (prose word).  Returns (toks, rest).
    """
    pos = 0
    n = len(text_after_header)
    toks = []
    while pos < n:
        # skip whitespace
        ws = re.match(r'\s+', text_after_header[pos:])
        if ws:
            pos += ws.end()
            continue
        m = re.match(r'\S+', text_after_header[pos:])
        if not m:
            break
        tok = m.group(0)
        if _VALID_TABLE_TOK.match(tok):
            toks.append(tok)
            pos += len(tok)
        else:
            break
    rest = text_after_header[pos:].strip()
    return toks, rest


def reformat_orderbook(raw_question: str):
    """
    Find the order-book table in raw_question and replace it with a
    correctly-transposed markdown table. Returns None if no table found.
    """
    m = _ORDERBOOK_HEADER.search(raw_question)
    if not m:
        return None

    headers = (m.group(1).upper(), m.group(2).upper(), m.group(3).upper())
    before = raw_question[:m.start()].rstrip()
    after_headers = raw_question[m.end():]

    # Tokenise strictly: stop at the first non-order-book token (prevents prose
    # text from being consumed as table data, e.g. questions like Q96/2024 where
    # plain-Polish sentences immediately follow the table).
    toks, rest = _split_table_tokens(after_headers)
    if not toks:
        return None

    layout, n_rows = _detect_layout(toks)

    # Pad to n_rows * 3
    padded = toks[:] + ['---'] * (n_rows * 3 - len(toks))
    padded = padded[: n_rows * 3]

    # For row-major with an incomplete last row, the missing cells at the start/end
    # of the last row may be blank in the PDF (not even '---'), so PyMuPDF omits them.
    # Use the token type (price vs quantity) to correctly position the lone/pair tokens.
    if layout == 'row':
        remainder = len(toks) % 3
        last = (n_rows - 1) * 3  # index into padded for last row start
        if remainder == 1:
            lone = toks[-1]
            if _parse_price(lone) is not None:
                # It's a price → belongs in LIMIT (col 1), not KUPNO (col 0)
                padded[last], padded[last + 1], padded[last + 2] = '---', lone, '---'
        elif remainder == 2:
            tok_a, tok_b = toks[-2], toks[-1]
            is_price_a = _parse_price(tok_a) is not None
            is_price_b = _parse_price(tok_b) is not None
            if is_price_a and not is_price_b:
                # [LIMIT, SPRZEDAZ] pattern — insert --- before as KUPNO
                padded[last], padded[last + 1], padded[last + 2] = '---', tok_a, tok_b

    if layout == 'column':
        col_a = padded[0: n_rows]
        col_b = padded[n_rows: n_rows * 2]
        col_c = padded[n_rows * 2: n_rows * 3]
    else:  # row
        col_a = [padded[i * 3]     for i in range(n_rows)]
        col_b = [padded[i * 3 + 1] for i in range(n_rows)]
        col_c = [padded[i * 3 + 2] for i in range(n_rows)]

    md = _build_table(col_a, col_b, col_c, headers)
    result = f"{before}\n\n{md}"
    if rest:
        result += f"\n\n{rest}"
    return result


# ── Main pipeline ─────────────────────────────────────────────────────────────

PDF_DATE_RE = re.compile(r'\d{2}\.\d{2}\.\d{4}')


def find_pdf(exam_date: str):
    for pdf in RAW_EXAMS_DIR.glob("*.pdf"):
        if exam_date in pdf.name:
            return pdf
    return None


def run(dry_run: bool = False):
    # Step 1 — save classifications from existing JSONs
    classifications = {}  # key: (exam_date, id) → {domain, section, topic}
    for path in DATA_DIR.glob("output*.json"):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for q in data:
            key = (q.get("exam_date"), q.get("id"))
            clf = {field: q[field] for field in CLASSIFICATION_FIELDS if field in q}
            if clf:
                classifications[key] = clf
    print(f"Saved classifications for {len(classifications)} questions.")

    # Step 2 — re-extract from PDFs and reformat tables
    total_fixed = 0
    for pdf_path in sorted(RAW_EXAMS_DIR.glob("*.pdf")):
        date_m = PDF_DATE_RE.search(pdf_path.name)
        if not date_m:
            continue
        exam_date = date_m.group(0)

        year_match = re.search(r'\d{2}\.\d{2}\.(\d{4})', pdf_path.name)
        if not year_match or int(year_match.group(1)) < 2022:
            print(f"Skipping {pdf_path.name} (pre-2022).")
            continue

        print(f"Re-extracting {pdf_path.name}...")
        questions = extract_from_pdf(pdf_path)
        if not questions:
            print(f"  No questions found.")
            continue

        for q in questions:
            # Reformat order-book tables in SZOG questions
            text = q["question"]
            if 'KUPNO' in text or 'LIMIT' in text:
                formatted = reformat_orderbook(text)
                if formatted:
                    q["question"] = formatted
                    total_fixed += 1

            # Step 3 — restore classification
            key = (q.get("exam_date"), q.get("id"))
            clf = classifications.get(key, {})
            q.update(clf)

        out_path = DATA_DIR / f"output{exam_date}.json"
        if dry_run:
            print(f"  [DRY RUN] Would write {len(questions)} questions to {out_path.name}")
            # Print 2 sample table questions
            for q in questions:
                if any(r'|' in q.get("question", "") for r in ['|---']):
                    print(f"  Sample Q{q['id']}:\n{q['question'][:300]}\n")
                    break
        else:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(questions, f, ensure_ascii=False, indent=2)
            print(f"  Written {len(questions)} questions to {out_path.name}")

    print(f"\nDone. Total table questions reformatted: {total_fixed}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
