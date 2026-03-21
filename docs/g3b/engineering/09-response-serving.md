# G3B: Response Serving

Covers: P0-9 | Date: March 12, 2026 | Status: G3B Design Review
Depends on: Data Model (00), Vote System (06) | Visual ref: ../prototype/arena-prototype.html

## 1. What This Feature Does

Response serving delivers pre-computed AI responses to users across battle, SBS, and direct-rating modes. v1 uses pre-computed DB responses (no live inference). System randomly selects model pairs, serves multi-turn conversation trees, randomizes A/B positions, and matches user-typed prompts to closest seed prompt. Minimum 30 seed prompts across 6 Arena.ai categories.

## 2. User Flow

**Battle Mode (Random Pair):**
1. User opens Arena, selects "Battle" mode
2. Frontend requests: `GET /api/v1/arena/next-battle?category=coding`
3. Backend:
   - Picks random seed prompt from category
   - Selects 2 random models (not yet matched)
   - Randomizes position: coin flip → Model A or B shown first
   - Returns: `{promptId, responseA, responseB, modelA, modelB, turnNumber}`
4. User sees two responses side-by-side, votes

**SBS Mode (User-Selected Pair):**
1. User selects two specific models
2. Backend: `GET /api/v1/arena/responses?prompt={promptId}&models={modelA},{modelB}`
3. Returns pre-computed responses for that pair (exact or fuzzy-matched prompt)
4. User votes on pair

**Direct Mode (Single Model):**
1. User selects single model
2. Backend: `GET /api/v1/arena/response?prompt={promptId}&model={modelId}`
3. Returns single response for that model
4. User rates response (1–5 stars) with optional tags

**Multi-Turn (Follow-Up Conversation):**
1. On follow-up turn, system appends previous context
2. Pre-computed follow-up responses already stored (conversation tree structure)
3. Backend serves turn N response from same conversation branch
4. Seamless experience; no re-prompting

**Random Suggested Prompts (Welcome Screen):**
1. On load, system picks exactly 3 random prompts (no category filtering at P0)
2. Backend: `GET /api/v1/arena/suggested-prompts?count=3`
3. Returns randomized suggestions (prompt text only, no category chips); user can click to start battle with that prompt

## 3. Key Behaviors

**Prompt Matching:**
- Exact match → use that prompt + its responses
- No exact match → fuzzy string match (Levenshtein distance <10%)
- No fuzzy match → pick closest by category + length
- All matching logged for analytics

**Position Randomization:**
- Random coin flip: 50% chance A is shown left, B right
- Prevents position bias (users often pick left)
- Logged in vote record for statistical correction

**Model Pair Distribution:**
- Fair distribution: track each model pair's frequency
- Avoid showing same pair too often; rotate through all pairs
- Target: no pair shown >1.5× any other in first 100 battles per category

**Multi-Turn Structure:**
- Conversation tree: prompt → [response_model_A_turn1, response_model_B_turn1] → [follow-ups for turn 2]
- Same conversation ID links all turns (user cannot switch models mid-conversation)
- Follow-up responses pre-computed; lookup by conversation_id + turn_number

## 4. Seed Data Requirements

**Minimum 30 prompts at launch, covering 6 Arena.ai categories:**
- Hard Prompts (generic reasoning)
- Coding (programming tasks)
- Math (arithmetic, algebra, calculus)
- Data Analysis (SQL, analysis, visualization)
- Creative Writing (storytelling, poetry)
- Instruction Following (multi-step tasks)

**Occupational subcategories (optional):**
- Data Science
- Software Engineering
- Academic (K-12, higher-ed)
- Business/Finance
- Healthcare

**Data volume:**
- 12 models × 30 prompts = 360 base responses
- 2 models × 30 prompts × 3 follow-up turns = 180 multi-turn responses minimum
- Total minimum: 540 pre-computed responses

## 5. Acceptance Criteria

- [ ] All 30 seed prompts available at launch, across 6 categories
- [ ] Response pairs served in <500ms (P95 latency)
- [ ] No "response not found" errors for seed prompts
- [ ] Position randomization: A/B assignment truly random (50/50 over 100 requests)
- [ ] Prompt matching accuracy: exact match works for 100% of seed prompts
- [ ] Multi-turn conversations maintain continuity (same model responses across turns)
- [ ] Fair pair distribution: no model pair shown >1.5× any other in first 100 battles per category
- [ ] Random suggested prompts return different sets on each call (weighted shuffle)
- [ ] Vote record includes: promptId, responseIds, position (A/B), modelIds, turnNumber

## 6. Out of Scope

- Live inference (v1 pre-computed only)
- Response reranking or quality scoring
- Live API fallback
- Custom prompt creation by users
- Category-specific model weighting (all pairs equally likely)
