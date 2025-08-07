## Cronus plan – unique value for SCM newcomers

### Positioning
Build the Git client that teaches as it works: file‑first storytelling, guided workflows, safe experimentation.

### Differentiating pillars
- File‑first storytelling
- Guided SCM onramp (command preview + undo + explainers)
- Smart Commit Coach
- What‑if sandbox (virtual branches/worktrees)
- Visual mental models (graphs, hotspots, authorship)

## 2‑week MVP

### Week 1
- Guided Commit Onramp in `src/components/SmartCommitAssistant.tsx`
  - Add Guided toggle, Command Preview, anti‑pattern warnings (huge commits), Unstage All, Undo last commit
  - Show plain‑English explainers for stage/commit
- File Story tab in `src/views/EnhancedImmersiveView.tsx`
  - Render events: first commit, rename points, largest changes, top authors, churn score
  - Inline/side‑by‑side diff toggle
- AI Palette (v0)
  - 3 deterministic intents: create branch from commit; show commits that changed a function; compare file between dates
  - Preview “what this will do” and navigate/execute

### Week 2
- What‑if virtual branches
  - UI to create from any commit, diff vs base, discard safely
- Notes and snippets
  - Attach notes to commits; extract/save diff hunks as snippets with origin metadata
- Practice Mode (starter)
  - Create a temp repo with a simple checklist of tasks; show previewed commands at each step

## Backend additions (Rust/Tauri, `src-tauri/src/lib.rs`)
- `revert_last_commit(repo_path) -> Result<(), String>`
- `discard_file_changes(repo_path, file_path) -> Result<(), String>`
- `get_git_rename_history(file_path) -> Result<Vec<RenameEvent>, String>`
- `create_practice_repo(seed_name) -> Result<String, String>` and `cleanup_practice_repo(path) -> Result<(), String>`
- Ensure existing endpoints can return human‑readable command previews when applicable

## Frontend integrations (`src/utils/index.ts` and UI files)
- Wrap git actions with Preview → Confirm → Execute → Record inverse (for Undo Center)
- Story builder that composes events (first/rename/largest/ownership/hotspot) into a short narrative
- Add persistent local storage for notes/snippets

## Acceptance criteria
- Guided mode: every destructive action shows preview + confirm; one‑click undo available when safe
- Story view: ≥5 event types; loads under ~300ms on medium repos
- AI palette: ≥3 intents work end‑to‑end with clear previews
- Virtual branches: create, view diff vs base, discard without touching real history
- Notes: attach/list/persist locally

## Metrics
- Time‑to‑first‑commit in Guided mode
- % actions via palette
- Story view opens per file
- Undo usage rate post‑actions

## Out of scope (for MVP)
- Full PR workflows, remote auth, CI integrations
- Deep code review features

## Gaps & open questions
- Remote operations: auth, push/pull safety, branch protection interactions
- Large repo performance and caching strategy; pagination for graphs/history
- Accessibility (keyboard navigation, screen readers), internationalization
- Storage model for notes/snippets (local only vs repo‑linked), export/import
- AI privacy: API key management, offline mode, deterministic vs LLM fallback
- Stash workflows and a dedicated “Undo Center” UI beyond last commit
- Git LFS and large/binary file handling
- Monorepo awareness: component/folder‑level stories; workspace multi‑repo view