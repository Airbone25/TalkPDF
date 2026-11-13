from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from rag.chat import chat

from rag.load_docs import saveUpload
from rag.vector_store import embedDocs

app = FastAPI(title="TalkPDF RAG API")


@app.get("/hi")
def hi() -> dict[str, str]:
    return {"message": "hi"}


class ChatRequest(BaseModel):
    query: str


@app.post("/chat")
def chat_endpoint(request: ChatRequest) -> dict[str, str]:
    try:
        return {"answer": chat(request.query)}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/upload")
async def upload(files: list[UploadFile] = File(...)) -> dict[str, Any]:
    names = []
    for file in files:
        try:
            names.append(saveUpload(await file.read(), file.filename or ""))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    counts = embedDocs(names)
    return {
        "files": [{"name": name, "chunks": counts[name]} for name in names],
        "total_chunks": sum(counts.values()),
    }
