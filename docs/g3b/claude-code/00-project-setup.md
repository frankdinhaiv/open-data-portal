# ViGen Arena — Spec 00: Project Setup

**Project:** ViGen Arena (Vietnamese GenAI Human Evaluation Platform)
**Version:** G3B (Design & Implementation Phase)
**Last Updated:** 2026-03-12
**Status:** Ready for Claude Code Implementation

---

## Overview

This spec defines the complete project structure, environment setup, Docker configuration, dependencies, and development workflow for ViGen Arena. It is **implementation-ready** — Claude Code should execute this spec to bootstrap a fresh project without ambiguity.

**Key principle:** This is a **fresh build** — do NOT reuse any existing vigen-arena codebase. Start from scratch.

---

## 1. Complete Project File Tree

```
vigen-arena/
├── docker-compose.yml                 # Orchestrate frontend, backend, mysql
├── .env.example                       # Template for all env vars
├── .gitignore
├── README.md                          # Project overview and quick start
├── package.json                       # Root workspace (for shared scripts)
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # React entry point
│   │   ├── App.tsx                    # Root app component
│   │   ├── index.css                  # Global Tailwind styles
│   │   ├── api/
│   │   │   ├── client.ts              # Axios instance with auth headers
│   │   │   ├── endpoints.ts           # API endpoint constants
│   │   │   ├── battleApi.ts           # Battle endpoints (GET /battles, POST /battles/:id/response)
│   │   │   ├── leaderboardApi.ts      # Leaderboard endpoints (GET /leaderboard)
│   │   │   ├── authApi.ts             # Auth endpoints (login, logout, profile)
│   │   │   └── historyApi.ts          # User history endpoints (GET /history)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx         # Top nav with logo, user profile, logout
│   │   │   │   ├── Sidebar.tsx        # Left nav (Arena, Leaderboard, History, Settings)
│   │   │   │   └── Footer.tsx         # Footer with links
│   │   │   ├── arena/
│   │   │   │   ├── BattleContainer.tsx    # Main battle orchestrator
│   │   │   │   ├── SideBySide.tsx        # Side-by-side view (Responses A vs B)
│   │   │   │   ├── Direct.tsx           # Direct mode (single response, ask follow-up)
│   │   │   │   ├── Vote.tsx             # Vote button group (Prefer A, Prefer B, Tie)
│   │   │   │   ├── ResponseCard.tsx     # Individual response display
│   │   │   │   └── BattleMetadata.tsx   # Model names, prompt, metadata
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx      # Email/password + Google OAuth
│   │   │   │   ├── ProfileDropdown.tsx # User profile menu
│   │   │   │   └── ProtectedRoute.tsx  # Route guard for auth
│   │   │   ├── leaderboard/
│   │   │   │   ├── LeaderboardTable.tsx  # Elo rankings table
│   │   │   │   ├── LeaderboardFilters.tsx # Filter by region, category
│   │   │   │   └── LeaderboardChart.tsx   # Elo progression chart
│   │   │   ├── shared/
│   │   │   │   ├── Modal.tsx          # Generic modal wrapper
│   │   │   │   ├── Toast.tsx          # Toast notifications
│   │   │   │   ├── Spinner.tsx        # Loading spinner
│   │   │   │   ├── Badge.tsx          # Status badges (voted, pending)
│   │   │   │   └── Button.tsx         # Custom button (extends shadcn)
│   │   ├── hooks/
│   │   │   ├── useStore.ts            # Zustand store (battles, votes, ui state)
│   │   │   ├── useAuth.ts             # Auth context hook
│   │   │   ├── useArena.ts            # Battle loading and vote submission
│   │   │   ├── useLeaderboard.ts      # Leaderboard fetching
│   │   │   └── useLocalStorage.ts     # Persist UI preferences
│   │   ├── pages/
│   │   │   ├── ArenaPage.tsx          # /arena — main battle UI
│   │   │   ├── LeaderboardPage.tsx    # /leaderboard — rankings
│   │   │   ├── HistoryPage.tsx        # /history — user vote history
│   │   │   ├── LoginPage.tsx          # /login — auth
│   │   │   ├── SettingsPage.tsx       # /settings — user preferences
│   │   │   └── NotFoundPage.tsx       # 404
│   │   ├── types/
│   │   │   ├── api.ts                 # API response/request types
│   │   │   ├── arena.ts               # Battle, Response, Vote types
│   │   │   ├── auth.ts                # User, Token types
│   │   │   ├── leaderboard.ts         # Elo, Ranking types
│   │   │   └── ui.ts                  # UI state types
│   │   ├── lib/
│   │   │   ├── utils.ts               # Tailwind cn(), formatElo(), etc.
│   │   │   ├── constants.ts           # Magic numbers (vote timeout, etc.)
│   │   │   └── routes.ts              # Route definitions
│   │   └── store/
│   │       ├── useArenaStore.ts       # Zustand: battles, current battle
│   │       ├── useAuthStore.ts        # Zustand: user, token, login state
│   │       ├── useUIStore.ts          # Zustand: theme, sidebar open, notifications
│   │       └── index.ts               # Export all stores
│   ├── public/
│   │   ├── vigen-logo.png             # Logo
│   │   ├── favicon.ico
│   │   └── manifest.json              # PWA manifest
│   ├── tests/
│   │   ├── setup.ts                   # Jest configuration
│   │   ├── components/
│   │   │   ├── BattleContainer.test.tsx
│   │   │   ├── Vote.test.tsx
│   │   │   └── LoginForm.test.tsx
│   │   ├── hooks/
│   │   │   ├── useStore.test.ts
│   │   │   └── useAuth.test.ts
│   │   └── api/
│   │       └── client.test.ts
│   ├── package.json                   # Frontend deps
│   ├── package-lock.json
│   ├── tsconfig.json                  # TypeScript config
│   ├── vite.config.ts                 # Vite + proxy setup
│   ├── tailwind.config.ts             # Tailwind theme (light, blue accent)
│   ├── postcss.config.js              # PostCSS for Tailwind
│   ├── jest.config.ts                 # Jest config
│   ├── Dockerfile                     # Multi-stage build for production
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── config.py                  # Config from env vars
│   │   ├── database.py                # SQLAlchemy setup, session factory
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                # User model
│   │   │   ├── battle.py              # Battle, Response models
│   │   │   ├── vote.py                # Vote model
│   │   │   └── elo.py                 # EloRating model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                # UserCreate, UserResponse Pydantic
│   │   │   ├── battle.py              # BattleResponse, ResponseSchema
│   │   │   ├── vote.py                # VoteCreate, VoteResponse
│   │   │   └── leaderboard.py         # LeaderboardEntry
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # POST /auth/login, /auth/logout, /auth/profile
│   │   │   ├── battles.py             # GET /battles/:id, POST /battles/:id/response
│   │   │   ├── leaderboard.py         # GET /leaderboard, /leaderboard/:model_id
│   │   │   ├── history.py             # GET /history (user vote history)
│   │   │   └── health.py              # GET /health
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py        # Token validation, mock token for dev
│   │   │   ├── battle_service.py      # Battle fetching, response matching
│   │   │   ├── elo_service.py         # Elo calculation (not batch job)
│   │   │   ├── vote_service.py        # Vote recording and elo update
│   │   │   └── leaderboard_service.py # Leaderboard ranking
│   │   ├── jobs/
│   │   │   ├── __init__.py
│   │   │   └── elo_batch.py           # Cron job stub (to be filled in spec 08)
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # JWT verification middleware
│   │   │   └── error.py               # Global exception handler
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── jwt_helper.py          # Token encode/decode (mock for dev)
│   │       ├── time_utils.py          # UTC conversions
│   │       └── logger.py              # Structured logging
│   ├── alembic/
│   │   ├── env.py                     # Alembic environment config
│   │   ├── script.py.mako             # Migration template
│   │   ├── versions/                  # (empty initially, populated in spec 01)
│   │   │   └── .gitkeep
│   │   └── alembic.ini                # Alembic config
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                # Pytest fixtures (db, client, user)
│   │   ├── test_auth.py               # Auth endpoint tests
│   │   ├── test_battles.py            # Battle endpoint tests
│   │   ├── test_votes.py              # Vote submission tests
│   │   └── test_elo.py                # Elo calculation tests
│   ├── Dockerfile                     # Python FastAPI image
│   ├── requirements.txt               # All Python dependencies
│   ├── .env.example
│   └── pytest.ini                     # Pytest config
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # GitHub Actions: run tests, build Docker
│       └── deploy.yml                 # GitHub Actions: deploy to EC2
│
└── docs/
    ├── API.md                         # API documentation (generated)
    ├── ARCHITECTURE.md                # System design overview
    ├── DEPLOYMENT.md                  # Docker, EC2, Cloudflare setup
    └── CONTRIBUTING.md                # Dev guidelines
```

