import argparse
import json
import time
import sys
from enum import Enum
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, model_validator

sys.path.insert(0, str(Path(__file__).parent.parent))

from misc.log import get_logger
from misc.settings import ScrapperSettings

load_dotenv()

log = get_logger(__name__)
cfg = ScrapperSettings()

DATA_DIR = Path(__file__).parent / "data"
REQUEST_DELAY = 0.3 



class Domain(str, Enum):
    """High-level exam part (Część)."""

    MATEMATYKA_FINANSOWA = "Matematyka Finansowa"
    PRAWO_I_ETYKA = "Prawo i Etyka"


class Section(str, Enum):
    """Thematic group (Dział) within a domain."""

    ANALIZA_PORTFELOWA = "Analiza Portfelowa"
    ANALIZA_WSKAZNIKOWA_I_WYCENA = "Analiza wskaźnikowa i wycena"
    INSTRUMENTY_DLUZNE = "Instrumenty Dłużne"
    INSTRUMENTY_POCHODNE = "Instrumenty Pochodne"
    MATEMATYKA_FINANSOWA = "Matematyka Finansowa"
    TECHNIKI_NOTOWAN_GIELDOWYCH = "Techniki Notowań Giełdowych"
    ETYKA = "Etyka"
    PRAWO_ROZPORZADZENIA = "Prawo - Rozporządzenia"
    PRAWO_USTAWY = "Prawo - Ustawy"


