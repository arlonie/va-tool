from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.core.memory import save_note, get_relevant_notes

router = APIRouter()

class NoteCreate(BaseModel):
    client_name: str
    content: str

class NoteResponse(BaseModel):
    id: int
    client_name: str
    content: str

    class Config:
        from_attributes = True

class SearchQuery(BaseModel):
    query: str
    client_name: Optional[str] = None

@router.post("/", response_model=NoteResponse)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    return save_note(db, note.client_name, note.content)

@router.post("/search")
def search_notes(query: SearchQuery, db: Session = Depends(get_db)):
    results = get_relevant_notes(db, query.query, query.client_name)
    return {"results": results}