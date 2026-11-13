import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

dotenv_path = find_dotenv(usecwd=True)
load_dotenv(dotenv_path)

REPO_ROOT = Path(__file__).resolve().parents[3]
DOTENV_DIR = Path(os.path.dirname(dotenv_path)) if dotenv_path else Path.cwd()
UPLOADS = os.getenv("UPLOAD_DIR") or "./uploads"


def _upload_path(doc_name: str) -> Path:
    uploads = Path(UPLOADS)
    if uploads.is_absolute():
        return uploads / doc_name
    for base in (DOTENV_DIR, REPO_ROOT, Path.cwd()):
        resolved = (base / uploads).resolve()
        if (resolved / doc_name).is_file():
            return resolved / doc_name
    return (DOTENV_DIR / uploads).resolve() / doc_name


def saveUpload(data: bytes, filename: str) -> str:
    name = Path(filename).name
    if not name:
        raise ValueError("file has no name")
    if not name.lower().endswith(".pdf"):
        raise ValueError("only PDF files are supported")
    target = _upload_path(name)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return name


def loadDocs(doc_name):
    reader = PyPDFLoader(str(_upload_path(doc_name)))
    docs = reader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return text_splitter.split_documents(docs)