class Topic(str, Enum):
    """Specific subject (Temat) within a section."""

    WSKAZNIKI_EFEKTYWNOSCI_PORTFELEM = "Wskaźniki efektywności zarządzania portfelem"
    KONTRYBUCJA_DO_STOPY_ZWROTU = "Kontrybucja do stopy zwrotu"
    MODELE_RYNKU = "Modele rynku (CML, Sharpe, CAPM)"
    STRATEGIE_ZARZADZANIA_PORTFELAMI = "Strategie zarządzania portfelami"
    SREDNI_WAZONY_KOSZT_KAPITALU = "Średni ważony koszt kapitału"
    DZWIGNIE = "Dźwignie"
    WSKAZNIKI_AKTYWNOSCI = "Wskaźniki aktywności"
    METODY_WYCENY_PRZEDSIEBIORSTW = "Metody wyceny przedsiębiorstw"
    WSKAZNIKI_RENTOWNOSCI = "Wskaźniki rentowności"
    MODEL_GORDONA = "Model Gordona"
    OBLIGACJE_ZEROKUPONOWE = "Obligacje zerokuponowe"
    RODZAJE_OBLIGACJI_I_ICH_RYZYKA = "Rodzaje obligacji i ich ryzyka"
    WYPUKLOSC_OBLIGACJI = "Wypukłość obligacji (convexity)"
    METODA_ROWNYCH_RAT_KAPITALOWYCH = "Metoda równych rat kapitałowych"
    DURATION = "Duration"
    METODA_ROWNYCH_KWOT_PLATNOSCI_KREDYTU = "Metoda równych kwot płatności kredytu"
    STOPY_ZWROTU_Z_OBLIGACJI = "Stopy zwrotu z obligacji"
    ZARZADZANIE_PORTFELEM_OBLIGACJI = "Zarządzanie portfelem obligacji"
    KRZYWA_RENTOWNOSCI = "Krzywa rentowności"
    KONTRAKTY_TERMINOWE = "Kontrakty terminowe"
    STRATEGIE_OPCYJNE_WYKORZYSTANIE = "Strategie opcyjne - wykorzystanie strategii"
    STRATEGIE_OPCYJNE_BUDOWA = "Strategie opcyjne - budowa strategii"
    STRATEGIE_OPCYJNE_LACZENIE = "Strategie opcyjne - łączenie strategii"
    OPCJE_REALNE = "Opcje realne"
    WSPOLCZYNNIKI_GRECKIE = "Współczynniki greckie"
    MODELE_WYCENY_OPCJI = "Modele wyceny opcji"
    METODY_OCENY_PROJEKTOW = "Metody oceny projektów inwestycyjnych"
    STOPA_ZWROTU_Z_INWESTYCJI = "Stopa zwrotu z inwestycji"
    WARTOSC_BIEZACA_RENTY_WIECZYSTEJ = "Wartość bieżąca renty wieczystej"
    NPV_I_PI = "NPV i PI"
    WARTOSC_BIEZACA_RENTY = "Wartość bieżąca renty"
    STOPA_IRR_I_MIRR = "Stopa IRR i MIRR"
    WARTOSC_BIEZACA = "Wartość bieżąca"
    WARTOSC_PRZYSZLA_RENTY = "Wartość przyszła renty"
    REGULAMIN_GPW = "Regulamin GPW"
    SZOG = "SZOG"
    ZASADY_ETYKI_ZAWODOWEJ = "Zasady etyki zawodowej Maklerów i Doradców"
    ROZPORZADZENIE_2017_565 = "Rozporządzenie Nr 2017/565"
    SZCZEGOLOWE_WARUNKI_TECH_I_ORG = "Szczegółowe warunki techniczne i organizacyjne dla firm inwestycyjnych"
    ROZPORZADZENIE_596_2014 = "Rozporządzenie Nr 596/2014 (MAR)"
    TRYB_I_WARUNKI_POSTEPOWANIA = "Tryb i warunki postępowania firm inwestycyjnych i banków"
    USTAWA_O_NADZORZE = "Ustawa o nadzorze nad rynkiem finansowym"
    USTAWA_O_OBROCIE_ART_1_45 = "Ustawa o obrocie (art. 1 do 45)"
    USTAWA_O_RACHUNKOWOSCI_LACZENIE = "Ustawa o rachunkowości - Łączenie spółek"
    USTAWA_O_OFERCIE_PUBLICZNEJ = "Ustawa o ofercie publicznej"
    USTAWA_O_OBLIGACJACH = "Ustawa o obligacjach"
    KODEKS_CYWILNY = "Kodeks Cywilny"
    USTAWA_O_RACHUNKOWOSCI_DEFINICJE = "Ustawa o rachunkowości - Definicje"
    USTAWA_O_OBROCIE_ART_69_FIRMY = "Ustawa o obrocie (art. 69+) - Firmy inwestycyjne"
    KODEKS_SPOLEK_HANDLOWYCH = "Kodeks Spółek Handlowych"
    USTAWA_O_OBROCIE_ART_45A_68 = "Ustawa o obrocie (art. 45a do 68)"
    USTAWA_O_FUNDUSZACH = "Ustawa o funduszach inwestycyjnych"


_DOMAIN_SECTIONS: dict[Domain, set[Section]] = {
    Domain.MATEMATYKA_FINANSOWA: {
        Section.ANALIZA_PORTFELOWA,
        Section.ANALIZA_WSKAZNIKOWA_I_WYCENA,
        Section.INSTRUMENTY_DLUZNE,
        Section.INSTRUMENTY_POCHODNE,
        Section.MATEMATYKA_FINANSOWA,
        Section.TECHNIKI_NOTOWAN_GIELDOWYCH,
    },
    Domain.PRAWO_I_ETYKA: {
        Section.ETYKA,
        Section.PRAWO_ROZPORZADZENIA,
        Section.PRAWO_USTAWY,
    },
}

