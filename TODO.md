## Cronus Roadmap / TODO

### High-impact next

- [ ] Hunk/line staging UI (stage/unstage by hunk and line)
  - [x] Backend: apply_index_patch (index patch apply/reverse)
  - [x] Backend: return unified diffs per-file (working vs HEAD, staged vs HEAD) segmented into hunks (zero context)
  - [ ] UI: per-hunk and per-line selection with Stage/Unstage
  - [ ] State: recompute staged/unstaged diffs incrementally
  - [ ] Safety: preview patch, revert-on-failure
- [ ] Complete remote workflow: auth (SSH/HTTPS), ahead/behind UI, set upstream, progress, force-with-lease toggle
- [ ] Branch CRUD: create/rename/delete/checkout, plus non-FF merge with 3-way conflict UI
- [ ] Interactive rebase UI (reorder, squash, fixup, reword, edit)
- [ ] Blame/annotate view with heatmap and jump-to-commit
- [ ] Stash management (create incl. untracked/patch, list, apply, pop, drop)
- [ ] Basic PR/MR creation from branch (open on provider) and linkouts

### Core operations

- [ ] Init repository
- [x] Worktree - smart on branch in worktree
- [ ] Clone repository (progress, auth)
- [x] Open local repository
- [x] Status view with file grouping
- [x] Stage/unstage at file level
- [ ] Stage/unstage at hunk/line level
- [x] Commit: create new commit
- [ ] Commit: amend, edit last message, co-authors
- [ ] Commit signing (GPG/SSH)
- [x] Diff views: working vs HEAD, staged vs HEAD
- [x] Diff: commit vs parent/any ref, inline and side-by-side toggle (branch comparison with worktrees)

### Branching and history

- [x] Commit history list
- [x] Graph view with basic lanes
- [ ] Graph: filters (author, date, branch), search, zoom
- [ ] Create/rename/delete branches
- [ ] Checkout branch (and create checkout)
- [ ] Rebase (non-interactive) with safety prompts
- [ ] Interactive rebase (reorder, squash, fixup, edit, reword)
- [ ] Merge (FF and non-FF) with preview and summary
- [x] Conflict detection
- [ ] Conflict resolution UI (3-way diff, per-hunk picks, inline markers)
- [ ] Cherry-pick, Revert
- [ ] Reset (soft/mixed/hard) with preview
- [ ] Tags: create/annotate/delete, tag pushes

### Remotes and sync

- [ ] Manage remotes (add/remove/rename, set upstream)
- [x] Fetch (basic)
- [x] Pull (merge or rebase toggle, basic)
- [x] Push (basic)
- [ ] Push: force-with-lease toggle in UI
- [ ] Auth: SSH (keys/agent), HTTPS (credential helper), OAuth (GitHub/GitLab/Bitbucket)
- [ ] Remote tracking with ahead/behind indicators, push-to-create
- [x] SyncBar UI (basic Fetch/Pull/Push)

### Collaboration integrations

- [ ] Open file/commit/branch on remote (deep links)
- [ ] Create PR/MR from current branch (basic form + open in browser)
- [ ] Show PR/MR status and checks (linkouts acceptable initially)
- [ ] Review helpers: copy patch, shareable links

### Workspace utilities

- [ ] Stash: create/list/apply/pop/drop (patch mode optional)
- [ ] Worktrees: create/switch/remove
- [ ] Submodules: add/update/init/sync, status
- [ ] Git LFS: track/untrack, lock/unlock, transfer progress

### File-level tooling

- [ ] Blame/annotate with hotspots and jump-to-commit
- [ ] Repo-wide search (ripgrep) with filters and quick open
- [ ] .gitignore manager with suggestions
- [x] Open in external editor/terminal (basic opener)

### Safety and recovery

- [ ] Reflog viewer with quick restore
- [ ] Auto-stash before rebase/pull (prompted)
- [ ] Previews for destructive ops; confirm dialogs; undo last action where possible
- [ ] Large file and secret detection warnings

### Configuration

- [ ] Per-repo git config editor (name/email/default branch/pull.rebase/autocrlf)
- [ ] Signing setup (GPG/SSH)
- [ ] Diff/merge tool preferences

### UX polish

- [x] Light/dark theming with improved contrast in lists
- [ ] Apply WCAG contrast audit app-wide
- [ ] Virtualized lists for large repos; background indexing
- [ ] Progress UI for long ops (clone/fetch/push)
- [ ] Comprehensive keyboard shortcuts and command palette
- [x] Notifications with actionable toasts (basic)

### Packaging / ops

- [ ] Cross-platform builds (macOS/Windows/Linux) with code signing
- [ ] Robust error surfaces with actionable fixes (e.g., detached HEAD hints)
- [ ] Optional telemetry/diagnostics with opt-in

### Current capabilities (for reference)

- [x] Open repository; list files (MRU tree and search)
- [x] File diffs (working vs HEAD, staged vs HEAD)
- [x] Stage/unstage files; create commits; commit suggestions
- [x] View history and basic graph
- [x] Conflict detection (and write resolved content)
- [x] Branch listing; recent commits section
- [x] Repository analytics (basic)
