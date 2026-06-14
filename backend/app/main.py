from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.routes import tasks, notes
import app.models.note

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="VA Support Tool",
    description="Smart Task & Context Hub for Virtual Assistants",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(notes.router, prefix="/notes", tags=["Notes"])

@app.get("/")
def root():
    return {"message": "VA Support Tool is running"}