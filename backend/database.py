import aiosqlite
from config import DATABASE_PATH

async def get_db():
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
    finally:
        await db.close()

async def init_db():
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA journal_mode=WAL")
        await db.execute("PRAGMA foreign_keys=ON")

        await db.execute("""
            CREATE TABLE IF NOT EXISTS models (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                org TEXT NOT NULL,
                license TEXT NOT NULL CHECK(license IN ('open', 'prop')),
                color TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password_hash TEXT,
                display_name TEXT,
                auth_provider TEXT DEFAULT 'email',
                google_id TEXT UNIQUE,
                session_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                category TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_id INTEGER NOT NULL REFERENCES prompts(id),
                model_id TEXT NOT NULL REFERENCES models(id),
                content TEXT NOT NULL,
                turn_number INTEGER DEFAULT 1,
                parent_response_id INTEGER REFERENCES responses(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voter_id INTEGER REFERENCES users(id),
                session_id TEXT,
                mode TEXT NOT NULL CHECK(mode IN ('battle', 'sbs', 'direct')),
                prompt_text TEXT NOT NULL,
                prompt_id INTEGER REFERENCES prompts(id),
                model_a_id TEXT REFERENCES models(id),
                model_b_id TEXT REFERENCES models(id),
                response_a_id INTEGER REFERENCES responses(id),
                response_b_id INTEGER REFERENCES responses(id),
                choice TEXT NOT NULL,
                quality_tags TEXT,
                conversation_history TEXT,
                turn_number INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS elo_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id TEXT NOT NULL REFERENCES models(id),
                elo_rating REAL NOT NULL,
                ci_lower REAL,
                ci_upper REAL,
                win_rate REAL,
                total_votes INTEGER,
                computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.commit()