_SECTION_TOPICS: dict[Section, set[Topic]] = {
    Section.ANALIZA_PORTFELOWA: {
        Topic.WSKAZNIKI_EFEKTYWNOSCI_PORTFELEM,
        Topic.KONTRYBUCJA_DO_STOPY_ZWROTU,
        Topic.MODELE_RYNKU,
        Topic.STRATEGIE_ZARZADZANIA_PORTFELAMI,
        Topic.SREDNI_WAZONY_KOSZT_KAPITALU,
    },
    Section.ANALIZA_WSKAZNIKOWA_I_WYCENA: {
        Topic.DZWIGNIE,
        Topic.WSKAZNIKI_AKTYWNOSCI,
        Topic.METODY_WYCENY_PRZEDSIEBIORSTW,
        Topic.WSKAZNIKI_RENTOWNOSCI,
        Topic.MODEL_GORDONA,
    },
    Section.INSTRUMENTY_DLUZNE: {
        Topic.OBLIGACJE_ZEROKUPONOWE,
        Topic.RODZAJE_OBLIGACJI_I_ICH_RYZYKA,
        Topic.WYPUKLOSC_OBLIGACJI,
        Topic.METODA_ROWNYCH_RAT_KAPITALOWYCH,
        Topic.DURATION,
        Topic.METODA_ROWNYCH_KWOT_PLATNOSCI_KREDYTU,
        Topic.STOPY_ZWROTU_Z_OBLIGACJI,
        Topic.ZARZADZANIE_PORTFELEM_OBLIGACJI,
        Topic.KRZYWA_RENTOWNOSCI,
    },
    Section.INSTRUMENTY_POCHODNE: {
        Topic.KONTRAKTY_TERMINOWE,
        Topic.STRATEGIE_OPCYJNE_WYKORZYSTANIE,
        Topic.STRATEGIE_OPCYJNE_BUDOWA,
        Topic.STRATEGIE_OPCYJNE_LACZENIE,
        Topic.OPCJE_REALNE,
        Topic.WSPOLCZYNNIKI_GRECKIE,
        Topic.MODELE_WYCENY_OPCJI,
    },
    Section.MATEMATYKA_FINANSOWA: {
        Topic.METODY_OCENY_PROJEKTOW,
        Topic.STOPA_ZWROTU_Z_INWESTYCJI,
        Topic.WARTOSC_BIEZACA_RENTY_WIECZYSTEJ,
        Topic.NPV_I_PI,
        Topic.WARTOSC_BIEZACA_RENTY,
        Topic.STOPA_IRR_I_MIRR,
        Topic.WARTOSC_BIEZACA,
        Topic.WARTOSC_PRZYSZLA_RENTY,
    },
    Section.TECHNIKI_NOTOWAN_GIELDOWYCH: {
        Topic.REGULAMIN_GPW,
        Topic.SZOG,
    },
    Section.ETYKA: {
        Topic.ZASADY_ETYKI_ZAWODOWEJ,
    },
    Section.PRAWO_ROZPORZADZENIA: {
        Topic.ROZPORZADZENIE_2017_565,
        Topic.SZCZEGOLOWE_WARUNKI_TECH_I_ORG,
        Topic.ROZPORZADZENIE_596_2014,
        Topic.TRYB_I_WARUNKI_POSTEPOWANIA,
    },
    Section.PRAWO_USTAWY: {
        Topic.USTAWA_O_NADZORZE,
        Topic.USTAWA_O_OBROCIE_ART_1_45,
        Topic.USTAWA_O_RACHUNKOWOSCI_LACZENIE,
        Topic.USTAWA_O_OFERCIE_PUBLICZNEJ,
        Topic.USTAWA_O_OBLIGACJACH,
        Topic.KODEKS_CYWILNY,
        Topic.USTAWA_O_RACHUNKOWOSCI_DEFINICJE,
        Topic.USTAWA_O_OBROCIE_ART_69_FIRMY,
        Topic.KODEKS_SPOLEK_HANDLOWYCH,
        Topic.USTAWA_O_OBROCIE_ART_45A_68,
        Topic.USTAWA_O_FUNDUSZACH,
    },
}


