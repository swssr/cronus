📘 Cronus – Git Time Machine

Make code history explorable, visual, and actionable—without needing to know Git. File‑first storytelling, guided workflows, and safe what‑if exploration.

### Tagline
"Time travel for your code."

### Unique value proposition
Understand and change history without Git expertise: file‑first narratives, guided and undoable actions, and an AI command palette—plus virtual branches for safe experimentation.

### Overview
Cronus is a cross‑platform Git client that centers the file and the story around it. Instead of starting from branch logs, Cronus presents timelines, narratives, and visual mental models that help developers orient quickly, make confident changes, and learn SCM as they go.

### Target audience
- Learners and solo developers (primary)
- Teams onboarding to Git (next)
- Non‑engineers who need to understand file evolution

### Core experiences
1) Guided mode everywhere
- Command Preview: show exactly what will run and why
- Undo Center: one‑click undo for recent actions when safe
- Concept overlays: plain‑English explainers for stage/commit/branch/revert

2) File Story view
- Narrative per file: first commit, rename points, large refactors, ownership shifts, hotspots
- Interactive timeline with rich inline/side‑by‑side diffs

3) AI Command Palette
- Deterministic intents (v0): create branch from commit, show commits that changed a function, compare file between dates
- Clear “what this will do” summaries before execution

4) What‑if virtual branches
- Create disposable “ghost branches” or worktrees from any commit, compare against base, discard safely

5) Version bookmarks and notes
- Attach notes/tags to commits or file versions (e.g., “refactor start”, “bug introduced”)

6) Graph and analytics
- Git graph visualization, churn hotspots, authorship patterns, branch activity

7) Practice mode
- A safe sandbox repo with guided tasks that teaches Git by doing, inside Cronus

### Search & navigation
- Fuzzy search by file, commit message, author, date; jump to any SHA or time window

### Tech stack
- Frontend: React + Tailwind
- Backend: Rust (Tauri)
- Cross‑platform: macOS (primary), Windows (supported), Linux (later)
- AI: Deterministic mapping with optional LLM
- Data: Git CLI; optional local cache

### Near‑term roadmap (MVP)
- Guided Commit Onramp in `SmartCommitAssistant`: command preview, undo last commit, unstage all, anti‑pattern warnings
- File Story tab in `EnhancedImmersiveView`: event summary (first commit, renames, largest changes, top authors, churn score)
- AI Palette v0: 3 deterministic intents with preview and navigation
- What‑if virtual branches: create, compare vs base, discard (no real history mutations)
- Notes/snippets: attach notes to commits; save diff hunks as snippets with origin metadata

### Success metrics
- Time‑to‑first‑commit in Guided mode
- % actions executed via palette
- Story view engagement per file
- Undo usage rate (safety net)

### Philosophy
If Apple designed a Git client, it would feel like Cronus: less Git, more storytelling. Visual‑first, jargon‑light, calm by default.
