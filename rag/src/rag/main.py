from fastapi import FastAPI

app = FastAPI(title="TalkPDF RAG API")


@app.get("/hi")
def hi() -> dict[str, str]:
    return {"message": "hi"}
