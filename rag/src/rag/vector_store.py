import os

from dotenv import find_dotenv, load_dotenv
from langchain_postgres import PGVector
from sqlalchemy import text
from rag.embeddings import embeddings

from rag.load_docs import loadDocs

load_dotenv(find_dotenv(usecwd=True))

COLLECTION_NAME = "talkpdf"


def _connection_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url.replace("postgresql://", "postgresql+psycopg://", 1)


vector_store = PGVector(
    embeddings=embeddings,
    collection_name=COLLECTION_NAME,
    connection=_connection_url(),
    engine_args={
        "connect_args": {"prepare_threshold": None},
        "pool_pre_ping": True,
    },
)


def _delete_source(name: str) -> None:
    with vector_store.session_maker() as session:
        session.execute(
            text(
                "DELETE FROM langchain_pg_embedding "
                "WHERE collection_id = ("
                "SELECT uuid FROM langchain_pg_collection WHERE name = :collection"
                ") AND cmetadata->>'source' = :name"
            ),
            {"collection": COLLECTION_NAME, "name": name},
        )
        session.commit()


def embedDocs(doc_names=None) -> dict[str, int]:
    if doc_names is None:
        doc_names = ["sample.pdf"]
    counts = {}
    for name in doc_names:
        docs = loadDocs(name)
        for doc in docs:
            doc.metadata["source"] = name
        _delete_source(name)
        vector_store.add_documents(docs)
        counts[name] = len(docs)
    return counts
