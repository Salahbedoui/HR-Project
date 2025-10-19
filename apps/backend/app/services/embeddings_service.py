from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

# Initialize Chroma client (persistent local store)
chroma_client = chromadb.PersistentClient(path="chroma_data")

# Initialize the model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Get or create the collection
collection = chroma_client.get_or_create_collection(name="resumes")

def add_resume_to_vector_db(resume_id: int, text_content: str):
    """Store resume embeddings persistently"""
    embedding = model.encode(text_content)
    collection.add(
        ids=[str(resume_id)],
        embeddings=[embedding.tolist()],
        documents=[text_content]
    )
    print(f"✅ Resume {resume_id} embedded and saved in ChromaDB.")
    return {"message": f"Resume {resume_id} embedded successfully"}

def query_similar_resumes(query_text: str, top_k: int = 3):
    """Retrieve similar resumes"""
    query_embedding = model.encode(query_text)
    results = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=top_k
    )
    return results