class QuestionClassification(BaseModel):
    """Three-level taxonomy classification for a Polish broker exam question."""

    domain: Domain
    section: Section
    topic: Topic

    @model_validator(mode="after")
    def validate_hierarchy(self) -> "QuestionClassification":
        """Ensure section belongs to domain and topic belongs to section."""
        valid_sections = _DOMAIN_SECTIONS.get(self.domain, set())
        if self.section not in valid_sections:
            raise ValueError(
                f"Section '{self.section.value}' does not belong to "
                f"domain '{self.domain.value}'. "
                f"Valid sections: {[s.value for s in valid_sections]}"
            )
        valid_topics = _SECTION_TOPICS.get(self.section, set())
        if self.topic not in valid_topics:
            raise ValueError(
                f"Topic '{self.topic.value}' does not belong to "
                f"section '{self.section.value}'. "
                f"Valid topics: {[t.value for t in valid_topics]}"
            )
        return self


_SYSTEM_PROMPT = """\
You are an expert classifier for Polish stock broker (Makler Papierów Wartościowych) exam questions.

Given a question text, assign it to exactly one value at each of three levels:

DOMAIN (Część):
  "Matematyka Finansowa"  – financial mathematics, portfolio theory, derivatives, bonds, exchange trading
  "Prawo i Etyka"         – Polish/EU law, regulations, ethics for brokers

SECTION (Dział) – must be consistent with the domain:
  For "Matematyka Finansowa":
    "Analiza Portfelowa", "Analiza wskaźnikowa i wycena", "Instrumenty Dłużne",
    "Instrumenty Pochodne", "Matematyka Finansowa", "Techniki Notowań Giełdowych"
  For "Prawo i Etyka":
    "Etyka", "Prawo - Rozporządzenia", "Prawo - Ustawy"

TOPIC (Temat) – must be consistent with the section:
  Analiza Portfelowa:
    Wskaźniki efektywności zarządzania portfelem | Kontrybucja do stopy zwrotu |
    Modele rynku (CML, Sharpe, CAPM) | Strategie zarządzania portfelami |
    Średni ważony koszt kapitału
  Analiza wskaźnikowa i wycena:
    Dźwignie | Wskaźniki aktywności | Metody wyceny przedsiębiorstw |
    Wskaźniki rentowności | Model Gordona
  Instrumenty Dłużne:
    Obligacje zerokuponowe | Rodzaje obligacji i ich ryzyka |
    Wypukłość obligacji (convexity) | Metoda równych rat kapitałowych | Duration |
    Metoda równych kwot płatności kredytu | Stopy zwrotu z obligacji |
    Zarządzanie portfelem obligacji | Krzywa rentowności
  Instrumenty Pochodne:
    Kontrakty terminowe | Strategie opcyjne - wykorzystanie strategii |
    Strategie opcyjne - budowa strategii | Strategie opcyjne - łączenie strategii |
    Opcje realne | Współczynniki greckie | Modele wyceny opcji
  Matematyka Finansowa:
    Metody oceny projektów inwestycyjnych | Stopa zwrotu z inwestycji |
    Wartość bieżąca renty wieczystej | NPV i PI | Wartość bieżąca renty |
    Stopa IRR i MIRR | Wartość bieżąca | Wartość przyszła renty
  Techniki Notowań Giełdowych:
    Regulamin GPW | SZOG
  Etyka:
    Zasady etyki zawodowej Maklerów i Doradców
  Prawo - Rozporządzenia:
    Rozporządzenie Nr 2017/565 |
    Szczegółowe warunki techniczne i organizacyjne dla firm inwestycyjnych |
    Rozporządzenie Nr 596/2014 (MAR) |
    Tryb i warunki postępowania firm inwestycyjnych i banków
  Prawo - Ustawy:
    Ustawa o nadzorze nad rynkiem finansowym | Ustawa o obrocie (art. 1 do 45) |
    Ustawa o rachunkowości - Łączenie spółek | Ustawa o ofercie publicznej |
    Ustawa o obligacjach | Kodeks Cywilny | Ustawa o rachunkowości - Definicje |
    Ustawa o obrocie (art. 69+) - Firmy inwestycyjne | Kodeks Spółek Handlowych |
    Ustawa o obrocie (art. 45a do 68) | Ustawa o funduszach inwestycyjnych

Return ONLY valid JSON with keys: domain, section, topic. Use the exact string values listed above.\
"""


