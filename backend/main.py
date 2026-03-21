from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from seed import seed
from routers import auth, arena, leaderboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed()
    yield


app = FastAPI(
    title="ViGen Arena API",
    description="Vietnamese GenAI Human Evaluation Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(arena.router)
app.include_router(leaderboard.router)


@app.get("/")
async def root():
    return {"message": "ViGen Arena API", "version": "0.1.0", "docs": "/docs"}
