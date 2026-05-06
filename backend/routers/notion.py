from fastapi import APIRouter, HTTPException, Depends
from .auth import get_current_user
import random
import httpx
from pymongo import MongoClient
from typing import Optional

router = APIRouter()


@router.get("/{page_id}")
async def get_notion_page(page_id: str,
                          current_user: dict = Depends(get_current_user)):
    """
    Proxy endpoint to fetch a Notion page JSON (recordMap).
    Example: /notion/248cf5e9d029808eb124f2913f1dc259
    """
    url = f"https://notion-api.splitbee.io/v1/page/{page_id}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=15.0)
            response.raise_for_status()
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Error connecting to Notion API: {str(e)}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=response.status_code, detail=f"Notion API error: {str(e)}")

    return response.json()