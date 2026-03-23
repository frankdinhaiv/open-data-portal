-- Arena database schema
-- Auto-loaded by docker-compose on first run

CREATE TABLE IF NOT EXISTS models (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    elo_rating DOUBLE DEFAULT 1000.0,
    total_battles INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth_method VARCHAR(20) DEFAULT 'email',
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'knowledge',
    subcategory VARCHAR(50),
    source VARCHAR(20) DEFAULT 'seed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    mode ENUM('battle', 'sbs', 'direct') NOT NULL,
    prompt_id INT,
    model_a_id VARCHAR(100),
    model_b_id VARCHAR(100),
    model_id VARCHAR(100),
    guest_session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_guest (guest_session_id)
);

CREATE TABLE IF NOT EXISTS turns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    turn_number INT NOT NULL DEFAULT 1,
    user_prompt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    UNIQUE KEY uniq_conv_turn (conversation_id, turn_number)
);

CREATE TABLE IF NOT EXISTS responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    turn_number INT NOT NULL DEFAULT 1,
    model_id VARCHAR(100) NOT NULL,
    position ENUM('a', 'b', 'single') NOT NULL,
    content TEXT NOT NULL,
    token_count INT,
    latency_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    INDEX idx_conv_turn (conversation_id, turn_number)
);

CREATE TABLE IF NOT EXISTS votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    turn_number INT NOT NULL DEFAULT 1,
    user_id VARCHAR(100),
    model_a_id VARCHAR(100) NOT NULL,
    model_b_id VARCHAR(100),
    choice ENUM('model_a', 'model_b', 'tie', 'both_bad') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    UNIQUE KEY uniq_vote (conversation_id, turn_number, user_id)
);

CREATE TABLE IF NOT EXISTS direct_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(100) NOT NULL,
    turn_number INT NOT NULL DEFAULT 1,
    user_id VARCHAR(100),
    model_id VARCHAR(100) NOT NULL,
    rating INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE IF NOT EXISTS elo_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL,
    elo_rating DOUBLE NOT NULL,
    total_battles INT DEFAULT 0,
    ci_lower DOUBLE,
    ci_upper DOUBLE,
    snapshot_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id),
    INDEX idx_model_time (model_id, snapshot_at)
);

CREATE TABLE IF NOT EXISTS pairwise_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_a_id VARCHAR(100) NOT NULL,
    model_b_id VARCHAR(100) NOT NULL,
    wins_a INT DEFAULT 0,
    wins_b INT DEFAULT 0,
    ties INT DEFAULT 0,
    total INT DEFAULT 0,
    UNIQUE KEY uniq_pair (model_a_id, model_b_id)
);

-- Seed 12 Arena models
INSERT IGNORE INTO models (id, name, provider, display_name) VALUES
    ('deepseek/deepseek-r1', 'DeepSeek R1', 'DeepSeek', 'DeepSeek R1'),
    ('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', 'Gemini 2.5 Flash'),
    ('google/gemini-3.1-pro-preview', 'Gemini 3.1 Pro', 'Google', 'Gemini 3.1 Pro'),
    ('meta-llama/llama-3-70b-instruct', 'Llama 3 70B', 'Meta', 'Llama 3 70B'),
    ('openai/gpt-4o-mini', 'GPT-4o Mini', 'OpenAI', 'GPT-4o Mini'),
    ('openai/gpt-5-mini', 'GPT-5 Mini', 'OpenAI', 'GPT-5 Mini'),
    ('openai/gpt-5.4', 'GPT-5.4', 'OpenAI', 'GPT-5.4'),
    ('qwen/qwen-vl-plus', 'Qwen VL Plus', 'Alibaba', 'Qwen VL Plus'),
    ('xai/grok-3-mini', 'Grok 3 Mini', 'xAI', 'Grok 3 Mini'),
    ('xai/grok-3-fast-latest', 'Grok 3 Fast', 'xAI', 'Grok 3 Fast'),
    ('anthropic/claude-sonnet-4-6', 'Claude Sonnet', 'Anthropic', 'Claude Sonnet'),
    ('mistral/mistral-large', 'Mistral Large', 'Mistral', 'Mistral Large');
