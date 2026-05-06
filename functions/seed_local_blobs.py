"""
Seed the local Azurite blob emulator with the scrapper JSON files.

Works both locally (AZURITE_HOST defaults to 127.0.0.1) and as the
blob-seeder Docker Compose service (AZURITE_HOST=azurite).

Run locally after `docker compose up azurite -d`:
    python functions/seed_local_blobs.py
"""

import os
from azure.storage.blob import BlobServiceClient
from pathlib import Path

AZURITE_HOST = os.environ.get("AZURITE_HOST", "127.0.0.1")
AZURITE_KEY  = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=="
AZURITE_CONN = (
    f"DefaultEndpointsProtocol=http;"
    f"AccountName=devstoreaccount1;"
    f"AccountKey={AZURITE_KEY};"
    f"BlobEndpoint=http://{AZURITE_HOST}:10000/devstoreaccount1;"
)
CONTAINER = "exam-data"

_script_dir = Path(__file__).resolve().parent
_local_data  = _script_dir.parent / "scrapper" / "data"
DATA_DIR = Path("/data") if Path("/data").is_dir() else _local_data

client = BlobServiceClient.from_connection_string(AZURITE_CONN)

try:
    client.create_container(CONTAINER)
    print(f"Created container: {CONTAINER}")
except Exception:
    print(f"Container already exists: {CONTAINER}")

container_client = client.get_container_client(CONTAINER)

uploaded = 0
for path in sorted(DATA_DIR.glob("*.json")):
    with open(path, "rb") as f:
        container_client.upload_blob(path.name, f, overwrite=True)
    print(f"  Uploaded {path.name}")
    uploaded += 1

print(f"\nDone — {uploaded} files uploaded to {CONTAINER}.")
