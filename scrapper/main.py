import pymupdf
import re
import pymongo
from pymongo import MongoClient
import json
from dotenv import load_dotenv
import os 

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "exam_db"
COLLECTION_NAME = "questions"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

def normalize(s: str) -> str:
    s = s.replace('\r', '\n')
    s = re.sub(r'[\u00A0\u202F\u2007]', ' ', s)   
    s = re.sub(r'[ \t\f\v]+', ' ', s)            
    s = re.sub(r'\n[ \t]*\n+', '\n', s)            
    return s

def get_main_and_sub_topic(question: str):
    q = question.lower()
    main_topic = ["Prawo"] if "zgodnie z" in q or "z ustawą" in q else ["Matematyka Finansowa"]
    sub_topic = []

    if main_topic[0] == 'Prawo':
        if "zasadami etyki zawodowej maklerów" in q:
            sub_topic = ["Zasady Etyki Zawodowej Maklerów i Doradców"]
        elif "szczegółowymi zasadami obrotu giełdowego" in q or "systemie utp" in q:
            sub_topic = ["Szczegółowe Zasady Obrotu Giełdowego"]
        elif "regulaminem giełdy" in q:
            sub_topic = ["Regulamin Giełdy"]
        elif "ustawą kodeks spółek handlowych" in q:
            sub_topic = ["Kodeks Spółek Handlowych"]
        elif "ustawą o obligacjach" in q:
            sub_topic = ["Ustawa o Obligacjach"]
        elif "ustawą o ofercie publicznej" in q:
            sub_topic = ["Ustawa o Ofercie Publicznej"]
        elif "ustawą o obrocie instrumentami finansowymi" in q:
            sub_topic = ["Ustawa o Obrocie Instrumentami Finansowymi"]
        elif "rozporządzeniem delegowanym komisji (ue) 2017/565" in q:
            sub_topic = ["Rozporządzenie UE 2017/565"]
        elif "rozporządzeniem ministra finansów" in q:
            sub_topic = ["Rozporządzenie Ministra Finansów"]
        elif "rozporządzeniem parlamentu europejskiego i rady (ue) nr 596/2014" in q or "nadużyć na rynku" in q:
            sub_topic = ["Rozporządzenie UE 596/2014 (MAR)"]
        elif "ustawą o rachunkowości" in q:
            sub_topic = ["Ustawa o Rachunkowości"]
        elif "ustawą o funduszach inwestycyjnych" in q:
            sub_topic = ["Ustawa o Funduszach Inwestycyjnych"]
        elif "ustawą o nadzorze nad rynkiem finansowym" in q:
            sub_topic = ["Ustawa o Nadzorze nad Rynkiem Finansowym"]
        elif "ustawą o przeciwdziałaniu praniu pieniędzy" in q or "ustawą aml" in q:
            sub_topic = ["Ustawa o Przeciwdziałaniu Praniu Pieniędzy (AML)"]
        elif "ustawą o giełdach towarowych" in q:
            sub_topic = ["Ustawa o Giełdach Towarowych"]
        elif "kodeks cywilny" in q:
            sub_topic = ["Kodeks Cywilny"]
    elif main_topic[0] == 'Matematyka Finansowa':
        if "kredyt" in q or "pożyczka" in q:
            sub_topic = ["Kredyty"]
        elif "obligacja" in q or "obligacj" in q:
            sub_topic = ["Obligacje"]
        elif "ryzyko" in q:
            sub_topic = ["Analiza Ryzyka"]
        elif "wycena" in q:
            sub_topic = ["Wycena Instrumentów Finansowych"]
    return main_topic, sub_topic

def scrap_pdf_file(PDF_PATH: str):
    doc = pymupdf.open(PDF_PATH)
    text = "\n".join(page.get_text() for page in doc)
    t = normalize(text)
    year_of_exam = re.search(r'\d{2}\.\d{2}\.\d{4}', t)
    zestaw = re.search(r'Zestaw numer\s+(\d+)', t)
    if zestaw is None:
        zestaw = re.search(r'Zestaw nr\s+(\d+)', t)
    m_phrase = re.search(r'Numer\s+pytania.*?z\s+zestawu', t, flags=re.IGNORECASE | re.DOTALL)
    if m_phrase:
        ak_start = m_phrase.start()
    else:
        m_pairs = re.search(r'(?:^|\n)\s*\d+\s+[A-D](?:\s+\d+\s+[A-D]){5,}', t)
        ak_start = m_pairs.start() if m_pairs else len(t)

    questions_text = t[:ak_start].strip()
    answer_key_text = t[ak_start:].strip()

    blocks = re.split(r'(?m)^(?=\d+\.\s)', questions_text)
    blocks = [b.strip() for b in blocks if b.strip()]

    result = []

    for idx, b in enumerate(blocks):
        qm = re.match(r'(\d+)\.\s+(.*?)(?=\s+[A-D][\.\)]\s+)', b, flags=re.DOTALL)
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
        topics = get_main_and_sub_topic(item["question"])
        item["main_topic"] = topics[0]
        item["sub_topic"] = topics[1]
        item["exam_date"] = year_of_exam.group(0) if year_of_exam else None

    # Insert into MongoDB
    if result:
        collection.insert_many(result)
        print(f"{len(result)} questions inserted into MongoDB collection '{COLLECTION_NAME}'.")

if __name__ == "__main__":
    for root, dirs, files in os.walk("data/"):
        for filename in files:
            if filename.lower().endswith(".pdf"):
                pdf_path = os.path.join(root, filename)
                scrap_pdf_file(pdf_path)