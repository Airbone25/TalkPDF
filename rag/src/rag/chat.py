import os

from dotenv import find_dotenv, load_dotenv
from langchain.chat_models import init_chat_model

from rag.embeddings import embeddings
from rag.vector_store import vector_store

load_dotenv(find_dotenv(usecwd=True))

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

model = init_chat_model("groq:qwen/qwen3.8-27b", reasoning_format="parsed")

MAX_HISTORY_MESSAGES = 8

base_messages = [
    {"role": "system", "content": "You are a helpful assistant"},
]


def retrieve(query: str):
    embed = embeddings.embed_query(query)
    return vector_store.similarity_search_by_vector(embed, 10)


def chat(query: str) -> str:
    context = retrieve(query)
    convo = base_messages + [
        {
            "role": "system",
            "content": f"""
                        You are a helpful assistant. You will be given a context of relevant information and a user question.
                        Your task is to answer the user's question based ONLY on the provided context.
                        If the answer is not in the context, you must say "I could not find the answer in the provided document."
                        Keep your answers clear, concise, and educational.

                        Context: {context}
                        """,
        },
        {"role": "user", "content": query},
    ]
    response = model.invoke(convo)
    base_messages.append({"role": "user", "content": query})
    base_messages.append({"role": "assistant", "content": response.content})
    excess = len(base_messages) - 1 - MAX_HISTORY_MESSAGES
    if excess > 0:
        del base_messages[1 : 1 + excess]
    return response.content
