from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.models.task import Task
from app.core.ai import parse_task_from_text

router = APIRouter()

# --- Schemas ---

class NLPInput(BaseModel):
    text: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[int] = 3
    client_name: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    client_name: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: int
    client_name: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

# --- Routes ---

@router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.get("/", response_model=List[TaskResponse])
def list_tasks(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Task).filter(Task.is_deleted == False)
    if status:
        query = query.filter(Task.status == status)
    return query.all()

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, updates: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.is_deleted == False).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.is_deleted = True
    db.commit()
    return {"message": "Task deleted"}

@router.post("/parse", response_model=TaskResponse)
def parse_and_create_task(input: NLPInput, db: Session = Depends(get_db)):
    from app.core.memory import get_relevant_notes
    context_notes = get_relevant_notes(db, input.text)
    parsed = parse_task_from_text(input.text, context_notes)
    db_task = Task(**parsed)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task