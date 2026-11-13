import os

from dotenv import find_dotenv, load_dotenv
from langchain.chat_models import init_chat_model

from rag.embeddings import embeddings
from rag.vector_store import vector_store

load_dotenv(find_dotenv(usecwd=True))

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

model = init_chat_model("groq:qwen/qwen3.8-27b", reasoning_format="parsed")

SYSTEM_PROMPT = "You are a helpful assistant"

RAG_PROMPT_TEMPLATE = """
                        You are a helpful assistant. You will be given a context of relevant information and a user question.
                        Your task is to answer the user's question based ONLY on the provided context.
                        If the answer is not in the context, you must say "I could not find the answer in the provided document."
                        Keep your answers clear, concise, and educational.

                        Context: {context}
                        """


def _source_filter(sources):
    if sources is None:
        return None
    if not sources:
        return {"source": {"$in": ["__none__"]}}
    return {"source": {"$in": list(sources)}}


def _retrieve(query: str, sources=None) -> str:
    embed = embeddings.embed_query(query)
    context = vector_store.similarity_search_by_vector(
        embed, 10, filter=_source_filter(sources)
    )
    return str(context)


def _convo(query: str, history, sources=None) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for entry in history or []:
        role = entry.get("role")
        content = entry.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append(
        {
            "role": "system",
            "content": RAG_PROMPT_TEMPLATE.format(context=_retrieve(query, sources)),
        }
    )
    messages.append({"role": "user", "content": query})
    return messages


def _delta(chunk) -> str:
    delta = chunk.content or ""
    if isinstance(delta, list):
        delta = "".join(
            part.get("text", "") for part in delta if isinstance(part, dict)
        )
    return delta


def chat_stream(query: str, history=None, sources=None):
    for chunk in model.stream(_convo(query, history, sources)):
        delta = _delta(chunk)
        if delta:
            yield delta


def chat(query: str, history=None, sources=None) -> str:
    response = model.invoke(_convo(query, history, sources))
    return response.content
