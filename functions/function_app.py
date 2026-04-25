"""
Azure Functions — Egzamin Maklerski
====================================
Function 1 — blob_to_mongo  (POST /api/blob_to_mongo)
  Downloads every *.json blob from the exam-data container and (re-)inserts
  the questions into MongoDB, replicating the logic of scrapper/inserting.py.
  Pass ?drop=false to append instead of replacing the collection.

Function 2 — learning_advisor  (POST /api/learning_advisor)
  Body: {"google_id": "...", "name": "optional display name"}
  Queries the SQL DB for the user's per-topic answer statistics, then calls
  Azure OpenAI to return a personalised study plan in Polish.

Both functions require a Function-level key (x-functions-key header or
?code= query param).  Retrieve the key from the Azure portal or with:
  az functionapp keys list -g <rg> -n <func-app-name>
"""

import json
import logging
import os
import sqlite3
import time
from typing import Optional
from urllib.parse import urlparse, unquote

import azure.functions as func
from azure.storage.blob import BlobServiceClient
from openai import AzureOpenAI
from pymongo import MongoClient
from pymongo.errors import BulkWriteError
import pymssql

app = func.FunctionApp()

_REQUIRED_FIELDS = ("domain", "section", "topic")


@app.route(route="blob_to_mongo", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def blob_to_mongo(req: func.HttpRequest) -> func.HttpResponse:
    """
    Download all *.json blobs from the exam-data container and insert them
    into the MongoDB questions collection.

    Query params:
      drop=true  (default) — drop the collection before inserting (idempotent full refresh)
      drop=false            — append without dropping (useful for incremental updates)
    """
    logging.info("blob_to_mongo triggered")

    storage_conn    = os.environ["AZURE_STORAGE_CONNECTION_STRING"]
    container_name  = os.environ.get("BLOB_CONTAINER_NAME", "exam-data")
    mongo_uri       = os.environ["MONGO_URI"]
    db_name         = os.environ.get("MONGO_DB_NAME", "exam_db")
    collection_name = os.environ.get("MONGO_COLLECTION_NAME", "questions")

    try:
        blob_service      = BlobServiceClient.from_connection_string(storage_conn)
        container_client  = blob_service.get_container_client(container_name)
        mongo             = MongoClient(mongo_uri)
        collection        = mongo[db_name][collection_name]

        drop = req.params.get("drop", "true").lower() != "false"
        if drop:
            collection.drop()
            logging.info("Dropped collection %s.%s before re-insert", db_name, collection_name)

        total_inserted = 0
        total_skipped  = 0
        files_processed = []

        for blob in container_client.list_blobs():
            if not blob.name.lower().endswith(".json"):
                continue

            raw  = container_client.get_blob_client(blob.name).download_blob().readall()
            data = json.loads(raw)

            valid = []
            for question in data:
                question.pop("id",  None)
                question.pop("_id", None)
                missing = [k for k in _REQUIRED_FIELDS if not question.get(k)]
                if missing:
                    total_skipped += 1
                    continue
                valid.append(question)

            BATCH_SIZE = 20
            for i in range(0, len(valid), BATCH_SIZE):
                batch = valid[i:i + BATCH_SIZE]
                for attempt in range(5):
                    try:
                        result = collection.insert_many(batch, ordered=False)
                        total_inserted += len(result.inserted_ids)
                        break
                    except BulkWriteError as bwe:
                        n = bwe.details.get("nInserted", 0)
                        errors = bwe.details.get("writeErrors", [])
                        rate_limited = any(e.get("code") == 16500 for e in errors)
                        if rate_limited and attempt < 4:
                            wait = 2 ** attempt
                            logging.warning(
                                "CosmosDB rate limit (16500) on %s batch %d, retrying in %ds (attempt %d/5)",
                                blob.name, i // BATCH_SIZE, wait, attempt + 1,
                            )
                            time.sleep(wait)
                        else:
                            total_inserted += n
                            logging.warning(
                                "Partial insert for %s batch %d: %d inserted, errors: %s",
                                blob.name, i // BATCH_SIZE, n, errors[:3],
                            )
                            break
                time.sleep(0.2)

            files_processed.append(blob.name)
            logging.info("Processed %s: %d valid, running total=%d skipped=%d", blob.name, len(valid), total_inserted, total_skipped)

        return func.HttpResponse(
            json.dumps({
                "status": "ok",
                "files_processed": files_processed,
                "total_inserted": total_inserted,
                "total_skipped":  total_skipped,
            }),
            status_code=200,
            mimetype="application/json",
        )

    except Exception:
        logging.exception("blob_to_mongo failed")
        return func.HttpResponse(
            json.dumps({"status": "error", "detail": "Internal error — check function logs"}),
            status_code=500,
            mimetype="application/json",
        )



_SYSTEM_PROMPT = (
    "Jesteś asystentem przygotowania do egzaminu maklerskiego w Polsce. "
    "Na podstawie statystyk odpowiedzi użytkownika (poprawne/błędne wg tematów) "
    "zaproponuj konkretny, zwięzły plan nauki w języku polskim. "
    "Wyróżnij 3–5 najsłabszych obszarów, wyjaśnij dlaczego są ważne na egzaminie "
    "i podaj praktyczne wskazówki (np. jakie przepisy przeczytać, jakie obliczenia ćwiczyć). "
    "Zakończ krótkim słowem zachęty."
)


def _fetch_user_stats(google_id: str) -> dict:
    """Return per-topic answer stats for the given google_id, sorted weakest first."""
    db_url = os.environ["SQL_DATABASE_URL"]
    parsed = urlparse(db_url)

    if parsed.scheme.startswith("sqlite"):
        db_path = db_url.split("sqlite:///", 1)[-1]
        conn = sqlite3.connect(db_path)
        placeholder = "?"
    else:
        user     = unquote(parsed.username or "")
        password = unquote(parsed.password or "")
        host     = parsed.hostname or ""
        database = (parsed.path or "/master").lstrip("/") or "master"
        conn = pymssql.connect(server=host, user=user, password=password, database=database)
        placeholder = "%s"

    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT ar.domain, ar.section, ar.topic,
               COUNT(*)  AS total,
               SUM(CASE WHEN ar.is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM   answer_records ar
        JOIN   users u ON ar.user_id = u.id
        WHERE  u.google_id = {placeholder}
        GROUP  BY ar.domain, ar.section, ar.topic
        ORDER  BY (CAST(SUM(CASE WHEN ar.is_correct = 1 THEN 1 ELSE 0 END) AS FLOAT)
                   / NULLIF(COUNT(*), 0)) ASC
        """,
        (google_id,),
    )
    rows = cur.fetchall()
    conn.close()

    topics: list[dict] = []
    total_answered = 0
    total_correct  = 0

    for domain, section, topic, total, correct in rows:
        total_answered += total
        total_correct  += correct
        topics.append({
            "domain":       domain  or "Unknown",
            "section":      section or "Unknown",
            "topic":        topic   or "Unknown",
            "total":        total,
            "correct":      correct,
            "wrong":        total - correct,
            "accuracy_pct": round(correct / total * 100, 1) if total else 0.0,
        })

    return {
        "total_answered":      total_answered,
        "total_correct":       total_correct,
        "total_wrong":         total_answered - total_correct,
        "overall_accuracy_pct": round(total_correct / total_answered * 100, 1) if total_answered else 0.0,
        "topics": topics,
    }


def _build_user_message(stats: dict, name: Optional[str]) -> str:
    lines = [
        f"Użytkownik: {name or 'Student'}",
        f"Łącznie odpowiedzi: {stats['total_answered']} "
        f"(poprawnych: {stats['total_correct']}, błędnych: {stats['total_wrong']}, "
        f"skuteczność: {stats['overall_accuracy_pct']}%)",
        "",
        "Statystyki wg tematu (posortowane od najsłabszych):",
    ]
    for t in stats["topics"][:20]:
        lines.append(
            f"  • [{t['domain']} / {t['section']}] {t['topic']}: "
            f"{t['correct']}/{t['total']} ({t['accuracy_pct']}%)"
        )
    return "\n".join(lines)


def _call_openai_with_retry(user_message: str) -> str:
    client = AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version="2025-04-01-preview",
    )
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")

    for attempt in range(4):
        try:
            response = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_message},
                ],
                max_tokens=900,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as exc:
            if attempt == 3:
                raise
            wait = 2 ** attempt
            logging.warning(
                "OpenAI attempt %d failed (%s), retrying in %ds", attempt + 1, exc, wait
            )
            time.sleep(wait)


@app.route(route="learning_advisor", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def learning_advisor(req: func.HttpRequest) -> func.HttpResponse:
    """
    Return a personalised study plan for the given user.

    Request body (JSON):
      {
        "google_id": "<Google sub claim>",   // required
        "name":      "Jan Kowalski"          // optional, used in the prompt
      }

    Response body (JSON):
      {
        "status": "ok",
        "advice": "<LLM-generated study plan in Polish>",
        "stats":  { ... per-topic answer statistics ... }
      }
    """
    logging.info("learning_advisor triggered")

    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"status": "error", "detail": "Request body must be valid JSON"}),
            status_code=400,
            mimetype="application/json",
        )

    google_id = (body.get("google_id") or "").strip()
    if not google_id:
        return func.HttpResponse(
            json.dumps({"status": "error", "detail": "google_id is required"}),
            status_code=400,
            mimetype="application/json",
        )

    name: Optional[str] = body.get("name")

    try:
        stats = _fetch_user_stats(google_id)
    except Exception:
        logging.exception("Failed to fetch stats for google_id=%s", google_id)
        return func.HttpResponse(
            json.dumps({"status": "error", "detail": "Failed to retrieve user statistics"}),
            status_code=500,
            mimetype="application/json",
        )

    if stats["total_answered"] == 0:
        return func.HttpResponse(
            json.dumps({
                "status": "ok",
                "advice": (
                    "Nie masz jeszcze żadnych zapisanych odpowiedzi. "
                    "Zacznij rozwiązywać pytania egzaminacyjne, "
                    "a otrzymasz spersonalizowany plan nauki!"
                ),
                "stats": stats,
            }),
            status_code=200,
            mimetype="application/json",
        )

    user_message = _build_user_message(stats, name)

    try:
        advice = _call_openai_with_retry(user_message)
    except Exception:
        logging.exception("OpenAI call failed for google_id=%s", google_id)
        return func.HttpResponse(
            json.dumps({"status": "error", "detail": "Failed to generate study advice"}),
            status_code=500,
            mimetype="application/json",
        )

    return func.HttpResponse(
        json.dumps({"status": "ok", "advice": advice, "stats": stats}),
        status_code=200,
        mimetype="application/json",
    )
