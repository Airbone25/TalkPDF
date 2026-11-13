from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

embeddings = FastEmbedEmbeddings(model_name=EMBEDDING_MODEL, batch_size=16, threads=1)
