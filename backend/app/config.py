"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration — values come from .env or environment."""

    # Database
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "arena"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "arena"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # HaiMaker
    HAIMAKER_API_URL: str = "https://api.haimaker.ai"
    HAIMAKER_API_KEY: str = ""

    # Direct API fallbacks
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Auth
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_DAYS: int = 30

    # CORS
    CORS_ORIGINS: str = ""  # Comma-separated origins, e.g. "https://vieteval.ai,http://localhost:5173"

    # Google OAuth
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""

    # Feature flags
    EVENT_MODE: bool = False
    ENABLE_STREAMING: bool = True
    ELO_MODE: str = "batch"  # "batch" or "realtime"

    # Rate limits
    RATE_LIMIT_VOTES_PER_HOUR: int = 100
    RATE_LIMIT_VOTES_PER_HOUR_EVENT: int = 200

    @property
    def mysql_dsn(self) -> str:
        return (
            f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
        )

    @property
    def effective_vote_rate_limit(self) -> int:
        return (
            self.RATE_LIMIT_VOTES_PER_HOUR_EVENT
            if self.EVENT_MODE
            else self.RATE_LIMIT_VOTES_PER_HOUR
        )

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
