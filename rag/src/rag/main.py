import json
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from rag.chat import chat_stream
from rag.load_docs import saveUpload
from rag.vector_store import embedDocs

app = FastAPI(title="TalkPDF RAG API")


@app.get("/hi")
def hi() -> dict[str, str]:
    return {"message": "hi"}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    history: list[ChatMessage] = Field(default_factory=list)
    sources: Optional[list[str]] = None


@app.post("/chat")
def chat_endpoint(request: ChatRequest) -> StreamingResponse:
    def event_stream():
        try:
            history = [m.model_dump() for m in request.history]
            for delta in chat_stream(request.query, history, request.sources):
                yield f"data: {json.dumps({'token': delta})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/upload")
async def upload(
    files: list[UploadFile] = File(...),
    doc_key: str = Form(""),
) -> dict[str, Any]:
    names = []
    for file in files:
        try:
            names.append(saveUpload(await file.read(), file.filename or ""))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    counts = embedDocs(names, source_key=doc_key or None)
    return {
        "files": [{"name": name, "chunks": counts[name]} for name in names],
        "total_chunks": sum(counts.values()),
    }