---

## 2. Environment Variables (.env.example)

### Frontend (.env.example)

```env
# Frontend Environment Variables
# Copy to .env.local for local development

# API
VITE_API_URL=http://localhost:8000
VITE_API_TIMEOUT=30000

# Auth
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>
VITE_JWT_STORAGE_KEY=vigen_arena_token

# Feature Flags
VITE_ENABLE_DIRECT_MODE=true
VITE_ENABLE_LEADERBOARD=true
VITE_ENABLE_HISTORY=true

# Monitoring (optional)
VITE_DATADOG_APP_ID=<datadog-app-id>
VITE_DATADOG_CLIENT_TOKEN=<datadog-client-token>

# Analytics
VITE_ANALYTICS_ENABLED=false
```

### Backend (.env.example)

```env
# Backend Environment Variables
# Copy to .env for local development

# Server
FASTAPI_ENV=development
FASTAPI_DEBUG=true
FASTAPI_PORT=8000
FASTAPI_HOST=0.0.0.0

# Database (MySQL on AWS EC2)
DATABASE_URL=mysql+aiomysql://root:password@mysql:3306/vigen_arena
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=vigen_arena
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40

# Auth
JWT_SECRET_KEY=<generate-secure-random-key>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
MOCK_AUTH_ENABLED=true
MOCK_AUTH_USER_ID=test-user-123

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:8000,https://vigen-arena.com
CORS_ALLOW_CREDENTIALS=true

# Elo Configuration
ELO_K_FACTOR=32
ELO_DRAW_RATIO=0.5
ELO_INITIAL_RATING=1500

# External Services
GOOGLE_OAUTH_CLIENT_ID=<google-oauth-client-id>
GOOGLE_OAUTH_SECRET=<google-oauth-secret>

# Monitoring
DATADOG_API_KEY=<datadog-api-key>
DATADOG_ENABLED=false

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Deployment
CLOUDFLARE_DOMAIN=vigen-arena.com
ENVIRONMENT=development
```