def _build_client() -> OpenAI:
    """Instantiate the OpenAI client pointed at the Azure endpoint."""
    base_url = cfg.azure_openai_endpoint.removesuffix("/chat/completions")
    return OpenAI(base_url=base_url, api_key=cfg.azure_openai_key)


def classify_question(
    client: OpenAI,
    deployment: str,
    question_text: str,
    max_retries: int = 3,
) -> QuestionClassification:
    """Call the Azure-hosted OpenAI endpoint and return a validated QuestionClassification.

    Uses JSON mode and validates the response with Pydantic.
    Retries up to max_retries times on transient errors.
    Raises on persistent failure or invalid AI output.
    """
    user_message = f"Classify this exam question:\n\n{question_text}"

    for attempt in range(1, max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
            raw = response.choices[0].message.content
            if not raw:
                raise ValueError("Model returned empty content.")
            return QuestionClassification.model_validate_json(raw)
        except Exception as exc:
            if attempt == max_retries:
                raise
            wait = REQUEST_DELAY * (2 ** attempt)
            log.warning("Attempt %d/%d failed (%s). Retrying in %.1fs.", attempt, max_retries, exc, wait)
            time.sleep(wait)

    raise RuntimeError("Unreachable")


def _already_classified(question: dict) -> bool:
    """Return True when all three classification fields are present."""
    return all(k in question for k in ("domain", "section", "topic"))


def process_file(
    path: Path,
    client: OpenAI,
    deployment: str,
    force: bool,
) -> int:
    """Classify questions in a single JSON file and write it back in place.

    Returns the number of questions that were (re-)classified.
    """
    with open(path, encoding="utf-8") as fh:
        questions: list[dict] = json.load(fh)

    classified_count = 0

    for idx, question in enumerate(questions, start=1):
        if not force and _already_classified(question):
            continue

        question_text = question.get("question", "")
        if not question_text:
            log.warning("Question %d has no 'question' field - skipping.", idx)
            continue

        try:
            classification = classify_question(client, deployment, question_text)
        except Exception as exc:
            log.error("Question %d classification failed: %s", idx, exc)
            continue

        question["domain"] = classification.domain.value
        question["section"] = classification.section.value
        question["topic"] = classification.topic.value
        classified_count += 1

        log.info(
            "[%3d] %s > %s > %s",
            idx,
            classification.domain.value,
            classification.section.value,
            classification.topic.value,
        )
        time.sleep(REQUEST_DELAY)

    with open(path, "w", encoding="utf-8") as fh:
        json.dump(questions, fh, ensure_ascii=False, indent=2)

    return classified_count


def main() -> None:
    """Parse arguments and run classification over all question JSON files."""
    parser = argparse.ArgumentParser(
        description="Classify exam questions via Azure OpenAI structured output."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-classify questions that already have domain/section/topic.",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=None,
        help="Process a single file instead of the whole data directory.",
    )
    args = parser.parse_args()

    client = _build_client()
    deployment = cfg.azure_openai_deployment

    files: list[Path]
    if args.file:
        files = [args.file]
    else:
        files = sorted(DATA_DIR.glob("output*.json"))

    if not files:
        log.warning("No output*.json files found in %s", DATA_DIR)
        return

    total = 0
    for path in files:
        log.info("Processing file: %s", path.name)
        count = process_file(path, client, deployment, force=args.force)
        total += count
        log.info("%s: %d question(s) classified.", path.name, count)

    log.info("Done. Total classified: %d", total)


if __name__ == "__main__":
    main()
