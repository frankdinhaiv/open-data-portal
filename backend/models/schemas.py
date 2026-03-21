from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModelOut(BaseModel):
    id: str
    name: str
    org: str
    license: str
    color: str


class PromptOut(BaseModel):
    id: int
    text: str
    category: str


class ResponseOut(BaseModel):
    id: int
    prompt_id: int
    model_id: str
    content: str
    turn_number: int


class PairOut(BaseModel):
    prompt: PromptOut
    response_a: ResponseOut
    response_b: ResponseOut
    model_a: ModelOut
    model_b: ModelOut


class VoteCreate(BaseModel):
    mode: str
    prompt_text: str
    prompt_id: Optional[int] = None
    model_a_id: str
    model_b_id: Optional[str] = None
    response_a_id: Optional[int] = None
    response_b_id: Optional[int] = None
    choice: str
    quality_tags: Optional[str] = None
    conversation_history: Optional[str] = None
    turn_number: int = 1


class VoteOut(BaseModel):
    id: int
    mode: str
    prompt_text: str
    choice: str
    model_a_id: str
    model_b_id: Optional[str] = None
    created_at: str


class AuthRegister(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class AuthLogin(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: int
    email: str
    display_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None


class LeaderboardEntry(BaseModel):
    rank: int
    model_id: str
    name: str
    org: str
    license: str
    color: str
    elo_rating: float
    ci: float
    win_rate: float
    total_votes: int


class EloReveal(BaseModel):
    model_a_name: str
    model_a_org: str
    model_a_elo: float
    model_a_delta: float
    model_b_name: str
    model_b_org: str
    model_b_elo: float
    model_b_delta: float
