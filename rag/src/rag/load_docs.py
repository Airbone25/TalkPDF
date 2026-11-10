import os
from pathlib import Path

from dotenv import find_dotenv, load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

dotenv_path = find_dotenv(usecwd=True)
load_dotenv(dotenv_path)

REPO_ROOT = Path(__file__).resolve().parents[3]
UPLOADS = os.getenv("UPLOAD_DIR") or "./uploads"


def loadDocs(doc_name):
    uploads_dir = Path(UPLOADS) if Path(UPLOADS).is_absolute() else REPO_ROOT / UPLOADS
    reader = PyPDFLoader(str(uploads_dir / doc_name))
    docs = reader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    return text_splitter.split_documents(docs)
