from fastapi import FastAPI

from rag.vector_store import embedDocs

app = FastAPI(title="TalkPDF RAG API")


@app.get("/hi")
def hi() -> dict[str, str]:
    return {"message": "hi"}


@app.get("/embed")
def embed() -> dict[str, str]:
    count = embedDocs()
    return {"message": f"embedded {count} chunks"}
