from pymongo import MongoClient, ASCENDING
from pymongo.errors import BulkWriteError
import time
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from misc.log import get_logger
from misc.settings import ScrapperSettings

log = get_logger(__name__)
_cfg = ScrapperSettings()


class Ingestion():
    def __init__(self, mode, is_inserting=True):
        self.mode = mode
        self.is_inserting = is_inserting
        if self.is_inserting:
            self.client = self._create_mongo_client()
            self.db = self.client["exam_db"]
            self.collection = self.db["questions"]

    def _create_mongo_client(self):
        return MongoClient(_cfg.mongo_uri)

    def clear_collection(self):
        self.collection.drop()

    def get_main_and_sub_topic(self, question: str):
        q = question.lower()

        law_keywords = {
            "zasadami etyki zawodowej maklerów": "Zasady Etyki Zawodowej Maklerów i Doradców",
            "szczegółowymi zasadami obrotu giełdowego": "Szczegółowe Zasady Obrotu Giełdowego",
            "systemie utp": "Szczegółowe Zasady Obrotu Giełdowego",
            "regulaminem giełdy": "Regulamin Giełdy",
            "ustawą kodeks spółek handlowych": "Kodeks Spółek Handlowych",
            "ustawą o obligacjach": "Ustawa o Obligacjach",
            "ustawą o ofercie publicznej": "Ustawa o Ofercie Publicznej",
            "ustawą o obrocie instrumentami finansowymi": "Ustawa o Obrocie Instrumentami Finansowymi",
            "rozporządzeniem delegowanym komisji (ue) 2017/565": "Rozporządzenie UE 2017/565",
            "rozporządzeniem ministra finansów": "Rozporządzenie Ministra Finansów",
            "rozporządzeniem parlamentu europejskiego i rady (ue) nr 596/2014": "Rozporządzenie UE 596/2014 (MAR)",
            "nadużyć na rynku": "Rozporządzenie UE 596/2014 (MAR)",
            "ustawą o rachunkowości": "Ustawa o Rachunkowości",
            "ustawą o funduszach inwestycyjnych": "Ustawa o Funduszach Inwestycyjnych",
            "ustawą o nadzorze nad rynkiem finansowym": "Ustawa o Nadzorze nad Rynkiem Finansowym",
            "ustawą o przeciwdziałaniu praniu pieniędzy": "Ustawa o Przeciwdziałaniu Praniu Pieniędzy (AML)",
            "ustawą aml": "Ustawa o Przeciwdziałaniu Praniu Pieniędzy (AML)",
            "ustawą o giełdach towarowych": "Ustawa o Giełdach Towarowych",
            "kodeks cywilny": "Kodeks Cywilny",
        }

        math_keywords = {
            "kredyt": "Kredyty",
            "pożyczka": "Kredyty",
            "obligacja": "Obligacje",
            "obligacj": "Obligacje",
            "ryzyko": "Analiza Ryzyka",
            "wycena": "Wycena Instrumentów Finansowych",
            "opcji": "Instrumenty Pochodne",
            "opcje": "Instrumenty Pochodne",
            "forward": "Instrumenty Pochodne",
            "futures": "Instrumenty Pochodne",
            "scholes": "Instrumenty Pochodne",
            "rentowności portfela": "Rentowność Portfela",
            "sharpe": "Wskaźniki ryzyka",
            "jensen": "Wskaźniki ryzyka",
            "treynor": "Wskaźniki ryzyka",
            "współczynnik grecki": "Wskaźniki ryzyka",
            "delta": "Wskaźniki ryzyka",
            "beta": "Wskaźniki ryzyka",
            "stopa procentowa": "Stopy Procentowe i Inflacja",
            "stopa inflacji": "Stopy Procentowe i Inflacja",
            "lokat": "Lokaty",
            "npv": "Net Present Value (NPV)",
            "konto oszczędnościowe": "Wartość pieniądza w czasie",
            "przepływów pieniężnych": "Wartość pieniądza w czasie",
        }

        if "zgodnie z" in q or "z ustawą" in q:
            main_topic = ["Prawo"]
            sub_topic = [v for k, v in law_keywords.items() if k in q][:1]
        else:
            main_topic = ["Matematyka Finansowa"]
            sub_topic = [v for k, v in math_keywords.items() if k in q][:1]

        return main_topic, sub_topic or []

    def safe_insert_many(self, docs, batch_size=10, max_retries=5):
        """
        Insert documents into MongoDB in batches with retry logic and rate limiting handling.
        Automatically strips _id fields and respects unique index constraints.
        """
        if not self.is_inserting:
            log.info("Inserting is disabled. Skipping insertion.")
            return
        
        for d in docs:
            d.pop("_id", None)
            d.pop("id", None)

        for i in range(0, len(docs), batch_size):
            batch = docs[i:i + batch_size]
            for attempt in range(max_retries):
                try:
                    self.collection.insert_many(batch, ordered=False)
                    break
                except BulkWriteError as bwe:
                    details = bwe.details
                    write_errors = details.get("writeErrors", [])
                    retry_ms = 3000
                    should_retry = False

                    for err in write_errors:
                        msg = err.get("errmsg", "")
                        if "Request rate is large" in msg or "RetryAfterMs" in msg:
                            match = re.search(r"RetryAfterMs=(\d+)", msg)
                            retry_ms = int(match.group(1)) if match else 2000
                            should_retry = True
                            log.warning("Rate limit hit - retrying in %dms.", retry_ms)
                        elif "duplicate key error" in msg:
                            continue
                        else:
                            log.error("Unexpected write error: %s", msg)

                    if should_retry:
                        time.sleep(retry_ms / 1000.0)
                        continue

                    break

            else:
                raise Exception("Max retries exceeded during insert_many for a batch.")

        log.info("All batches inserted successfully.")