---

## 3. Docker Setup

### docker-compose.yml

```yaml
version: '3.9'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: vigen-arena-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-password}
      MYSQL_DATABASE: ${DB_NAME:-vigen_arena}
      MYSQL_USER: ${DB_USER:-root}
      MYSQL_PASSWORD: ${DB_PASSWORD:-password}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
      interval: 5s
    networks:
      - vigen-arena

  # FastAPI Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: vigen-arena-backend
    environment:
      - DATABASE_URL=mysql+aiomysql://${DB_USER:-root}:${DB_PASSWORD:-password}@mysql:3306/${DB_NAME:-vigen_arena}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY:-changeme}
      - FASTAPI_ENV=${FASTAPI_ENV:-development}
      - MOCK_AUTH_ENABLED=${MOCK_AUTH_ENABLED:-true}
      - CORS_ORIGINS=http://localhost:5173,http://localhost:8000,http://frontend:3000
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    ports:
      - "${FASTAPI_PORT:-8000}:8000"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./backend:/app
    networks:
      - vigen-arena
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # React Frontend (Development)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
      target: development
    container_name: vigen-arena-frontend
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    networks:
      - vigen-arena
    command: npm run dev -- --host 0.0.0.0

volumes:
  mysql_data:
    driver: local

networks:
  vigen-arena:
    driver: bridge
```

### frontend/Dockerfile (Multi-stage for Production)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve (Production)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config for SPA routing
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### frontend/Dockerfile.dev (Development)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### backend/Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
  gcc \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 4. Package Dependencies

### frontend/package.json

```json
{
  "name": "vigen-arena-frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-slot": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "lucide-react": "^0.294.0",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0",
    "react-router-dom": "^6.20.0",
    "js-cookie": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    "@types/jest": "^29.5.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tailwindcss/typography": "^0.5.0",
    "eslint": "^8.55.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.1.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### backend/requirements.txt

```txt
# FastAPI & ASGI
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0

# Database
sqlalchemy==2.0.23
aiomysql==0.2.0
alembic==1.13.0
sqlalchemy-utils==0.41.1

# Auth & Security
pyjwt==2.8.1
bcrypt==4.1.1
python-multipart==0.0.6
passlib==1.7.4

# HTTP & External APIs
httpx==0.25.1
aiohttp==3.9.1

# Monitoring & Logging
python-json-logger==2.0.7

# Development & Testing
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
python-dotenv==1.0.0
black==23.12.0
flake8==6.1.0
isort==5.13.2

# Utilities
python-dateutil==2.8.2
pytz==2023.3
```

---

## 5. Configuration Files

### frontend/vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand', 'axios'],
          ui: ['@radix-ui/react-dialog', 'lucide-react'],
        },
      },
    },
  },
})
```

