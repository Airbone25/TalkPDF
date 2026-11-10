import os

from dotenv import find_dotenv, load_dotenv
from langchain_postgres import PGVector
from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

from rag.load_docs import loadDocs

load_dotenv(find_dotenv(usecwd=True))

def _connection_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url.replace("postgresql://", "postgresql+psycopg://", 1)


vector_store = PGVector(
    embeddings=embeddings,
    collection_name="talkpdf",
    connection=_connection_url(),
    engine_args={
        "connect_args": {"prepare_threshold": None},
        "pool_pre_ping": True,
    },
)


def embedDocs() -> int:
    docs = loadDocs("sample.pdf")
    vector_store.add_documents(docs)
    return len(docs)
