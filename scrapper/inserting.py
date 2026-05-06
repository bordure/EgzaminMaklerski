import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from misc.log import get_logger
from misc.settings import BaseAppSettings
from ingestion import Ingestion
import os
import json

log = get_logger(__name__)

REQUIRED_FIELDS = ("domain", "section", "topic")


def main(is_inserting: bool = True) -> None:
    """Load pre-classified question JSON files and insert them into MongoDB."""
    app_settings = BaseAppSettings()
    environment = app_settings.environment
    log.info("Starting insertion run (environment=%s, inserting=%s)", environment, is_inserting)

    ingestion = Ingestion(environment, is_inserting)
    if is_inserting:
        log.info("Collections before drop: %s", ingestion.db.list_collection_names())
        ingestion.collection.drop()
        log.info("Collections after drop: %s", ingestion.db.list_collection_names())

    data_dir = "data/"
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if not file.lower().endswith(".json"):
                continue
            path = os.path.join(data_dir, file)
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            valid = []
            for question in data:
                question.pop("id", None)
                question.pop("_id", None)
                missing = [k for k in REQUIRED_FIELDS if not question.get(k)]
                if missing:
                    log.warning(
                        "Skipping question (missing %s): %r",
                        missing,
                        question.get("question", "")[:60],
                    )
                    continue
                valid.append(question)

            log.info("%s: %d/%d questions ready for insert.", file, len(valid), len(data))
            ingestion.safe_insert_many(valid)


if __name__ == "__main__":
    main(is_inserting=True)