### frontend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### frontend/tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      backgroundColor: {
        base: '#ffffff',
        secondary: '#f9fafb',
      },
      textColor: {
        base: '#111827',
        secondary: '#6b7280',
      },
    },
  },
  plugins: [],
} satisfies Config
```

### frontend/postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### frontend/jest.config.ts

```typescript
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
  ],
}

export default config
```

### frontend/src/tests/setup.ts

```typescript
import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any
```

### backend/alembic.ini

```ini
# Alembic Configuration File
# https://alembic.sqlalchemy.org/

[alembic]
sqlalchemy.url =

# Define defaults for migration template
file_template = %%(rev)s_%%(slug)s

python_files = *.py

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

### backend/pytest.ini

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts =
  --strict-markers
  --tb=short
  --disable-warnings
markers =
  integration: marks tests as integration tests (deselect with '-m "not integration"')
  slow: marks tests as slow (deselect with '-m "not slow"')
```

---

## 6. Build Order & Implementation Sequence

Implement specs in this exact order. Each spec builds on the previous one.

| # | Spec Name | Dependencies | Key Deliverable |
|---|-----------|--------------|-----------------|
| 00 | **Project Setup** (this) | None | File structure, Docker, env vars, configs |
| 01 | **Data Model & Migrations** | Spec 00 | SQLAlchemy models, Alembic migrations |
| 02 | **Authentication** | Spec 00, 01 | JWT middleware, login/logout, profile endpoints |
| 03 | **Core Layout & Navigation** | Spec 02 | Header, sidebar, routing, protected routes |
| 04 | **Battle Page & Arena Layout** | Spec 03 | Battle container, response cards, metadata display |
| 05 | **Side-by-Side View** | Spec 04 | Compare two responses A vs B |
| 06 | **Direct Mode** | Spec 04 | Single response display, follow-up questions |
| 07 | **Vote Submission & UI** | Spec 05, 06, Backend votes router | Vote buttons, submission flow, optimistic updates |
| 08 | **Elo System & Batch Jobs** | Spec 01, 07, Backend elo service | Elo calculations, ranking updates |
| 09 | **Leaderboard** | Spec 08 | Rankings table, filters, chart view |
| 10 | **Response Serving Strategy** | Spec 04, Backend battle service | Battle queue logic, response matching, fairness |
| 11 | **User Vote History** | Spec 09, Backend history router | User's past votes, filters, pagination |

**Critical path:** Specs 00 → 01 → 02 → 03 → 04 must be complete before parallelizing 05 & 06.

---

## 7. Development Workflow

### Initial Project Setup

```bash
# 1. Clone repo (or initialize fresh)
git clone <repo> vigen-arena
cd vigen-arena

# 2. Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Edit .env files with your credentials
# - DATABASE credentials
# - JWT_SECRET_KEY (generate: openssl rand -hex 32)
# - GOOGLE_OAUTH_CLIENT_ID

# 4. Start Docker services
docker-compose up -d

# 5. Wait for MySQL to be healthy
docker-compose logs -f mysql

# 6. Run database migrations (after spec 01)
docker exec vigen-arena-backend alembic upgrade head

# 7. Seed database (after spec 01)
docker exec vigen-arena-backend python -m app.seed.seed_data

# 8. Verify services
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### Local Development

```bash
# Terminal 1: Frontend dev server
cd frontend
npm install
npm run dev

# Terminal 2: Backend dev server
cd backend
python -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: MySQL CLI (optional, for debugging)
docker exec -it vigen-arena-mysql mysql -uroot -ppassword vigen_arena
```

### Running Tests

```bash
# Frontend unit tests
cd frontend
npm test

# Frontend with coverage
npm run test:coverage

# Backend unit tests
cd backend
pytest

# Backend with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v

# Run tests matching a pattern
pytest -k "test_vote" -v
```

### Database Migrations

```bash
# Generate new migration (after model changes)
cd backend
alembic revision --autogenerate -m "Add user table"

# Review generated migration in alembic/versions/
# Edit manually if needed

# Apply migrations to local DB
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

### Code Formatting & Linting

```bash
# Frontend
cd frontend
npm run lint
npm run format

# Backend
cd backend
black app/
isort app/
flake8 app/
```

### Local API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Swagger docs
open http://localhost:8000/docs

# Login (mock auth enabled)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get current battle
curl http://localhost:8000/battles/next \
  -H "Authorization: Bearer <token>"

# Submit vote
curl -X POST http://localhost:8000/battles/battle-123/response \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"response_id":"resp-456","winner_id":"model-A","vote_type":"side_by_side"}'
```

