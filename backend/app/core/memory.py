import json
import numpy as np
import faiss
from sqlalchemy.orm import Session
from app.models.note import Note

_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def embed_text(text: str) -> list:
    return get_model().encode([text])[0].tolist()

def save_note(db: Session, client_name: str, content: str):
    embedding = embed_text(content)
    from app.models.note import Note
    note = Note(
        client_name=client_name,
        content=content,
        embedding=json.dumps(embedding)
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

def get_relevant_notes(db: Session, query: str, client_name: str = None, top_k: int = 3) -> list[str]:
    notes_query = db.query(Note)
    if client_name:
        notes_query = notes_query.filter(Note.client_name == client_name)
    notes = notes_query.all()

    if not notes:
        return []

    embeddings = []
    valid_notes = []
    for note in notes:
        if note.embedding:
            embeddings.append(json.loads(note.embedding))
            valid_notes.append(note)

    if not embeddings:
        return []

    dim = len(embeddings[0])
    index = faiss.IndexFlatL2(dim)
    vectors = np.array(embeddings, dtype="float32")
    index.add(vectors)

    query_vec = np.array([embed_text(query)], dtype="float32")
    _, indices = index.search(query_vec, min(top_k, len(valid_notes)))

    return [valid_notes[i].content for i in indices[0] if i < len(valid_notes)]