### Docker Management

```bash
# View logs
docker-compose logs backend      # Backend logs
docker-compose logs frontend     # Frontend logs
docker-compose logs mysql        # MySQL logs
docker-compose logs -f           # Follow all logs

# Stop services
docker-compose down

# Rebuild images (after dependency changes)
docker-compose up --build

# Remove volumes (reset database)
docker-compose down -v

# Access backend container shell
docker exec -it vigen-arena-backend bash

# Access MySQL CLI
docker exec -it vigen-arena-mysql mysql -uroot -ppassword vigen_arena
```

### Mock Authentication (Local Dev)

For local development, auth is simplified:

1. **Environment:** Set `MOCK_AUTH_ENABLED=true` in backend/.env
2. **Mock user:** Backend creates a test user with `MOCK_AUTH_USER_ID=test-user-123`
3. **Token generation:** POST to `/auth/login` returns a mock JWT
4. **Frontend:** Store token in localStorage and send as `Authorization: Bearer <token>` header

This allows testing the full flow without actual Google OAuth setup.

---

## 8. Production Deployment Setup

### Docker Build for Production

```bash
# Build multi-stage frontend image
docker build -f frontend/Dockerfile -t vigen-arena-frontend:latest frontend/

# Build backend image
docker build -f backend/Dockerfile -t vigen-arena-backend:latest backend/

# Push to registry (e.g., ECR, DockerHub)
docker tag vigen-arena-frontend:latest <registry>/vigen-arena-frontend:latest
docker push <registry>/vigen-arena-frontend:latest
```

### Cloudflare CDN Configuration

- Set up CNAME for `vigen-arena.com` → EC2 instance
- Enable HTTP/3 (QUIC)
- Cache static assets (JS, CSS, images) with 30-day TTL
- Set browser cache TTL to 4 hours for HTML

### EC2 Deployment

```bash
# On EC2 instance:
cd /opt/vigen-arena

# Pull latest images from registry
docker pull <registry>/vigen-arena-frontend:latest
docker pull <registry>/vigen-arena-backend:latest

# Start services with production env
docker-compose -f docker-compose.prod.yml up -d

# Verify health
curl http://localhost:8000/health
```

---

## 9. Key Implementation Notes

### Frontend Architecture
- **State:** Zustand stores (auth, arena, ui) — not Redux
- **UI:** Shadcn/ui components + custom Tailwind overrides
- **Icons:** Lucide React (no emoji in nav)
- **Language:** All hardcoded Vietnamese strings (no i18n framework)
- **HTTP:** Axios with custom interceptors for auth headers
- **Routing:** React Router v6 with ProtectedRoute wrapper

### Backend Architecture
- **Framework:** FastAPI with async/await
- **DB:** SQLAlchemy ORM with MySQL on AWS EC2
- **Auth:** JWT tokens (HS256), mock tokens for local dev
- **Error handling:** Global exception handler middleware with structured logging
- **Concurrency:** asyncio for non-blocking I/O
- **Database connection:** Connection pool (aiomysql) with min/max limits

### Key Constraints
- **No external AI calls:** Battles and responses are pre-populated in the database
- **No user-generated prompts:** System only serves pre-defined battles
- **Regional support:** Multi-region support (Vietnam, global) — metadata stored in battles table
- **Language:** All UI in Vietnamese, responses can be any language

---

## 10. Quality Gates

Before moving to the next spec, verify:

- [ ] All files exist in correct directory structure
- [ ] Docker services start without errors (`docker-compose up`)
- [ ] MySQL is healthy and accepts connections
- [ ] Frontend builds without TypeScript errors
- [ ] Backend starts with no import errors
- [ ] API docs available at `http://localhost:8000/docs`
- [ ] Environment files are correctly configured
- [ ] Mock auth works: `curl POST /auth/login` returns a token
- [ ] Tests run without errors (Jest and Pytest)

---

## 11. References

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **SQLAlchemy:** https://docs.sqlalchemy.org
- **Vite:** https://vitejs.dev
- **React 19:** https://react.dev
- **Tailwind CSS 4:** https://tailwindcss.com
- **Zustand:** https://github.com/pmndrs/zustand
- **Shadcn/ui:** https://ui.shadcn.com
- **Docker Compose:** https://docs.docker.com/compose

---

**Status:** ✅ Ready for Claude Code Implementation
**Last Updated:** 2026-03-12
**Next Step:** Implement Spec 01 (Data Model & Migrations)
